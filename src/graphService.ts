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

/** Convert an Outlook event into a day index (0-4, Mon-Fri) and slot index based on hour */
export function mapEventToCalendarSlot(event: OutlookEvent): { day: number; slot: number; duration: string } | null {
  const start = new Date(event.start.dateTime + (event.start.timeZone === "UTC" ? "Z" : ""));
  const end = new Date(event.end.dateTime + (event.end.timeZone === "UTC" ? "Z" : ""));

  const dayOfWeek = start.getDay(); // 0=Sun, 1=Mon...
  if (dayOfWeek < 1 || dayOfWeek > 5) return null; // skip weekends
  const day = dayOfWeek - 1; // 0=Mon, 4=Fri

  const hour = start.getHours();
  let slot: number;
  if (hour >= 8 && hour < 9) slot = 0;       // 8-9 AM
  else if (hour >= 9 && hour < 11) slot = 1;  // 9-11 AM
  else if (hour >= 11 && hour < 12) slot = 2; // 11-12 PM
  else if (hour >= 12 && hour < 13) slot = 3; // 12-1 PM
  else if (hour >= 13 && hour < 15) slot = 4; // 1-3 PM
  else if (hour >= 15 && hour < 17) slot = 5; // 3-5 PM
  else return null; // outside work hours

  const durationMs = end.getTime() - start.getTime();
  const durationMin = Math.round(durationMs / 60000);
  const duration = durationMin >= 60 ? `${(durationMin / 60).toFixed(1).replace('.0', '')}h` : `${durationMin}m`;

  return { day, slot, duration };
}
