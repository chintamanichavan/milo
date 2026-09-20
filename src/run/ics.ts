import type { Reminder } from './store';

const stamp = (d: Date): string => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

const DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** A recurring calendar entry for the run days — the part of reminders a web app can do. */
export function buildIcs(title: string, reminder: Reminder, weeks = 9): string {
  const [hh, mm] = reminder.time.split(':').map(Number);
  const start = new Date();
  start.setHours(hh, mm, 0, 0);
  const end = new Date(start.getTime() + 45 * 60_000);
  const until = new Date(start.getTime() + weeks * 7 * 86_400_000);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Milo//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@milo`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${reminder.days.map((d) => DAYS[d]).join(',')};UNTIL=${stamp(until)}`,
    `SUMMARY:${title}`,
    'DESCRIPTION:Scheduled in Milo.',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${title}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(name: string, text: string): void {
  const blob = new Blob([text], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const nextRunDay = (reminder: Reminder): Date => {
  const [hh, mm] = reminder.time.split(':').map(Number);
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(hh, mm, 0, 0);
    if (reminder.days.includes(d.getDay()) && d > now) return d;
  }
  return now;
};
