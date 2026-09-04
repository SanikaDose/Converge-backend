import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { Employee } from "../entities/employee.entity";
import { authMessages } from "../constants/messages";
import { Config } from "../config/config";
import { EmailService } from "../notifications/email/email.service";
import type { AuthedUserInterface, JwtPayload, LoginResponseInterface } from "./interface/auth.interface";
import type { LoginDto } from "./dto/login.dto";
import type { UpdateProfileDto } from "./dto/update-profile.dto";
import type { ChangePasswordDto } from "./dto/change-password.dto";
import type { ForgotPasswordDto } from "./dto/forgot-password.dto";
import type { VerifyOtpDto } from "./dto/verify-otp.dto";
import type { ResetPasswordDto } from "./dto/reset-password.dto";

/** Forgot-password OTP policy. */
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
/** Payload signed after a successful OTP verify — scoped so it can only reset. */
interface ResetTokenPayload { sub: string; purpose: "pwd_reset"; }

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
    private readonly emailService: EmailService,
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

  /**
   * Step 1 of forgot-password: email a 6-digit OTP. Always resolves the same
   * way whether or not the email exists — never reveal which addresses are
   * real. The code is stored bcrypt-hashed with a 10-minute expiry.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ success: true }> {
    const email = dto.email.trim().toLowerCase();
    const employee = await this.employeeRepo
      .createQueryBuilder("employee")
      .where("LOWER(employee.email) = :email", { email })
      .getOne();

    if (employee && employee.email) {
      const otp = String(randomInt(0, 1_000_000)).padStart(6, "0");
      employee.resetOtpHash = await bcrypt.hash(otp, 10);
      employee.resetOtpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
      employee.resetOtpAttempts = 0;
      await this.employeeRepo.save(employee);
      try {
        await this.emailService.sendPasswordResetOtp({ to: employee.email, name: employee.name, otp, minutes: OTP_TTL_MINUTES });
      } catch {
        // Swallow — surfacing a send failure here would leak that the email exists.
      }
    }
    return { success: true };
  }

  /** Load the employee and validate its live OTP against `otp`. Increments the
   * attempt counter and clears the OTP when exhausted. Throws on any failure. */
  private async assertOtp(email: string, otp: string): Promise<Employee> {
    const employee = await this.employeeRepo
      .createQueryBuilder("employee")
      .where("LOWER(employee.email) = :email", { email: email.trim().toLowerCase() })
      .getOne();

    const valid = employee?.resetOtpHash
      && employee.resetOtpExpiresAt
      && employee.resetOtpExpiresAt.getTime() > Date.now();
    if (!valid) throw new BadRequestException(authMessages.otpInvalid);

    if (employee!.resetOtpAttempts >= OTP_MAX_ATTEMPTS) {
      await this.clearOtp(employee!);
      throw new BadRequestException(authMessages.otpTooManyAttempts);
    }

    const ok = await bcrypt.compare(otp, employee!.resetOtpHash!);
    if (!ok) {
      employee!.resetOtpAttempts += 1;
      await this.employeeRepo.save(employee!);
      throw new BadRequestException(authMessages.otpInvalid);
    }
    return employee!;
  }

  private async clearOtp(employee: Employee): Promise<void> {
    employee.resetOtpHash = null;
    employee.resetOtpExpiresAt = null;
    employee.resetOtpAttempts = 0;
    await this.employeeRepo.save(employee);
  }

  /**
   * Step 2: verify the OTP and, on success, hand back a short-lived,
   * purpose-scoped reset token. The OTP is consumed here (single use); the
   * token is what authorizes the actual password change in step 3.
   */
  async verifyOtp(dto: VerifyOtpDto): Promise<{ resetToken: string }> {
    const employee = await this.assertOtp(dto.email, dto.otp);
    await this.clearOtp(employee);
    const payload: ResetTokenPayload = { sub: employee.id, purpose: "pwd_reset" };
    const resetToken = await this.jwtService.signAsync(payload, { expiresIn: `${OTP_TTL_MINUTES}m` });
    return { resetToken };
  }

  /** Step 3: set the new password using the reset token from step 2. */
  async resetPassword(dto: ResetPasswordDto): Promise<{ success: true }> {
    let payload: ResetTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<ResetTokenPayload>(dto.resetToken);
    } catch {
      throw new BadRequestException(authMessages.resetTokenInvalid);
    }
    if (payload.purpose !== "pwd_reset") throw new BadRequestException(authMessages.resetTokenInvalid);

    const employee = await this.employeeRepo.findOneBy({ id: payload.sub });
    if (!employee) throw new NotFoundException(authMessages.accountNotFound);

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
