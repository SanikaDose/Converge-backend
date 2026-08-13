# Converge Backend

NestJS + TypeORM + PostgreSQL API for the Converge Projects frontend
(`../converge_frontend`). Replaces that app's original in-memory mock
data layer with real persistence, while keeping the exact same response
shapes the frontend already expects — no frontend business-logic changes
were needed beyond pointing `lib/api.ts` at this server.

## Run it

```bash
npm install
npm run start:dev
```

Listens on `http://localhost:4000` (see `.env`). On first boot, if the
`projects` table is empty, it automatically seeds:

- The org directory (3 teams, 14 employees) — same ids as the frontend's
  own static `lib/data.ts` directory, so assignments line up.
- Two demo projects (TE Connectivity — early stage; Vertex Robotics —
  well underway with realistic delays/achievements), each with the full
  12-phase / 62-task plan.
- 4 demo tickets.

To force a full re-seed later (e.g. after wiping the tables):

```bash
npm run seed
```

## Configuration

Copy `.env.example` to `.env` and fill in real values. Key variables:

| Variable | Purpose |
|---|---|
| `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_NAME` | Postgres connection |
| `PORT` | API port (default 4000) |
| `CORS_ORIGIN` | Allowed frontend origin (default `http://localhost:3000`) |
| `SEED_ON_BOOT` | Set `false` to disable the empty-table auto-seed |

## API

Every route is prefixed `/api/v1` and **requires `Authorization: Bearer <token>`** except
`POST /auth/login`, which is the only `@Public()` endpoint. A missing, malformed, expired, or
tampered token gets a 401 from the global `JwtAuthGuard`.

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | **Public.** `{ employeeCode, password }` → profile + `accessToken`, or a generic 401 |
| GET | `/auth/me` | The caller's own profile, re-read from the DB (not decoded from the token) |
| PATCH | `/auth/profile` | `{ name }` — the only self-editable field; anything else is stripped |
| POST | `/auth/change-password` | `{ currentPassword, newPassword }`. **400** (not 401) if the current password is wrong — see below |
| GET | `/projects` | Portfolio index — live-computed stats per project |
| POST | `/projects` | Create — generates the full 12-phase/62-task plan |
| GET | `/projects/:id` | Full detail — `{ id, meta, phases, tasks }` |
| PATCH | `/projects/:id` | Full-sync merge of `{ meta?, phases?, tasks? }` |
| GET | `/tickets` | All tickets |
| POST | `/tickets` | Raise a ticket |
| PATCH | `/tickets/:id` | Update a ticket |
| GET | `/team-performance` | Per-employee task load/completion, aggregated live |
| GET | `/dashboard-summary` | Portfolio baseline snapshot (captured once, for "vs last month" trend captions) |
| GET | `/employees` | `{ teams, employees }` org directory |

### Sign-in credentials (development)

The seeder gives every employee an `employeeCode` (initials + a global sequence number, e.g.
`VP001`, `SD003`) and hashes one shared **development** password for all of them:

```
Converge@123
```

Codes are matched case-insensitively. `SeedService.ensureCredentials()` re-runs on every boot
and fills only missing columns, so it backfills older rows without overwriting anything already
set — including a password a user has since changed via `/auth/change-password`.

Run `psql … -c "SELECT employee_code, name, app_role FROM employees ORDER BY employee_code;"`
for the full list.

### Auth notes

- **`JWT_SECRET` must be set in any deployed environment.** `Config.DEFAULT_JWT_SECRET` is an
  in-repo development fallback; anyone with the source can mint valid tokens against it.
  `JWT_EXPIRES_IN` defaults to `12h`.
- **Identity never comes from the request body.** `@CurrentUser()` reads the payload the guard
  verified, so there is no user-id parameter to tamper with on any endpoint.
- **`/auth/profile` accepts only `name`.** `ValidationPipe({ whitelist: true })` strips
  everything else, so a `User` cannot promote themselves by adding `appRole` to the body.
- **Wrong current password is 400, not 401.** The caller *is* authenticated at that point — the
  guard already accepted their token — so the failure is in the body. The frontend treats any
  401 as a dead session and signs out, and a typo shouldn't do that.
- **Still open**: the guard authenticates but does not yet *authorize* — it doesn't reject a
  `User` calling a mutating route. The token carries `appRole`, so a role check on the write
  endpoints is the next step. There's also no token refresh or server-side revocation.

## Structure

```
src/
  common/            Framework-agnostic date/business-day math, the
                     12-phase/62-task template, and org seed data —
                     ported from converge_frontend/lib/{dateUtils,
                     businessLogic,data}.ts so both apps compute
                     identical planned dates / delay / achievement logic.
  entities/          TypeORM entities: Team, Employee, Project, Phase,
                     Task, Ticket, DashboardBaseline.
  employees/         GET /employees
  projects/          GET/POST /projects, GET/PATCH /projects/:id
  tickets/           GET/POST /tickets, PATCH /tickets/:id
  team-performance/  GET /team-performance
  dashboard/         GET /dashboard-summary
  seed/              SeedService (auto-seed-if-empty) + run-seed.ts (manual re-seed)
```

## Notes

- `synchronize: true` (TypeORM) is used instead of migrations — appropriate
  for this stage, not for a database with data worth protecting from
  schema drift. Add real migrations before that changes.
- The frontend always PATCHes the *complete* `phases`/`tasks` arrays it
  holds in React state (add/delete/reorder/edit all go through the same
  path — see `ProjectDetail.tsx`), so `ProjectsService.update()` treats
  each PATCH as a full sync (upsert everything present, delete anything
  no longer present) rather than a partial diff.
