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

// === Outlook event sync (write) =================================
// Slot index → start hour (matches the calendar grid)
const SLOT_START_HOURS = [8, 9, 11, 12, 13, 15];

export interface TaskEventInput {
  title: string;
  category: string;
  duration: string;        // e.g. "2h", "30m", "1h 30m"
  notes?: string;
  source?: string;
  weekNumber: number;      // 1-4 (relative to "this week"); we'll resolve to a date
  day: number;             // 0=Mon, 4=Fri
  slot: number;            // 0-5
}

function parseDurationMinutes(d: string): number {
  let m = 0;
  const h = d.match(/(\d+(?:\.\d+)?)\s*h/i);
  const mn = d.match(/(\d+)\s*m/i);
  if (h) m += parseFloat(h[1]) * 60;
  if (mn) m += parseInt(mn[1], 10);
  return m || 30;
}

function getWeekStartLocal(weekNum: number): Date {
  const today = new Date();
  const dayIdx = today.getDay() || 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayIdx + 1);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() + (weekNum - 1) * 7);
  return monday;
}

function buildEventPayload(input: TaskEventInput) {
  const monday = getWeekStartLocal(input.weekNumber);
  const eventDate = new Date(monday);
  eventDate.setDate(monday.getDate() + input.day);

  const startHour = SLOT_START_HOURS[input.slot] ?? 8;
  const start = new Date(eventDate);
  start.setHours(startHour, 0, 0, 0);

  const durationMin = parseDurationMinutes(input.duration);
  const end = new Date(start.getTime() + durationMin * 60_000);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  // Format as YYYY-MM-DDTHH:mm:ss in local time (Graph treats this as the given timeZone)
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;

  const categoryLabel = input.category.charAt(0).toUpperCase() + input.category.slice(1);
  const bodyLines = [
    `<p><strong>MAC Task Manager</strong> &mdash; ${categoryLabel}</p>`,
    input.source ? `<p><em>Source:</em> ${input.source}</p>` : '',
    input.notes ? `<p>${input.notes.replace(/\n/g, '<br>')}</p>` : '',
    `<p style="font-size:11px;color:#888">Auto-created from MAC Task Manager. Editing this event in Outlook will not sync back.</p>`,
  ].filter(Boolean).join('');

  return {
    subject: `[Task] ${input.title}`,
    start: { dateTime: fmt(start), timeZone: tz },
    end:   { dateTime: fmt(end),   timeZone: tz },
    body: { contentType: 'HTML', content: bodyLines },
    showAs: 'busy',
    categories: [`MAC: ${categoryLabel}`],
  };
}

/** Create an Outlook event for a task. Returns the new event id (or null on failure). */
export async function createTaskEvent(
  instance: IPublicClientApplication,
  input: TaskEventInput,
): Promise<string | null> {
  try {
    const token = await getAccessToken(instance);
    const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildEventPayload(input)),
    });
    if (!res.ok) {
      console.warn('createTaskEvent failed', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.id || null;
  } catch (err) {
    console.warn('createTaskEvent error', err);
    return null;
  }
}

/** Update an existing Outlook event when a task changes time/duration/title. */
export async function updateTaskEvent(
  instance: IPublicClientApplication,
  eventId: string,
  input: TaskEventInput,
): Promise<boolean> {
  try {
    const token = await getAccessToken(instance);
    const res = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildEventPayload(input)),
    });
    if (!res.ok) {
      console.warn('updateTaskEvent failed', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.warn('updateTaskEvent error', err);
    return false;
  }
}

