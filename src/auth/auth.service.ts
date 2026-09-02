import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import { Employee } from "../entities/employee.entity";
import { authMessages } from "../constants/messages";
import { Config } from "../config/config";
import type { AuthedUserInterface, JwtPayload, LoginResponseInterface } from "./interface/auth.interface";
import type { LoginDto } from "./dto/login.dto";
import type { UpdateProfileDto } from "./dto/update-profile.dto";
import type { ChangePasswordDto } from "./dto/change-password.dto";

/**
 * A bcrypt hash of a throwaway value, compared against when no employee
 * matches so a bad employee code costs the same wall-clock time as a bad
 * password — otherwise the response time alone reveals which codes exist.
 */
const DUMMY_HASH = bcrypt.hashSync("__no_such_account__", 10);

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseInterface> {
    // Login is by email now. Match case-insensitively so "Sanika@…" == the
    // seeded lowercase address; the lookup can't be a plain findOne because
    // stored casing isn't guaranteed.
    const email = dto.email.trim().toLowerCase();
    const employee = await this.employeeRepo
      .createQueryBuilder("employee")
      .leftJoinAndSelect("employee.team", "team")
      .where("LOWER(employee.email) = :email", { email })
      .getOne();

    // Always run a compare, even with no match — see DUMMY_HASH above.
    const hash = employee?.passwordHash ?? DUMMY_HASH;
    const ok = await bcrypt.compare(dto.password, hash);

    // One generic message for both failure modes: telling the caller which
    // half was wrong would let them enumerate valid accounts.
    if (!employee || !employee.passwordHash || !ok) {
      throw new UnauthorizedException(authMessages.invalidCredentials);
    }

    const profile = toAuthedUser(employee);
    return { ...profile, accessToken: await this.signToken(employee) };
  }

  /**
   * Re-reads the signed-in employee from the database rather than trusting
   * the token's contents. The token proves *who* is calling; their name,
   * role, and team may have changed since it was issued.
   */
  async getProfile(userId: string): Promise<AuthedUserInterface> {
    const employee = await this.employeeRepo.findOne({
      where: { id: userId },
      relations: { team: true },
    });
    if (!employee) throw new NotFoundException(authMessages.accountNotFound);
    return toAuthedUser(employee);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<AuthedUserInterface> {
    const employee = await this.employeeRepo.findOne({
      where: { id: userId },
      relations: { team: true },
    });
    if (!employee) throw new NotFoundException(authMessages.accountNotFound);

    employee.name = dto.name.trim();
    await this.employeeRepo.save(employee);
    return toAuthedUser(employee);
  }

  /**
   * Requires the current password even though the caller already holds a
   * valid token — a token left behind on a shared machine shouldn't be
   * enough to lock the real owner out of their account.
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ success: true }> {
    const employee = await this.employeeRepo.findOneBy({ id: userId });
    if (!employee) throw new NotFoundException(authMessages.accountNotFound);

    // Deliberately 400, not 401. The caller IS authenticated here — their
    // token was accepted by the guard — so what failed is the body, not the
    // session. Returning 401 makes the status ambiguous between "wrong
    // password" and "your token expired", and the frontend has to treat a
    // 401 as a dead session and sign the user out; a mistyped current
    // password would eject them from the app instead of showing an error.
    const ok = await bcrypt.compare(dto.currentPassword, employee.passwordHash ?? DUMMY_HASH);
    if (!employee.passwordHash || !ok) {
      throw new BadRequestException(authMessages.currentPasswordWrong);
    }
    if (await bcrypt.compare(dto.newPassword, employee.passwordHash)) {
      throw new BadRequestException(authMessages.samePassword);
    }

    employee.passwordHash = await bcrypt.hash(dto.newPassword, Config.BCRYPT_SALT_ROUNDS);
    await this.employeeRepo.save(employee);
    return { success: true };
  }

  /** Identity only — never the password hash, name, or anything mutable. */
  private signToken(employee: Employee): Promise<string> {
    const payload: JwtPayload = {
      sub: employee.id,
      employeeCode: employee.employeeCode!,
      appRole: employee.appRole ?? "User",
    };
    return this.jwtService.signAsync(payload);
  }
}

function toAuthedUser(employee: Employee): AuthedUserInterface {
  return {
    id: employee.id,
    name: employee.name,
    employeeCode: employee.employeeCode!,
    email: employee.email ?? "",
    role: employee.role,
    appRole: employee.appRole ?? "User",
    teamId: employee.teamId,
    team: employee.team?.name ?? "",
  };
}
