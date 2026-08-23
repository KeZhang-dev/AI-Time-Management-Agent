import { format, parseISO } from 'date-fns';

const DATETIME_LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm";

export function toDatetimeLocalValue(isoString: string): string {
  return format(parseISO(isoString), DATETIME_LOCAL_FORMAT);
}

export function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}

export function formatDisplay(isoString: string): string {
  return format(parseISO(isoString), 'yyyy-MM-dd HH:mm');
}

export function formatDurationHours(startIso: string, endIso: string): string {
  const hours =
    (parseISO(endIso).getTime() - parseISO(startIso).getTime()) / 3_600_000;
  return `${hours.toFixed(2)}h`;
}
