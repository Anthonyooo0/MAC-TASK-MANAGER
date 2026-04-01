import type { PresetMeeting, ScheduleSlot } from '../types';

export const presetMeetings: PresetMeeting[] = [
  { week: 1, day: 0, slot: 0, title: 'Weekly Management Call', duration: '1h' },
  { week: 1, day: 2, slot: 4, title: 'MEKCO Follow-up Teams Mtg', duration: '1h' },
  { week: 1, day: 3, slot: 2, title: 'Acumatica Exec Demo', duration: '1h' },
  { week: 1, day: 4, slot: 0, title: 'GTA Renewal Meeting', duration: '1h' },
];

export const schedule: ScheduleSlot[] = [
  { time: '8-9 AM', label: 'Sync' },
  { time: '9-11 AM', label: 'Prime' },
  { time: '11-12 PM', label: 'Plan' },
  { time: '12-1 PM', label: 'Lunch' },
  { time: '1-3 PM', label: 'Meet' },
  { time: '3-5 PM', label: 'Catchup' },
];
