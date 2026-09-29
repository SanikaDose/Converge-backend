import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ScrumEntry } from "../entities/scrum-entry.entity";
import { newId } from "../utils/template";
import { todayISO } from "../utils/date-utils";
import type { SaveScrumDto } from "./dto/save-scrum.dto";
import type { ScrumEntryInterface } from "./interface/scrum.interface";

@Injectable()
export class ScrumService {
  constructor(
    @InjectRepository(ScrumEntry) private readonly repo: Repository<ScrumEntry>,
  ) {}

  /** Every saved update for one day (the page merges these with the directory). */
  findByDate(date: string): Promise<ScrumEntryInterface[]> {
    return this.repo.find({ where: { date }, order: { updatedAt: "DESC" } });
  }

  /**
   * Upsert every row sent for the day. Re-saving edits in place (matched on the
   * unique employee+date pair) rather than creating duplicates. Empty rows —
   * no text and the default "Office" mode — are treated as "not filled in" and
   * skipped, so the page's "X/Y updated" count stays honest.
   */
  async save(dto: SaveScrumDto, user: { sub: string; appRole: string }): Promise<ScrumEntryInterface[]> {
    // Only the current day is editable — no back-dating a previous standup.
    // (The team is IST, ahead of UTC, so local "today" is never before UTC
    //  today; this reliably blocks earlier dates without a false positive.)
    if (dto.date < todayISO()) {
      throw new ForbiddenException("Previous days can't be edited.");
    }

    // Admins/leads may edit anyone's row; everyone else only their own.
    const isManager = user.appRole === "Admin" || user.appRole === "Lead";
    if (!isManager && dto.entries.some((e) => e.employeeId !== user.sub)) {
      throw new ForbiddenException("You can only edit your own scrum update.");
    }

    const now = new Date().toISOString();
    const existing = await this.repo.find({ where: { date: dto.date } });
    const byEmployee = new Map(existing.map(e => [e.employeeId, e]));

    for (const input of dto.entries) {
      const workPerformed = (input.workPerformed ?? "").trim();
      const references = input.references ?? [];
      const row = byEmployee.get(input.employeeId);

      // Nothing meaningful entered and nothing stored yet — skip it.
      if (!row && !workPerformed && input.workMode === "Office" && references.length === 0) continue;

      if (row) {
        row.workPerformed = workPerformed;
        row.workMode = input.workMode;
        row.references = references;
        row.updatedAt = now;
        await this.repo.save(row);
      } else {
        await this.repo.save(this.repo.create({
          id: newId(),
          employeeId: input.employeeId,
          date: dto.date,
          workPerformed,
          workMode: input.workMode,
          references,
          updatedAt: now,
        }));
      }
    }

    return this.findByDate(dto.date);
  }
}
