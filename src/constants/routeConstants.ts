/**
 * Every HTTP route in one place. Controllers reference these instead of inline
 * strings, so the full API surface is readable here and a path can't drift.
 * `main.root` is the global prefix, applied in main.ts.
 */
export const apiControllerPath = {
  main: {
    root: 'api/v1',
  },

  auth: {
    root: 'auth',
    login: 'login',
    me: 'me',
    updateProfile: 'profile',
    changePassword: 'change-password',
    forgotPassword: 'forgot-password',
    verifyOtp: 'verify-otp',
    resetPassword: 'reset-password',
  },

  projects: {
    root: 'projects',
    getList: '',
    // Bulk board fetch: index + full details in one request (declared before
    // the ':id' route so the literal 'board' segment matches first).
    board: 'board',
    // Lean, server-computed payload for the dashboard (no per-task data).
    dashboard: 'dashboard',
    create: '',
    getById: ':id',
    updateById: ':id',
    deleteById: ':id',
  },

  tickets: {
    root: 'tickets',
    getList: '',
    create: '',
    updateById: ':id',
    deleteById: ':id',
  },

  miscTasks: {
    root: 'misc-tasks',
    getList: '',
    create: '',
    updateById: ':id',
    updateStatusById: ':id/status',
    deleteById: ':id',
  },

  projectTemplates: {
    root: 'project-templates',
    // Template groups (the named templates themselves).
    list: '',
    create: '',
    // Phase/task mutations — declared before the ':templateId' param routes so
    // literal 'phases'/'tasks' segments match first.
    addPhase: ':templateId/phases',
    updatePhase: 'phases/:phaseId',
    deletePhase: 'phases/:phaseId',
    addTask: 'phases/:phaseId/tasks',
    reorderTasks: 'phases/:phaseId/tasks/reorder',
    updateTask: 'tasks/:taskId',
    deleteTask: 'tasks/:taskId',
    // A single template's phases + rename/delete of the template.
    getOne: ':templateId',
    updateTemplate: ':templateId',
    deleteTemplate: ':templateId',
  },

  employees: {
    root: 'employees',
    getList: '',
    create: '',
    updateById: ':id',
    deleteById: ':id',
  },

  teamPerformance: {
    root: 'team-performance',
    getList: '',
  },

  dashboard: {
    root: 'dashboard-summary',
    getSummary: '',
  },

  notifications: {
    root: 'notifications',
    getList: '',
    markRead: 'mark-read',
  },

  scrum: {
    root: 'scrum',
    getByDate: '',
    save: '',
  },
} as const;
