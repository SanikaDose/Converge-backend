import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Employee } from "../entities/employee.entity";
import { Task } from "../entities/task.entity";
import { Team } from "../entities/team.entity";
import { aggregateTeamPerformance } from "../utils/business-logic";
import { todayISO } from "../utils/date-utils";

@Injectable()
export class TeamPerformanceService {
  constructor(
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
  ) {}

  async compute() {
    const [employees, teams, tasks] = await Promise.all([
      this.employeeRepo.find(),
      this.teamRepo.find(),
      this.taskRepo.find(),
    ]);
    const teamNameById = new Map(teams.map(t => [t.id, t.name]));
    const input = employees.map(e => ({ id: e.id, name: e.name, role: e.role, team: teamNameById.get(e.teamId) || "", teamId: e.teamId }));
    return aggregateTeamPerformance(input, tasks, todayISO());
  }
}
