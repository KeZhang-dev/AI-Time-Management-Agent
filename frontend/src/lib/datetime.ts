import { format, parseISO } from 'date-fns';

const DATETIME_LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm";

export function toDatetimeLocalValue(isoString: string): string {
  return format(parseISO(isoString), DATETIME_LOCAL_FORMAT);
}

export function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}

export function formatDisplay(isoString: string | null): string {
  if (!isoString) return '—';
  return format(parseISO(isoString), 'yyyy-MM-dd HH:mm');
}

export function formatCountdown(remainingMs: number): string {
  const totalMinutes = Math.max(0, Math.ceil(remainingMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatHoursAsClock(totalHours: number): string {
  const totalMinutes = Math.max(0, Math.round(totalHours * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatDurationHours(startIso: string, endIso: string | null): string {
  if (!endIso) return '—';
  const hours =
    (parseISO(endIso).getTime() - parseISO(startIso).getTime()) / 3_600_000;
  return formatHoursAsClock(hours);
}

export function formatScheduleDate(dateOnly: string): string {
  return format(parseISO(dateOnly), 'EEE, d MMM');
}

export function formatTimeRangeDuration(startTime: string, endTime: string): string {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const totalMinutes = endH * 60 + endM - (startH * 60 + startM);
  return formatHoursAsClock(totalMinutes / 60);
}

/**
 * Start of the current local calendar day, as an ISO string. This is the app's
 * shared 24-hour reset boundary — it only scopes what's *displayed* (Dashboard's
 * today view, the Solution chat's visible conversation) and is recomputed on
 * every load, so it naturally rolls over at midnight. It never deletes or
 * modifies any underlying data, which remains fully intact and queryable
 * (e.g. by the AI) regardless of what a given view chooses to show.
 */
export function startOfTodayIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
}

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
