/**
 * The 12-phase / 62-task project template — ported verbatim from
 * converge_frontend/lib/data.ts so newly-created projects (and the seeded
 * demo projects) generate the exact same phase/task plan the frontend has
 * always shown. dayOffset/duration are in *working* days (see date-utils).
 */
import type { TemplatePhase } from "./types";

export const TEMPLATE: TemplatePhase[] = [
  { phase: "01 · Project Initialization", critical: true, tasks: [
    ["Project Kick-off Meeting", 0, 1],
    ["Requirement Gathering & Analysis", 1, 2],
    ["Site Survey & Feasibility Study", 1, 2],
    ["Project Planning & Resource Allocation", 3, 2],
    ["Scope Freeze & Customer Approval (DAP)", 5, 2],
  ]},
  { phase: "02 · Engineering", critical: true, tasks: [
    ["Requirement Review", 7, 1],
    ["BOM Finalization", 7, 1],
    ["Electrical Design", 7, 2],
    ["Mechanical / Layout Design", 8, 1],
    ["Network Architecture", 8, 1],
    ["Software Architecture", 8, 1],
    ["Database Architecture", 8, 1],
    ["Application Flow", 8, 1],
    ["Design Review", 9, 1],
    ["Engineering Release", 10, 1],
  ]},
  { phase: "03 · Infrastructure", critical: false, tasks: [
    ["Windows / Linux Setup", 10, 1],
    ["Vision Tool Installation", 10, 1],
    ["Software Tools Installation", 10, 1],
    ["Automation Tool Installation", 10, 1],
    ["Integration Utility Installations", 10, 1],
    ["Remote Access Utilities", 10, 1],
  ]},
  { phase: "04 · Software", critical: true, tasks: [
    ["Database Creation", 11, 1],
    ["Backend Module Finalization", 11, 1],
    ["Frontend UX/UI Design", 12, 1],
    ["Backend Development", 13, 3],
    ["Frontend Development", 13, 3],
    ["End-to-End Software Testing", 16, 2],
    ["Integration Testing", 18, 1],
    ["Complete Application Testing", 19, 1],
    ["Software Deployment", 20, 1],
  ]},
  { phase: "05 · Vision Software", critical: true, tasks: [
    ["Inspection Requirement Definition", 7, 2],
    ["Vision Hardware Selection (Camera, Lens, Lighting)", 7, 1],
    ["Camera Installation & Calibration", 12, 1],
    ["Lighting Design & Optimization", 12, 1],
    ["Image Acquisition Configuration", 13, 1],
    ["Vision Inspection Tool / AI Model Development", 14, 4],
    ["Golden Sample & Recipe Creation", 18, 1],
    ["Machine Integration", 19, 1],
    ["Performance Validation", 20, 1],
  ]},
  { phase: "06 · Automation", critical: true, tasks: [
    ["PLC IO Mapping & Tag List", 11, 1],
    ["PLC Program Development", 12, 3],
    ["HMI Development (if applicable)", 15, 2],
    ["Integration Development", 17, 2],
  ]},
  { phase: "07 · FAT", critical: true, tasks: [
    ["Performance Testing", 21, 1],
    ["Factory Acceptance Test", 22, 1],
    ["FAT Closure", 23, 1],
    ["As-Built Document Setup", 23, 1],
  ]},
  { phase: "08 · Dispatch", critical: false, tasks: [
    ["Packing", 24, 1],
    ["Dispatch", 25, 1],
    ["Delivery Confirmation", 27, 1],
  ]},
  { phase: "09 · Site", critical: true, tasks: [
    ["Site Readiness", 27, 1],
    ["Equipment Installation", 28, 1],
    ["Electrical & Network Integration", 29, 1],
  ]},
  { phase: "10 · SAT", critical: true, tasks: [
    ["Production Trial", 30, 2],
    ["Customer Validation", 32, 1],
    ["Final SAT", 33, 1],
  ]},
  { phase: "11 · Handover", critical: false, tasks: [
    ["Operator Training", 34, 2],
    ["Project Documentation", 34, 2],
    ["Final Handover", 36, 1],
    ["Minutes of Meeting", 36, 1],
  ]},
  { phase: "12 · Closure", critical: false, tasks: [
    ["Warranty Support", 37, 1],
    ["Project Closure", 37, 1],
  ]},
];

export const STATUS_OPTIONS = ["Not Started", "In Progress", "Pending Approval", "Delayed", "Completed"] as const;
export const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"] as const;
export const MAX_WEEK_OFF_DAYS = 2;

export function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
