import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import { Employee } from "../entities/employee.entity";
import { authMessages } from "../constants/messages";
import type { AppRole, OrgRole } from "../utils/types";
import type { LoginDto } from "./dto/login.dto";

/**
 * A bcrypt hash of a throwaway value, compared against when no employee
 * matches so a bad employee code costs the same wall-clock time as a bad
 * password — otherwise the response time alone reveals which codes exist.
 */
const DUMMY_HASH = bcrypt.hashSync("__no_such_account__", 10);

export interface AuthedUser {
  id: string;
  name: string;
  employeeCode: string;
  /** Org job title. */
  role: OrgRole;
  /** Application access role. */
  appRole: AppRole;
  teamId: string;
  team: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
  ) {}

  async login(dto: LoginDto): Promise<AuthedUser> {
    const code = dto.employeeCode.trim().toUpperCase();
    const employee = await this.employeeRepo.findOne({
      where: { employeeCode: code },
      relations: { team: true },
    });

    // Always run a compare, even with no match — see DUMMY_HASH above.
    const hash = employee?.passwordHash ?? DUMMY_HASH;
    const ok = await bcrypt.compare(dto.password, hash);

    // One generic message for both failure modes: telling the caller which
    // half was wrong would let them enumerate valid employee codes.
    if (!employee || !employee.passwordHash || !ok) {
      throw new UnauthorizedException(authMessages.invalidCredentials);
    }

    return {
      id: employee.id,
      name: employee.name,
      employeeCode: employee.employeeCode!,
      role: employee.role,
      appRole: employee.appRole ?? "User",
      teamId: employee.teamId,
      team: employee.team?.name ?? "",
    };
  }
}
