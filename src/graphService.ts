import type { IPublicClientApplication } from "@azure/msal-browser";
import { graphScopes } from "./authConfig";

export interface OutlookAttendee {
  emailAddress: { name: string; address: string };
  status: { response: string; time?: string }; // none, organizer, accepted, declined, tentativelyAccepted
  type: string; // required, optional, resource
}

export interface OutlookEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  isAllDay: boolean;
  location?: { displayName: string };
  organizer?: { emailAddress: { name: string; address: string } };
  attendees?: OutlookAttendee[];
  bodyPreview?: string;
  isOnlineMeeting?: boolean;
  onlineMeetingUrl?: string;
  responseStatus?: { response: string };
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
    `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${start}&endDateTime=${end}&$select=id,subject,start,end,isAllDay,location,organizer,attendees,bodyPreview,isOnlineMeeting,onlineMeetingUrl,responseStatus&$orderby=start/dateTime&$top=100`,
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
export function mapEventToCalendarSlot(event: OutlookEvent): { day: number; startSlot: number; slots: number[]; duration: string; timeLabel: string; topPercent: number; heightPercent: number } | null {
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

  // Calculate vertical position within the spanned rows
  const firstSlotStart = SLOT_BOUNDS[slots[0]].start;
  const lastSlotEnd = SLOT_BOUNDS[slots[slots.length - 1]].end;
  const totalSpanHours = lastSlotEnd - firstSlotStart;

  const topPercent = ((startHour - firstSlotStart) / totalSpanHours) * 100;
  const eventHours = endHour - startHour;
  const heightPercent = (eventHours / totalSpanHours) * 100;

  return { day, startSlot, slots, duration, timeLabel, topPercent, heightPercent };
}

/** Fetch all MAC Products users from the org directory */
export async function fetchOrgUsers(instance: IPublicClientApplication): Promise<{ displayName: string; email: string }[]> {
  const token = await getAccessToken(instance);
  const response = await fetch(
    'https://graph.microsoft.com/v1.0/users?$select=displayName,mail,userPrincipalName&$top=999&$filter=accountEnabled eq true',
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    console.warn("Graph users error:", response.status, await response.text());
    return [];
  }

  const data = await response.json();
  return (data.value || [])
    .filter((u: { mail?: string; userPrincipalName?: string }) => {
      const email = (u.mail || u.userPrincipalName || '').toLowerCase();
      return email.endsWith('@macproducts.net') || email.endsWith('@macimpulse.net');
    })
    .map((u: { displayName: string; mail?: string; userPrincipalName?: string }) => ({
      displayName: u.displayName,
      email: (u.mail || u.userPrincipalName || '').toLowerCase(),
    }))
    .sort((a: { displayName: string }, b: { displayName: string }) => a.displayName.localeCompare(b.displayName));
}

/** Send delegation notification email via Graph API on behalf of signed-in user */
export async function sendDelegationEmail(
  instance: IPublicClientApplication,
  toEmail: string,
  toName: string,
  taskTitle: string,
  assignedBy: string
): Promise<void> {
  const token = await getAccessToken(instance);

  const emailPayload = {
    message: {
      subject: `Task Assigned: ${taskTitle}`,
      body: {
        contentType: 'HTML',
        content: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1a365d; color: white; padding: 20px 30px; border-radius: 12px 12px 0 0;">
              <h2 style="margin: 0; font-size: 18px;">MAC Task Manager</h2>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="color: #2d3436; font-size: 16px; margin-top: 0;">Hi ${toName || toEmail.split('@')[0]},</p>
              <p style="color: #636e72; font-size: 14px;">A task has been delegated to you on the MAC Task Manager:</p>
              <div style="background: #f0f4f8; border-left: 4px solid #3182ce; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
                <p style="margin: 0; font-weight: 700; color: #1a365d; font-size: 16px;">${taskTitle}</p>
              </div>
              <p style="color: #636e72; font-size: 14px;">Assigned by: <strong>${assignedBy}</strong></p>
              <p style="color: #636e72; font-size: 14px;">Please log in to the <a href="https://agreeable-rock-082a9c91e.6.azurestaticapps.net" style="color: #3182ce;">MAC Task Manager</a> to view details.</p>
            </div>
            <div style="text-align: center; padding: 15px; color: #a0aec0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">
              MAC Products Internal System
            </div>
          </div>
        `,
      },
      toRecipients: [
        { emailAddress: { address: toEmail, name: toName || '' } },
      ],
      ccRecipients: [
        { emailAddress: { address: 'anthony.jimenez@macproducts.net', name: 'Anthony Jimenez' } },
      ],
    },
    saveToSentItems: false,
  };

  const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailPayload),
  });

  if (!response.ok) {
    console.warn("Send mail error:", response.status, await response.text());
  }
}
