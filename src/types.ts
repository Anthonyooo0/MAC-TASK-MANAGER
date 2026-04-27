export interface TaskData {
  id: string;
  userEmail?: string;
  title: string;
  category: 'project' | 'admin' | 'initiative' | 'activity';
  priority: 1 | 2 | 3;
  status: 'Not Started' | 'In Progress' | 'Delegated' | 'Waiting on Someone' | 'Completed';
  duration: string;
  startTime?: string; // HH:MM format e.g. "08:00"
  endTime?: string;   // HH:MM format e.g. "17:00"
  source: string;
  delegated?: string;
  energy?: string;
  requester?: string;
  received?: string;
  due?: string;
  start?: string;
  parent?: string;
  tags?: string;
  waiting?: string;
  nextaction?: string;
  links?: string;
  notes?: string;
  // Internal tracking
  ghostId?: string;
  location: 'notebook' | 'calendar' | 'delegation';
  calendarPosition?: { week: number; day: number; slot: number };
  pendingDelegation?: boolean;
  delegatedBy?: string;
  // Outlook event sync
  outlookEventId?: string;  // set when task is on the calendar and synced to Outlook
}

export interface PresetMeeting {
  week: number;
  day: number;
  slot: number;
  title: string;
  duration: string;
}

export interface ScheduleSlot {
  time: string;
  label: string;
}

export type SortMode = 'default' | 'priority-desc' | 'priority-asc' | 'source';
