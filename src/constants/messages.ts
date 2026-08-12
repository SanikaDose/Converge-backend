/**
 * User-facing response text, mirroring Scout's `constants/messages.ts`.
 *
 * "Project not found." was previously repeated at three call sites in
 * projects.service alone — one place means one wording, and changing it
 * (or translating it later) is a single edit.
 */
export const projectMessages = {
  notFound: 'Project not found.',
};

export const ticketMessages = {
  notFound: 'Ticket not found.',
  projectNotFound: 'Project not found.',
};

export const authMessages = {
  /**
   * Deliberately identical for "no such code" and "wrong password" — a
   * distinct message would let a caller enumerate valid employee codes.
   * See auth.service.ts, which also compares against a dummy hash so the
   * response timing doesn't leak the same thing.
   */
  invalidCredentials: 'Invalid employee ID or password.',
};
