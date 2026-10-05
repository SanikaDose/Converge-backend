import { randomUUID } from "node:crypto";
/**
 * The 12-phase / 62-task project template — ported verbatim from
 * converge_frontend/lib/data.ts so newly-created projects (and the seeded
 * demo projects) generate the exact same phase/task plan the frontend has
 * always shown.
 *
 * Each phase carries `weekStart` (1-based project week it begins in) and
 * `durationWeeks`. A task's `dayOffset` is its "day from the phase's week
 * start" and `duration` is its length — both in *working* days (see
 * date-utils). So a task's planned start = phaseStart (the working day that
 * opens the phase's week) + dayOffset working days.
 */
import type { TemplatePhase } from "./types";

export const TEMPLATE: TemplatePhase[] = [
  { phase: "01 · Project Initialization", critical: true, weekStart: 1, durationWeeks: 1, tasks: [
    ["Project Kick-off Meeting", 0, 1],
    ["Requirement Gathering & Analysis", 1, 2],
    ["Site Survey & Feasibility Study", 1, 2],
    ["Project Planning & Resource Allocation", 3, 2],
    ["Scope Freeze & Customer Approval (DAP)", 5, 2],
  ]},
  { phase: "02 · Engineering", critical: true, weekStart: 2, durationWeeks: 1, tasks: [
    ["Requirement Review", 2, 1],
    ["BOM Finalization", 2, 1],
    ["Electrical Design", 2, 2],
    ["Mechanical / Layout Design", 3, 1],
    ["Network Architecture", 3, 1],
    ["Software Architecture", 3, 1],
    ["Database Architecture", 3, 1],
    ["Application Flow", 3, 1],
    ["Design Review", 4, 1],
    ["Engineering Release", 5, 1],
  ]},
  { phase: "03 · Infrastructure", critical: false, weekStart: 3, durationWeeks: 1, tasks: [
    ["Windows / Linux Setup", 0, 1],
    ["Vision Tool Installation", 0, 1],
    ["Software Tools Installation", 0, 1],
    ["Automation Tool Installation", 0, 1],
    ["Integration Utility Installations", 0, 1],
    ["Remote Access Utilities", 0, 1],
  ]},
  { phase: "04 · Software", critical: true, discipline: "Software", weekStart: 3, durationWeeks: 2, tasks: [
    ["Database Creation", 1, 1],
    ["Backend Module Finalization", 1, 1],
    ["Frontend UX/UI Design", 2, 1],
    ["Backend Development", 3, 3],
    ["Frontend Development", 3, 3],
    ["End-to-End Software Testing", 6, 2],
    ["Integration Testing", 8, 1],
    ["Complete Application Testing", 9, 1],
    ["Software Deployment", 10, 1],
  ]},
  { phase: "05 · Vision Software", critical: true, discipline: "Vision", weekStart: 3, durationWeeks: 2, tasks: [
    ["Inspection Requirement Definition", 0, 2],
    ["Vision Hardware Selection (Camera, Lens, Lighting)", 0, 1],
    ["Camera Installation & Calibration", 2, 1],
    ["Lighting Design & Optimization", 2, 1],
    ["Image Acquisition Configuration", 3, 1],
    ["Vision Inspection Tool / AI Model Development", 4, 4],
    ["Golden Sample & Recipe Creation", 8, 1],
    ["Machine Integration", 9, 1],
    ["Performance Validation", 10, 1],
  ]},
  { phase: "06 · Automation", critical: true, discipline: "Automation", weekStart: 3, durationWeeks: 2, tasks: [
    ["PLC IO Mapping & Tag List", 1, 1],
    ["PLC Program Development", 2, 3],
    ["HMI Development (if applicable)", 5, 2],
    ["Integration Development", 7, 2],
  ]},
  { phase: "07 · FAT", critical: true, weekStart: 4, durationWeeks: 1, tasks: [
    ["Performance Testing", 6, 1],
    ["Factory Acceptance Test", 7, 1],
    ["FAT Closure", 8, 1],
    ["As-Built Document Setup", 8, 1],
  ]},
  { phase: "08 · Dispatch", critical: false, weekStart: 5, durationWeeks: 1, tasks: [
    ["Packing", 4, 1],
    ["Dispatch", 5, 1],
    ["Delivery Confirmation", 7, 1],
  ]},
  { phase: "09 · Site", critical: true, weekStart: 5, durationWeeks: 1, tasks: [
    ["Site Readiness", 7, 1],
    ["Equipment Installation", 8, 1],
    ["Electrical & Network Integration", 9, 1],
  ]},
  { phase: "10 · SAT", critical: true, weekStart: 5, durationWeeks: 3, tasks: [
    ["Production Trial", 10, 2],
    ["Customer Validation", 12, 1],
    ["Final SAT", 13, 1],
  ]},
  { phase: "11 · Handover", critical: false, weekStart: 8, durationWeeks: 1, tasks: [
    ["Operator Training", 0, 2],
    ["Project Documentation", 0, 2],
    ["Final Handover", 1, 1],
    ["Minutes of Meeting", 1, 1],
  ]},
  { phase: "12 · Closure", critical: false, weekStart: 8, durationWeeks: 1, tasks: [
    ["Warranty Support", 2, 1],
    ["Project Closure", 2, 1],
  ]},
];

export const STATUS_OPTIONS = ["Not Started", "In Progress", "Pending Approval", "Delayed", "Blocked", "Completed"] as const;
export const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"] as const;
export const MAX_WEEK_OFF_DAYS = 2;

/**
 * Primary keys for projects, phases, tasks, and tickets.
 *
 * Replaced a hand-rolled `${prefix}_${Date.now()}_${random}` scheme whose
 * uniqueness rested on two ids never sharing a millisecond *and* a 6-char
 * random suffix. `crypto.randomUUID()` is a real v4 UUID, and the columns
 * are a native Postgres `uuid` rather than varchar.
 *
 * Generated here rather than by the database (`@PrimaryGeneratedColumn`)
 * because a project's phases and tasks are built in memory referencing each
 * other's ids before any row is inserted — see buildProjectPhases/buildTasks.
 */
export function newId(): string {
  return randomUUID();
}
