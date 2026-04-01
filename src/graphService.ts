import type { IPublicClientApplication } from "@azure/msal-browser";
import { graphScopes } from "./authConfig";

export interface OutlookEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  isAllDay: boolean;
}

async function getAccessToken(instance: IPublicClientApplication): Promise<string> {
  const accounts = instance.getAllAccounts();
  if (accounts.length === 0) throw new Error("No accounts");
  const response = await instance.acquireTokenSilent({
    ...graphScopes,
    account: accounts[0],
  });
  return response.accessToken;
}

export async function fetchCalendarEvents(
  instance: IPublicClientApplication,
  startDate: Date,
  endDate: Date
): Promise<OutlookEvent[]> {
  const token = await getAccessToken(instance);
  const start = startDate.toISOString();
  const end = endDate.toISOString();

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${start}&endDateTime=${end}&$select=id,subject,start,end,isAllDay&$orderby=start/dateTime&$top=100`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    console.warn("Graph API error:", response.status, await response.text());
    return [];
  }

  const data = await response.json();
  return data.value || [];
}

// Slot boundaries in hours
const SLOT_BOUNDS = [
  { start: 8, end: 9 },   // slot 0: 8-9 AM
  { start: 9, end: 11 },  // slot 1: 9-11 AM
  { start: 11, end: 12 }, // slot 2: 11-12 PM
  { start: 12, end: 13 }, // slot 3: 12-1 PM
  { start: 13, end: 15 }, // slot 4: 1-3 PM
  { start: 15, end: 17 }, // slot 5: 3-5 PM
];

function hourToSlot(hour: number): number | null {
  for (let i = 0; i < SLOT_BOUNDS.length; i++) {
    if (hour >= SLOT_BOUNDS[i].start && hour < SLOT_BOUNDS[i].end) return i;
  }
  return null;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/** Convert an Outlook event into day, slots it spans, and duration */
export function mapEventToCalendarSlot(event: OutlookEvent): { day: number; startSlot: number; slots: number[]; duration: string; timeLabel: string } | null {
  const start = new Date(event.start.dateTime + (event.start.timeZone === "UTC" ? "Z" : ""));
  const end = new Date(event.end.dateTime + (event.end.timeZone === "UTC" ? "Z" : ""));

  const dayOfWeek = start.getDay();
  if (dayOfWeek < 1 || dayOfWeek > 5) return null;
  const day = dayOfWeek - 1;

  const startHour = start.getHours() + start.getMinutes() / 60;
  const endHour = end.getHours() + end.getMinutes() / 60;

  const startSlot = hourToSlot(startHour);
  if (startSlot === null) return null;

  // Find all slots this event spans
  const slots: number[] = [];
  for (let i = 0; i < SLOT_BOUNDS.length; i++) {
    const sb = SLOT_BOUNDS[i];
    // Event overlaps this slot if event start < slot end AND event end > slot start
    if (startHour < sb.end && endHour > sb.start) {
      slots.push(i);
    }
  }

  const durationMs = end.getTime() - start.getTime();
  const durationMin = Math.round(durationMs / 60000);
  const duration = durationMin >= 60 ? `${(durationMin / 60).toFixed(1).replace('.0', '')}h` : `${durationMin}m`;
  const timeLabel = `${formatTime(start)} - ${formatTime(end)}`;

  return { day, startSlot, slots, duration, timeLabel };
}
