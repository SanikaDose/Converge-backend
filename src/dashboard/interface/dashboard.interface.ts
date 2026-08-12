/**
 * GET /dashboard-summary — the frozen baseline the UI diffs live counts
 * against for its "vs last month" captions. Captured once and persisted,
 * so the trends survive a restart instead of resetting.
 */
export interface DashboardBaselineInterface {
  activeProjects: number;
  completedProjects: number;
  avgCompletionPct: number;
  delayedTasks: number;
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  ticketResolutionPct: number;
  capturedAt: string;
}
