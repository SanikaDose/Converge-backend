/**
 * Raw organization directory used only to seed the teams/employees
 * tables — ported verbatim (including ids) from
 * converge_frontend/lib/data.ts's TEAMS constant, so seeded employee ids
 * (e.g. "sanika-dose") line up with anything the frontend's own static
 * EMPLOYEES list references (task assignees, ticket assignees, project
 * owners).
 */
import type { OrgRole } from "./types";

export interface SeedTeam {
  id: string;
  name: string;
  members: { id: string; name: string; role: OrgRole }[];
}

export const SEED_TEAMS: SeedTeam[] = [
  {
    id: "software",
    name: "Software Team",
    members: [
      { id: "viren-patil", name: "Viren Patil", role: "Team Lead" },
      { id: "shubham-tanapure", name: "Shubham Tanapure", role: "Developer" },
      { id: "sanika-dose", name: "Sanika Dose", role: "Developer" },
      { id: "prachi-jamgaonkar", name: "Prachi Jamgaonkar", role: "Developer" },
      { id: "mayuri-bondre", name: "Mayuri Bondre", role: "Developer" },
    ],
  },
  {
    id: "vision",
    name: "Vision Team",
    members: [
      { id: "nikhil-warokar", name: "Nikhil Warokar", role: "Team Lead" },
      { id: "krishna-kumbhar", name: "Krishna Kumbhar", role: "Developer" },
      { id: "jay-remalukar", name: "Jay Remalukar", role: "Developer" },
      { id: "pavitra-joshi", name: "Pavitra Joshi", role: "Developer" },
      { id: "mayur-jare", name: "Mayur Jare", role: "Developer" },
      { id: "ashutosh-dodiya", name: "Ashutosh Dodiya", role: "Developer" },
      { id: "hritik-patil", name: "Hritik Patil", role: "Developer" },
    ],
  },
  {
    id: "automation",
    name: "Automation Team",
    members: [
      { id: "bharat-vinchwekar", name: "Bharat Vinchwekar", role: "Team Lead" },
      { id: "sanket-chavhan", name: "Sanket Chavhan", role: "Developer" },
    ],
  },
];
