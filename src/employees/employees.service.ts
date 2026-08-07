import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Employee } from "../entities/employee.entity";
import { Team } from "../entities/team.entity";

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
  ) {}

  /**
   * Shaped to match the frontend's Team/Employee types exactly (nested
   * `members` under each team, and a flat `team` display-name string on
   * each employee) — a drop-in replacement for the static org directory
   * the frontend used to import from lib/data.ts, not just the raw
   * entity columns.
   */
  async findAll() {
    const [teamRows, employeeRows] = await Promise.all([
      this.teamRepo.find({ order: { id: "ASC" } }),
      this.employeeRepo.find({ order: { id: "ASC" } }),
    ]);

    const teamNameById = new Map(teamRows.map(t => [t.id, t.name]));
    const employees = employeeRows.map(e => ({
      id: e.id, name: e.name, role: e.role, teamId: e.teamId, team: teamNameById.get(e.teamId) || "",
    }));
    const teams = teamRows.map(t => ({
      id: t.id, name: t.name,
      members: employeeRows.filter(e => e.teamId === t.id).map(e => ({ id: e.id, name: e.name, role: e.role })),
    }));

    return { teams, employees };
  }
}
