import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Team } from "./entities/team.entity";
import { Employee } from "./entities/employee.entity";
import { Project } from "./entities/project.entity";
import { Phase } from "./entities/phase.entity";
import { Task } from "./entities/task.entity";
import { Ticket } from "./entities/ticket.entity";
import { DashboardBaseline } from "./entities/dashboard-baseline.entity";
import { AuthModule } from "./auth/auth.module";
import { EmployeesModule } from "./employees/employees.module";
import { ProjectsModule } from "./projects/projects.module";
import { TicketsModule } from "./tickets/tickets.module";
import { TeamPerformanceModule } from "./team-performance/team-performance.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { SeedModule } from "./seed/seed.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres" as const,
        host: config.get<string>("DB_HOST", "localhost"),
        port: config.get<number>("DB_PORT", 5432),
        username: config.get<string>("DB_USERNAME", "root"),
        password: config.get<string>("DB_PASSWORD", ""),
        database: config.get<string>("DB_NAME", "converge"),
        entities: [Team, Employee, Project, Phase, Task, Ticket, DashboardBaseline],
        // Fine for this app's mock-to-real-DB migration stage — no
        // migration files to maintain yet. Swap for real migrations
        // before this ever points at a database with data worth keeping.
        synchronize: true,
      }),
    }),
    AuthModule,
    EmployeesModule,
    ProjectsModule,
    TicketsModule,
    TeamPerformanceModule,
    DashboardModule,
    SeedModule,
  ],
})
export class AppModule {}
