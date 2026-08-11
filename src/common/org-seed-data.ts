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

// Order is load-bearing: buildSeedCredentials numbers employee codes by flat
// position in this list, so new people go on the end of their team (and new
// teams on the end of the list) to keep existing codes stable.
export const SEED_TEAMS: SeedTeam[] = [
  {
    id: "software",
    name: "Software Team",
    members: [
      { id: "viren-patil", name: "Viren Patil", role: "User" },
      { id: "shubham-tanapure", name: "Shubham Tanapure", role: "User" },
      { id: "sanika-dose", name: "Sanika Dose", role: "User" },
      { id: "prachi-jamgaonkar", name: "Prachi Jamgaonkar", role: "User" },
      { id: "mayuri-bondre", name: "Mayuri Bondre", role: "User" },
    ],
  },
  {
    id: "vision",
    name: "Vision Team",
    members: [
      { id: "nikhil-warokar", name: "Nikhil Warokar", role: "User" },
      { id: "krishna-kumbhar", name: "Krishna Kumbhar", role: "User" },
      { id: "jay-remalukar", name: "Jay Remalukar", role: "User" },
      { id: "pavitra-joshi", name: "Pavitra Joshi", role: "User" },
      { id: "mayur-jare", name: "Mayur Jare", role: "User" },
      { id: "ashutosh-dodiya", name: "Ashutosh Dodiya", role: "User" },
      { id: "hritik-patil", name: "Hritik Patil", role: "User" },
    ],
  },
  {
    id: "automation",
    name: "Automation Team",
    members: [
      { id: "bharat-vinchwekar", name: "Bharat Vinchwekar", role: "User" },
      { id: "sanket-chavhan", name: "Sanket Chavhan", role: "User" },
    ],
  },
  // Sits before Sales deliberately: these two occupied flat positions 15-16
  // when they were still listed under Sales, so keeping them there preserves
  // every already-issued employee code (SB015, A016, then CK017/PS018/MP019).
  {
    id: "project-manager",
    name: "Project Manager",
    members: [
      { id: "sanskar-balbudhe", name: "Sanskar Balbudhe", role: "Admin" },
      // Generic administrator login, not a real person — signs in as "A016".
      { id: "admin", name: "Admin", role: "Admin" },
    ],
  },
  {
    id: "sales",
    name: "Sales Team",
    members: [
      { id: "chetan-kulkarni", name: "Chetan Kulkarni", role: "User" },
      { id: "pradip-shinde", name: "Pradip Shinde", role: "User" },
      { id: "mishank-parihar", name: "Mishank Parihar", role: "User" },
    ],
  },
];
