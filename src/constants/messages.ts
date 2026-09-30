/**
 * User-facing response text in one place, so a message has one wording and is
 * a single edit to change or translate.
 */
export const projectMessages = {
  notFound: 'Project not found.',
  duplicateName: 'A project with this name already exists.',
  adminOnly: 'Only an administrator can create or modify a project.',
  invalidDate: 'startDate and endDate must be valid ISO dates (YYYY-MM-DD).',
  endBeforeStart: 'endDate cannot be before startDate.',
  charterRequired: 'A project charter is required for Solution projects.',
};

export const ticketMessages = {
  notFound: 'Ticket not found.',
  projectNotFound: 'Project not found.',
  closedFinal: 'A closed ticket cannot be reopened.',
  reopenedFinal: 'A reopened ticket can only be closed.',
  adminOnly: 'Only an administrator or lead can create or modify a ticket.',
};

export const templateMessages = {
  phaseNotFound: 'Phase template not found.',
  taskNotFound: 'Task template not found.',
  templateNotFound: 'Project template not found.',
  adminOnly: 'Only an administrator can edit the project template.',
  reorderMismatch: 'The reorder list must contain exactly this phase\'s tasks.',
  duplicateTemplateName: 'A template with this name already exists.',
  cannotDeleteDefault: 'The default template can\'t be deleted.',
  cannotDeleteLast: 'At least one template must remain.',
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
  // Deliberately generic — the same message whether the code is wrong, expired,
  // or was never issued, so it can't be used to probe accounts.
  otpInvalid: 'The code is invalid or has expired. Please request a new one.',
  otpTooManyAttempts: 'Too many incorrect attempts. Please request a new code.',
  resetTokenInvalid: 'Your reset session has expired. Please start again.',
};
