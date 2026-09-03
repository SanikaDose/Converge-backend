import type { AppRole, MiscTaskStatus, OrgRole, PhaseDiscipline, Priority, ProjectType, TaskStatus, TicketStatus } from '../utils/types';

/**
 * The allowed values for every domain union, as runtime arrays.
 *
 * These exist because `class-validator`'s `@IsIn()` needs a real array —
 * a TypeScript union is erased at compile time. They were previously
 * re-declared inside each DTO (PRIORITIES appeared in both ticket DTOs,
 * so a new priority would have had to be added in two places and could
 * silently disagree); centralising them makes the type in utils/types.ts
 * and the validator that guards it impossible to drift apart.
 *
 * Deliberately `const` arrays rather than TypeScript `enum`s: the values
 * are shared verbatim with the frontend as string literals, and a real
 * enum would introduce a second representation to keep in sync.
 */
export const PROJECT_TYPES: ProjectType[] = ['Product', 'Solution'];

/** Discipline-specific phases — a project is created with any subset of these
 * (plus the common phases). An empty subset means "all". */
export const PHASE_DISCIPLINES: PhaseDiscipline[] = ['Software', 'Vision', 'Automation'];

/** Financial years selectable when creating a project (Apr–Mar). */
export const FINANCIAL_YEARS: string[] = ['FY26-27', 'FY25-26', 'FY24-25'];

export const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Critical'];

export const TICKET_STATUSES: TicketStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed', 'Reopened'];

export const MISC_TASK_STATUSES: MiscTaskStatus[] = ['To Do', 'In Progress', 'On Hold', 'Completed'];

export const TASK_STATUSES: TaskStatus[] = ['Not Started', 'In Progress', 'Pending Approval', 'Delayed', 'Blocked', 'Completed'];

/** Directory role and access role are 1:1 — see utils/credentials.ts. */
export const ORG_ROLES: OrgRole[] = ['Admin', 'User'];

export const APP_ROLES: AppRole[] = ['Admin', 'User'];
