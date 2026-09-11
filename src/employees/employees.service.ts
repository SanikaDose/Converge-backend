import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import { Employee } from "../entities/employee.entity";
import { Team } from "../entities/team.entity";
import { DEFAULT_PASSWORD, appRoleFor, employeeCodeFor } from "../utils/credentials";
import type { CreateEmployeeDto } from "./dto/create-employee.dto";
import type { UpdateEmployeeDto } from "./dto/update-employee.dto";
import type { EmployeeInterface, OrgDirectoryInterface } from "./interface/employee.interface";

/** Employees who don't take part in the daily scrum out of the box. */
const SCRUM_DISABLED_TEAMS = new Set(["sales"]);
const SCRUM_DISABLED_IDS = new Set(["nikhil-warokar"]);

@Injectable()
export class EmployeesService implements OnModuleInit {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
  ) {}

  /**
   * One-time backfill of `scrum_enabled`: everyone defaults IN, except the sales
   * team and a few named exceptions. Only touches rows still NULL (never
   * configured), so an admin's later toggle is never reverted. Runs on every
   * boot regardless of SEED_ON_BOOT — it's essential directory config, and is a
   * no-op once every row has a value. Guarded so a missing column (migration
   * not yet run on a hosted DB) can't crash startup.
   */
  async onModuleInit(): Promise<void> {
    try {
      const rows = await this.employeeRepo.find({ where: { scrumEnabled: null as unknown as boolean } });
      if (!rows.length) return;
      for (const e of rows) {
        e.scrumEnabled = !(SCRUM_DISABLED_TEAMS.has(e.teamId) || SCRUM_DISABLED_IDS.has(e.id));
      }
      await this.employeeRepo.save(rows);
      this.logger.log(`Scrum defaults set for ${rows.length} employee(s).`);
    } catch (err) {
      this.logger.warn(`Skipped scrum-default backfill: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Shaped to match the frontend's Team/Employee types (nested `members` under
   * each team, flat `team` name on each employee). passwordHash is never
   * selected, so it can't leak. Now also carries status + scrumEnabled so the
   * management screen and the scrum board can read them.
   */
  async findAll(): Promise<OrgDirectoryInterface> {
    const [teamRows, employeeRows] = await Promise.all([
      this.teamRepo.find({ order: { id: "ASC" } }),
      this.employeeRepo.find({
        order: { id: "ASC" },
        select: { id: true, name: true, role: true, teamId: true, status: true, scrumEnabled: true, email: true, phoneNumber: true },
      }),
    ]);

    const teamNameById = new Map(teamRows.map(t => [t.id, t.name]));
    const employees: EmployeeInterface[] = employeeRows.map(e => ({
      id: e.id, name: e.name, role: e.role, teamId: e.teamId, team: teamNameById.get(e.teamId) || "",
      status: e.status ?? "active",
      scrumEnabled: e.scrumEnabled ?? true,
      email: e.email ?? null, phoneNumber: e.phoneNumber ?? null,
    }));
    const teams = teamRows.map(t => ({
      id: t.id, name: t.name,
      members: employeeRows.filter(e => e.teamId === t.id).map(e => ({ id: e.id, name: e.name, role: e.role })),
    }));

    return { teams, employees };
  }

  /** A URL-safe id from the name, made unique against existing rows. */
  private async uniqueId(name: string): Promise<string> {
    const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "employee";
    let candidate = base;
    let n = 2;
    while (await this.employeeRepo.findOneBy({ id: candidate })) candidate = `${base}-${n++}`;
    return candidate;
  }

  /** A unique employee code (initials + sequence), bumping the number on clash. */
  private async uniqueCode(name: string): Promise<string> {
    const count = await this.employeeRepo.count();
    let seq = count + 1;
    let code = employeeCodeFor(name, seq);
    while (await this.employeeRepo.findOneBy({ employeeCode: code })) code = employeeCodeFor(name, ++seq);
    return code;
  }

  async create(dto: CreateEmployeeDto): Promise<EmployeeInterface> {
    const team = await this.teamRepo.findOneBy({ id: dto.teamId });
    if (!team) throw new NotFoundException("Team not found.");

    const role = dto.role ?? "User";
    const id = await this.uniqueId(dto.name);
    const employee = this.employeeRepo.create({
      id,
      name: dto.name.trim(),
      role,
      appRole: appRoleFor(role),
      employeeCode: await this.uniqueCode(dto.name),
      email: dto.email ?? null,
      phoneNumber: dto.phoneNumber ?? null,
      // New joiners can sign in with the shared default password.
      passwordHash: await bcrypt.hash(DEFAULT_PASSWORD, 10),
      status: "active",
      scrumEnabled: dto.scrumEnabled ?? true,
      teamId: dto.teamId,
    });
    const saved = await this.employeeRepo.save(employee);
    return this.toInterface(saved, team.name);
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<EmployeeInterface> {
    const employee = await this.employeeRepo.findOneBy({ id });
    if (!employee) throw new NotFoundException("Employee not found.");

    let teamName: string | undefined;
    if (dto.teamId !== undefined) {
      const team = await this.teamRepo.findOneBy({ id: dto.teamId });
      if (!team) throw new NotFoundException("Team not found.");
      employee.teamId = dto.teamId;
      teamName = team.name;
    }
    if (dto.name !== undefined) employee.name = dto.name.trim();
    if (dto.role !== undefined) { employee.role = dto.role; employee.appRole = appRoleFor(dto.role); }
    if (dto.email !== undefined) employee.email = dto.email || null;
    if (dto.phoneNumber !== undefined) employee.phoneNumber = dto.phoneNumber || null;
    if (dto.status !== undefined) employee.status = dto.status;
    if (dto.scrumEnabled !== undefined) employee.scrumEnabled = dto.scrumEnabled;

    const saved = await this.employeeRepo.save(employee);
    const name = teamName ?? (await this.teamRepo.findOneBy({ id: saved.teamId }))?.name ?? "";
    return this.toInterface(saved, name);
  }

  async remove(id: string, requesterId: string, password: string): Promise<{ id: string }> {
    const employee = await this.employeeRepo.findOneBy({ id });
    if (!employee) throw new NotFoundException("Employee not found.");

    // Re-authenticate the admin before a destructive delete. 400 (not 401) for a
    // wrong password: the caller IS authenticated, and a 401 would trip the
    // frontend's global sign-out — same rule as changePassword.
    const requester = await this.employeeRepo.findOne({ where: { id: requesterId }, select: { id: true, passwordHash: true } });
    const ok = !!requester?.passwordHash && await bcrypt.compare(password, requester.passwordHash);
    if (!ok) throw new BadRequestException("Incorrect password.");

    try {
      await this.employeeRepo.delete({ id });
    } catch {
      // A row still referenced by a restricted FK can't be hard-deleted —
      // marking them inactive is the safe alternative.
      throw new ConflictException("This employee is still referenced elsewhere. Set them inactive instead of deleting.");
    }
    return { id };
  }

  private toInterface(e: Employee, teamName: string): EmployeeInterface {
    return {
      id: e.id, name: e.name, role: e.role, teamId: e.teamId, team: teamName,
      status: e.status ?? "active", scrumEnabled: e.scrumEnabled ?? true,
      email: e.email ?? null, phoneNumber: e.phoneNumber ?? null,
    };
  }
}