/** Delete an Outlook event when a task is removed from the calendar or deleted. */
export async function deleteTaskEvent(
  instance: IPublicClientApplication,
  eventId: string,
): Promise<boolean> {
  try {
    const token = await getAccessToken(instance);
    const res = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok || res.status === 404; // 404 = already gone, treat as success
  } catch (err) {
    console.warn('deleteTaskEvent error', err);
    return false;
  }
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

// === Teams adaptive card delegation ============================
const APP_BASE_URL = 'https://agreeable-rock-082a9c91e.6.azurestaticapps.net';

/** Get the signed-in user's Graph object id (the GUID). */
async function getMyUserId(instance: IPublicClientApplication): Promise<string | null> {
  try {
    const token = await getAccessToken(instance);
    const res = await fetch('https://graph.microsoft.com/v1.0/me?$select=id', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id || null;
  } catch (err) {
    console.warn('getMyUserId failed', err);
    return null;
  }
}

/** Resolve a UPN/email to the user's Graph object id. */
async function getUserIdByEmail(instance: IPublicClientApplication, email: string): Promise<string | null> {
  try {
    const token = await getAccessToken(instance);
    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(email)}?$select=id`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id || null;
  } catch (err) {
    console.warn('getUserIdByEmail failed', err);
    return null;
  }
}

/**
 * Find or create a 1:1 Teams chat between the signed-in user and the assignee.
 * Returns the chat id.
 */
async function getOrCreateOneOnOneChat(
  instance: IPublicClientApplication,
  myUserId: string,
  assigneeUserId: string,
): Promise<string | null> {
  try {
    const token = await getAccessToken(instance);
    const payload = {
      chatType: 'oneOnOne',
      members: [
        {
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: ['owner'],
          'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${myUserId}')`,
        },
        {
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: ['owner'],
          'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${assigneeUserId}')`,
        },
      ],
    };
    const res = await fetch('https://graph.microsoft.com/v1.0/chats', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn('Create chat failed', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.id || null;
  } catch (err) {
    console.warn('getOrCreateOneOnOneChat error', err);
    return null;
  }
}

/**
 * Build the Adaptive Card payload describing a delegated task.
 * Buttons deep-link back to the app with action=accept|decline + the task id.
 */
function buildDelegationCard(opts: {
  taskId: string;
  taskTitle: string;
  toName: string;
  assignedBy: string;
  priority: number;
  due?: string;
  category: string;
  duration?: string;
}) {
  const priorityLabel = opts.priority === 3 ? 'High' : opts.priority === 2 ? 'Medium' : 'Low';
  const priorityColor = opts.priority === 3 ? 'attention' : opts.priority === 2 ? 'warning' : 'good';
  const categoryLabel = opts.category.charAt(0).toUpperCase() + opts.category.slice(1);

  const acceptUrl = `${APP_BASE_URL}/?action=accept&taskId=${encodeURIComponent(opts.taskId)}`;
  const declineUrl = `${APP_BASE_URL}/?action=decline&taskId=${encodeURIComponent(opts.taskId)}`;
  const openUrl = `${APP_BASE_URL}/?taskId=${encodeURIComponent(opts.taskId)}`;

  return {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: 'MAC Task Manager',
        wrap: true,
        weight: 'Bolder',
        color: 'Accent',
        size: 'Small',
        spacing: 'None',
      },
      {
        type: 'TextBlock',
        text: `New task assigned by ${opts.assignedBy}`,
        wrap: true,
        weight: 'Bolder',
        size: 'Medium',
        spacing: 'Small',
      },
      {
        type: 'Container',
        style: 'emphasis',
        bleed: true,
        items: [
          {
            type: 'TextBlock',
            text: opts.taskTitle,
            wrap: true,
            weight: 'Bolder',
            size: 'Large',
          },
        ],
      },
      {
        type: 'FactSet',
        facts: [
          { title: 'Priority', value: priorityLabel },
          { title: 'Category', value: categoryLabel },
          ...(opts.duration ? [{ title: 'Est. Duration', value: opts.duration }] : []),
          ...(opts.due ? [{ title: 'Due', value: opts.due }] : []),
        ],
      },
      {
        type: 'TextBlock',
        text: `Hi ${opts.toName.split(' ')[0] || 'there'} — please review and respond.`,
        wrap: true,
        size: 'Small',
        color: priorityColor,
        isSubtle: true,
      },
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: '✓ Accept',
        url: acceptUrl,
        style: 'positive',
      },
      {
        type: 'Action.OpenUrl',
        title: '✕ Decline',
        url: declineUrl,
        style: 'destructive',
      },
      {
        type: 'Action.OpenUrl',
        title: 'Open in Task Manager',
        url: openUrl,
      },
    ],
  };
}

/**
 * Send a delegation adaptive card to the assignee in a 1:1 Teams chat.
 * Best-effort: silently logs and continues on failure (the email already went out).
 */
export async function sendTeamsDelegationCard(
  instance: IPublicClientApplication,
  assigneeEmail: string,
  cardData: {
    taskId: string;
    taskTitle: string;
    toName: string;
    assignedBy: string;
    priority: number;
    due?: string;
    category: string;
    duration?: string;
  },
): Promise<boolean> {
  try {
    const [myId, theirId] = await Promise.all([
      getMyUserId(instance),
      getUserIdByEmail(instance, assigneeEmail),
    ]);
    if (!myId || !theirId) {
      console.warn('Could not resolve user ids for Teams chat', { myId, theirId });
      return false;
    }

    const chatId = await getOrCreateOneOnOneChat(instance, myId, theirId);
    if (!chatId) return false;

    const card = buildDelegationCard(cardData);
    const token = await getAccessToken(instance);

    const messagePayload = {
      body: {
        contentType: 'html',
        content: `<attachment id="card-1"></attachment>`,
      },
      attachments: [
        {
          id: 'card-1',
          contentType: 'application/vnd.microsoft.card.adaptive',
          contentUrl: null,
          content: JSON.stringify(card),
          name: null,
          thumbnailUrl: null,
        },
      ],
    };

    const res = await fetch(`https://graph.microsoft.com/v1.0/chats/${chatId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(messagePayload),
    });

    if (!res.ok) {
      console.warn('Send Teams card failed', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.warn('sendTeamsDelegationCard error', err);
    return false;
  }
}

/**
 * Send a follow-up confirmation message into the 1:1 chat between the
 * signed-in user and another user. Used when assignee accepts/declines
 * a delegated task to notify the original sender.
 */
export async function sendTeamsConfirmation(
  instance: IPublicClientApplication,
  otherUserEmail: string,
  taskTitle: string,
  outcome: 'accepted' | 'declined',
  fromName: string,
): Promise<boolean> {
  try {
    const [myId, theirId] = await Promise.all([
      getMyUserId(instance),
      getUserIdByEmail(instance, otherUserEmail),
    ]);
    if (!myId || !theirId) return false;

    const chatId = await getOrCreateOneOnOneChat(instance, myId, theirId);
    if (!chatId) return false;

    const token = await getAccessToken(instance);
    const isAccept = outcome === 'accepted';
    const icon = isAccept ? '✅' : '❌';
    const verb = isAccept ? 'accepted' : 'declined';
    const color = isAccept ? '#27ae60' : '#e74c3c';

    const html = `<p><strong style="color:${color}">${icon} ${fromName} ${verb} the task</strong></p><blockquote>${escapeHtml(taskTitle)}</blockquote>`;

    const res = await fetch(`https://graph.microsoft.com/v1.0/chats/${chatId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: { contentType: 'html', content: html } }),
    });
    if (!res.ok) {
      console.warn('sendTeamsConfirmation failed', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.warn('sendTeamsConfirmation error', err);
    return false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
