export interface TaskData {
  id: string;
  title: string;
  category: 'project' | 'admin' | 'initiative' | 'activity';
  priority: 1 | 2 | 3;
  status: 'Not Started' | 'In Progress' | 'Delegated' | 'Waiting on Someone' | 'Completed';
  duration: string;
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
