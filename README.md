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

| Method | Path | Notes |
|---|---|---|
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
