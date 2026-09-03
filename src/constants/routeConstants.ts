/**
 * Every HTTP route in one place, mirroring the Scout API Gateway's
 * `apiControllerPath` convention.
 *
 * Controllers reference these instead of inline string literals, so the
 * full surface of the API is readable from a single file and a path can't
 * drift between the controller that serves it and anything that documents
 * it. `main.root` is applied globally in main.ts, not per controller.
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
  },

  projects: {
    root: 'projects',
    getList: '',
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
  },

  miscTasks: {
    root: 'misc-tasks',
    getList: '',
    create: '',
    updateById: ':id',
    deleteById: ':id',
  },

  projectTemplates: {
    root: 'project-templates',
    get: '',
    addTask: 'phases/:phaseId/tasks',
    reorderTasks: 'phases/:phaseId/tasks/reorder',
    updateTask: 'tasks/:taskId',
    deleteTask: 'tasks/:taskId',
  },

  employees: {
    root: 'employees',
    getList: '',
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
  },
} as const;
