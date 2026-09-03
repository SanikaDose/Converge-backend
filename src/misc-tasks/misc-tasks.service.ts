import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MiscTask } from "../entities/misc-task.entity";
import { Project } from "../entities/project.entity";
import { Employee } from "../entities/employee.entity";
import { newId } from "../utils/template";
import { todayISO } from "../utils/date-utils";
import type { CreateMiscTaskDto } from "./dto/create-misc-task.dto";
import type { UpdateMiscTaskDto } from "./dto/update-misc-task.dto";
import type { ChecklistItem } from "../utils/types";

@Injectable()
export class MiscTasksService {
  constructor(
    @InjectRepository(MiscTask) private readonly repo: Repository<MiscTask>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
  ) {}

  findAll(): Promise<MiscTask[]> {
    return this.repo.find({ order: { createdAt: "DESC" } });
  }

  /** Resolve the (denormalised) project name; null projectId = "Other". */
  private async resolveProjectName(projectId: string | null | undefined): Promise<{ id: string | null; name: string | null }> {
    if (!projectId) return { id: null, name: null };
    const project = await this.projectRepo.findOneBy({ id: projectId });
    if (!project) throw new NotFoundException("Project not found.");
    return { id: project.id, name: project.name };
  }

  /** Validate assignee ids against the directory and return them de-duped. */
  private async resolveAssignees(assignees?: string[], assignedTo?: string | null): Promise<string[]> {
    const requested = Array.from(new Set(
      (assignees && assignees.length ? assignees : (assignedTo ? [assignedTo] : [])).filter(Boolean),
    ));
    for (const id of requested) {
      const emp = await this.employeeRepo.findOneBy({ id });
      if (!emp) throw new NotFoundException("Assigned employee not found");
    }
    return requested;
  }

  async create(dto: CreateMiscTaskDto, createdBy: string): Promise<MiscTask> {
    const project = await this.resolveProjectName(dto.projectId);
    const assignees = await this.resolveAssignees(dto.assignees, dto.assignedTo);

    const task = this.repo.create({
      id: newId(),
      title: dto.title,
      description: dto.description || "",
      projectId: project.id,
      projectName: project.name,
      assignees,
      assignedTo: assignees[0] || null,
      priority: dto.priority || "Medium",
      status: dto.status || "To Do",
      dueDate: dto.dueDate || null,
      checklist: (dto.checklist as ChecklistItem[]) || [],
      createdAt: todayISO(),
      // Creator taken from the verified token, never the request body.
      createdBy,
      updatedAt: todayISO(),
      history: [],
    });
    return this.repo.save(task);
  }

  async update(id: string, dto: UpdateMiscTaskDto): Promise<MiscTask> {
    const task = await this.repo.findOneBy({ id });
    if (!task) throw new NotFoundException("Task not found.");

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.status !== undefined) task.status = dto.status;
    if (dto.dueDate !== undefined) task.dueDate = dto.dueDate || null;
    if (dto.checklist !== undefined) task.checklist = dto.checklist as ChecklistItem[];

    // "Related to" can be changed, including back to "Other" (projectId null).
    if (dto.projectId !== undefined) {
      const project = await this.resolveProjectName(dto.projectId);
      task.projectId = project.id;
      task.projectName = project.name;
    }

    // Keep the primary-assignee mirror in step when assignees is edited.
    if (dto.assignees !== undefined || dto.assignedTo !== undefined) {
      const assignees = await this.resolveAssignees(dto.assignees, dto.assignedTo);
      task.assignees = assignees;
      task.assignedTo = assignees[0] || null;
    }

    task.updatedAt = todayISO();
    return this.repo.save(task);
  }

  async remove(id: string): Promise<{ id: string }> {
    const result = await this.repo.delete({ id });
    if (!result.affected) throw new NotFoundException("Task not found.");
    return { id };
  }
}
