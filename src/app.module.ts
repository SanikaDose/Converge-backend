import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Team } from "./entities/team.entity";
import { Employee } from "./entities/employee.entity";
import { Project } from "./entities/project.entity";
import { Phase } from "./entities/phase.entity";
import { Task } from "./entities/task.entity";
import { Ticket } from "./entities/ticket.entity";
import { DashboardBaseline } from "./entities/dashboard-baseline.entity";
import { PhaseTemplate } from "./entities/phase-template.entity";
import { TaskTemplate } from "./entities/task-template.entity";
import { AuthModule } from "./auth/auth.module";
import { ProjectTemplatesModule } from "./project-templates/project-templates.module";
import { EmployeesModule } from "./employees/employees.module";
import { ProjectsModule } from "./projects/projects.module";
import { TicketsModule } from "./tickets/tickets.module";
import { TeamPerformanceModule } from "./team-performance/team-performance.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { SeedModule } from "./seed/seed.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      // Hosted Postgres (Render, Railway, Neon, Supabase) requires TLS and
      // refuses plaintext connections. `rejectUnauthorized: false` accepts
      // their managed certificate chain, which those providers issue rather
      // than a public CA. Off by default so a local Postgres still connects.
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
      entities: [Team, Employee, Project, Phase, Task, Ticket, DashboardBaseline, PhaseTemplate, TaskTemplate],
      // Opt-in, and deliberately OFF unless asked for: synchronize reshapes
      // the schema from the entities on every boot, so a renamed property
      // silently drops the column — and its data — in production. Enable it
      // for the first deploy to create the tables, then turn it off.
      synchronize: process.env.DB_SYNCHRONIZE === "true",
    }),
    AuthModule,
    ProjectTemplatesModule,
    EmployeesModule,
    ProjectsModule,
    TicketsModule,
    TeamPerformanceModule,
    DashboardModule,
    SeedModule,
  ],
})
export class AppModule {}
