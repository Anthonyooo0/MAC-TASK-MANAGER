import type { TaskData } from '../types';

export const initialTasks: TaskData[] = [
  // Juan Ortiz — Teams Request Tracker
  { id: 't-001', title: 'Address sewer / facilities misuse', category: 'admin', priority: 2, status: 'Not Started', duration: '1h', source: 'Teams Mgmt Call', location: 'notebook' },
  { id: 't-002', title: 'Share ops data with NJ staff', category: 'project', priority: 2, status: 'Not Started', duration: '1h', source: 'Teams Mgmt Call', location: 'notebook' },
  { id: 't-003', title: 'Offline ops/finance data sessions', category: 'activity', priority: 2, status: 'Not Started', duration: '1.5h', source: 'Teams Mgmt Call', location: 'notebook' },
  { id: 't-004', title: 'Prepare tariff response strategy', category: 'initiative', priority: 3, status: 'Not Started', duration: '2h', source: 'Teams Mgmt Call', location: 'notebook' },
  { id: 't-005', title: 'Escalate tariff recovery / rebate', category: 'admin', priority: 3, status: 'Not Started', duration: '30m', source: 'Teams Mgmt Call', due: 'Ongoing', location: 'notebook' },

  // Edward Russnow emails
  { id: 't-006', title: 'Tariff impact analysis (open POs+forecast)', category: 'project', priority: 3, status: 'Not Started', duration: '3h', source: 'E. Russnow Email', location: 'notebook' },
  { id: 't-007', title: 'Status update on tariff forecast', category: 'admin', priority: 2, status: 'Not Started', duration: '30m', source: 'E. Russnow Email', location: 'notebook' },
  { id: 't-008', title: 'Product class descriptions to ETO reports', category: 'admin', priority: 2, status: 'Not Started', duration: '1h', source: 'E. Russnow Email', location: 'notebook' },
  { id: 't-009', title: 'Clarify "99-Other" vs "20-Other"', category: 'activity', priority: 1, status: 'Not Started', duration: '30m', source: 'E. Russnow Email', location: 'notebook' },
  { id: 't-010', title: 'Schedule ETO findings review', category: 'admin', priority: 2, status: 'Not Started', duration: '15m', source: 'E. Russnow Email', location: 'notebook' },
  { id: 't-011', title: 'Update Angel C. Leon dev plan/training', category: 'initiative', priority: 3, status: 'Not Started', duration: '1h', source: 'E. Russnow Email', location: 'notebook' },
  { id: 't-012', title: 'Confirm mentorship resources for Angel', category: 'admin', priority: 2, status: 'Not Started', duration: '30m', source: 'E. Russnow Email', location: 'notebook' },
  { id: 't-013', title: 'Concur AP automation & Acumatica integration', category: 'project', priority: 3, status: 'Not Started', duration: '1.5h', source: 'E. Russnow Email', location: 'notebook' },
  { id: 't-014', title: 'Explain SMART Team feedback loop', category: 'project', priority: 2, status: 'Not Started', duration: '1h', source: 'E. Russnow Email', location: 'notebook' },
  { id: 't-015', title: 'SMART Team hours & cost recovery approach', category: 'admin', priority: 2, status: 'Not Started', duration: '45m', source: 'E. Russnow Email', location: 'notebook' },
  { id: 't-016', title: 'Doc storage & access for SMART Team', category: 'admin', priority: 2, status: 'Not Started', duration: '30m', source: 'E. Russnow Email', location: 'notebook' },
  { id: 't-017', title: 'Align AAP Cast Lugs inventory', category: 'project', priority: 3, status: 'Not Started', duration: '1h', source: 'E. Russnow Email', location: 'notebook' },
  { id: 't-018', title: 'AI agent for Cost of Poor Quality', category: 'initiative', priority: 2, status: 'Not Started', duration: '2h', source: 'E. Russnow Email', location: 'notebook' },
  { id: 't-019', title: 'Field Services analysis (hrs paid vs billed)', category: 'project', priority: 2, status: 'Not Started', duration: '2h', source: 'E. Russnow Email', location: 'notebook' },

  // Management Call Actions
  { id: 't-020', title: 'Provide budgeting info on all topics', category: 'project', priority: 3, status: 'Not Started', duration: '2h', source: 'Mgmt Call (Nick/Juan)', location: 'notebook' },
  { id: 't-021', title: 'Deliver budget info today (despite weather)', category: 'activity', priority: 3, status: 'Not Started', duration: '1h', source: 'Mgmt Call (Nick)', due: 'Today', location: 'notebook' },
  { id: 't-022', title: 'Confirm weekly shipping schedule pres.', category: 'admin', priority: 2, status: 'Not Started', duration: '30m', source: 'Mgmt Call (Nick/Gary)', location: 'notebook' },
  { id: 't-023', title: 'Analyze $2.8M backlog / recovery plan', category: 'project', priority: 3, status: 'Not Started', duration: '3h', source: 'Mgmt Call (Ops/Juan)', location: 'notebook' },
  { id: 't-024', title: 'Tighten weekly shipping forecasts', category: 'initiative', priority: 2, status: 'Not Started', duration: '1h', source: 'Mgmt Call (Nick/Butch)', location: 'notebook' },
  { id: 't-025', title: 'Share on-time delivery & backlog with staff', category: 'activity', priority: 2, status: 'Not Started', duration: '1h', source: 'Mgmt Call (Butch/Juan)', location: 'notebook' },
  { id: 't-026', title: 'Kick off Feb shipping results review', category: 'admin', priority: 2, status: 'Not Started', duration: '1h', source: 'Mgmt Call (Mike U.)', location: 'notebook' },
  { id: 't-027', title: 'Share Mass Electric presentation draft', category: 'admin', priority: 2, status: 'Not Started', duration: '30m', source: 'Mgmt Call (Henry R.)', location: 'notebook' },
  { id: 't-028', title: 'Send inventory notes to Henry', category: 'admin', priority: 2, status: 'Not Started', duration: '15m', source: 'Mgmt Call (Henry R.)', location: 'notebook' },

  // Request Matrix
  { id: 't-029', title: 'Capacity Plan for Concurrent Vault Orders', category: 'initiative', priority: 3, status: 'Not Started', duration: '3h', source: 'David Zuercher', due: 'Q2', location: 'notebook' },
  { id: 't-030', title: 'GTA Renewal Meeting', category: 'admin', priority: 2, status: 'Not Started', duration: '1h', source: 'Michael Betti', due: '< 2 Weeks', location: 'notebook' },
  { id: 't-031', title: '138kV Roof Slab Coord. with Flatworld', category: 'project', priority: 2, status: 'Not Started', duration: '2h', source: 'Geoffrey Ocampo', location: 'notebook' },
  { id: 't-032', title: 'CNC Staffing Analysis Template', category: 'admin', priority: 2, status: 'Not Started', duration: '1.5h', source: 'Gabriel Noriega', location: 'notebook' },
  { id: 't-033', title: 'Acumatica Proposal Executive Review', category: 'initiative', priority: 3, status: 'Not Started', duration: '1h', source: 'Audrey Idom', due: 'Tomorrow', location: 'notebook' },
  { id: 't-034', title: 'MAC/MEKCO Follow-Up Teams Mtg', category: 'activity', priority: 2, status: 'Not Started', duration: '1h', source: 'Adam Schneider', due: 'Week of Mar 10', location: 'notebook' },
  { id: 't-035', title: 'Clarify Safety Stock File Ownership', category: 'project', priority: 2, status: 'Not Started', duration: '1h', source: 'William Koch', location: 'notebook' },
  { id: 't-036', title: 'Align SO 174571 Cleveland RTA', category: 'activity', priority: 2, status: 'Not Started', duration: '30m', source: 'William Koch', due: 'Jul 27, 2026', location: 'notebook' },
  { id: 't-037', title: 'Safety Walk & Policy Coverage Check', category: 'activity', priority: 3, status: 'Not Started', duration: '1.5h', source: 'Read AI (Eddie Call)', location: 'notebook' },
  { id: 't-038', title: 'Mgmt Call Operational Follow-ups', category: 'admin', priority: 2, status: 'Not Started', duration: '2h', source: 'Read AI (Eddie Call)', due: 'Rolling', location: 'notebook' },

  // Eddie's Custom List
  { id: 't-039', title: 'Godfrey/George/Winsley Legacy', category: 'project', priority: 2, status: 'Not Started', duration: '2h', source: 'Eddie List', location: 'notebook' },
  { id: 't-040', title: 'Contingency Planning', category: 'initiative', priority: 3, status: 'Not Started', duration: '2h', source: 'Eddie List', location: 'notebook' },
  { id: 't-041', title: 'Capacity Improvements CAPEX Analysis', category: 'project', priority: 3, status: 'Not Started', duration: '3h', source: 'Eddie List', location: 'notebook' },
  { id: 't-042', title: 'Finalize Engineering Restructuring', category: 'initiative', priority: 3, status: 'Not Started', duration: '2.5h', source: 'Eddie List', location: 'notebook' },

  // Pre-completed
  { id: 't-043', title: 'Secure CNC Skills Matrix', category: 'admin', priority: 1, status: 'Completed', duration: '30m', source: 'E. Russnow Email', location: 'notebook' },
  { id: 't-044', title: 'Feedback on Jhonny Discussion', category: 'activity', priority: 1, status: 'Completed', duration: '30m', source: 'E. Russnow Email', location: 'notebook' },
  { id: 't-045', title: 'Review Product Class Updates', category: 'initiative', priority: 2, status: 'Completed', duration: '1h', source: 'E. Russnow Email', location: 'notebook' },
];
