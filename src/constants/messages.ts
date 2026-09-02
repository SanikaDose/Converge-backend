/**
 * User-facing response text, mirroring Scout's `constants/messages.ts`.
 *
 * "Project not found." was previously repeated at three call sites in
 * projects.service alone — one place means one wording, and changing it
 * (or translating it later) is a single edit.
 */
export const projectMessages = {
  notFound: 'Project not found.',
  duplicateName: 'A project with this name already exists.',
};

export const ticketMessages = {
  notFound: 'Ticket not found.',
  projectNotFound: 'Project not found.',
  closedFinal: 'A closed ticket cannot be reopened.',
};

export const templateMessages = {
  phaseNotFound: 'Phase template not found.',
  taskNotFound: 'Task template not found.',
  adminOnly: 'Only an administrator can edit the project template.',
  reorderMismatch: 'The reorder list must contain exactly this phase\'s tasks.',
};

export const authMessages = {
  /**
   * Deliberately identical for "no such code" and "wrong password" — a
   * distinct message would let a caller enumerate valid employee codes.
   * See auth.service.ts, which also compares against a dummy hash so the
   * response timing doesn't leak the same thing.
   */
  invalidCredentials: 'Invalid email or password.',
  missingToken: 'Authentication required.',
  invalidToken: 'Session expired. Please sign in again.',
  currentPasswordWrong: 'Your current password is incorrect.',
  samePassword: 'The new password must be different from your current one.',
  accountNotFound: 'Account no longer exists.',
};
