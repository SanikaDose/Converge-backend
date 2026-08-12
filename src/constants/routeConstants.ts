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
} as const;
