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

export function formatDurationHours(startIso: string, endIso: string | null): string {
  if (!endIso) return '—';
  const hours =
    (parseISO(endIso).getTime() - parseISO(startIso).getTime()) / 3_600_000;
  return `${hours.toFixed(2)}h`;
}

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
