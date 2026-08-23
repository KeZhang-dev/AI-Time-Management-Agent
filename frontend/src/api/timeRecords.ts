import { apiFetch } from './client';
import type {
  CategoryStat,
  StatsResponse,
  TimeRecord,
  TimeRecordInput,
} from '../types/timeRecord';

export interface ListFilters {
  from?: string;
  to?: string;
  category?: string;
}

function buildQuery(filters: ListFilters): string {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.category) params.set('category', filters.category);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function listTimeRecords(
  filters: ListFilters = {},
): Promise<TimeRecord[]> {
  return apiFetch<TimeRecord[]>(`/time-records${buildQuery(filters)}`);
}

export function getTimeRecord(id: string): Promise<TimeRecord> {
  return apiFetch<TimeRecord>(`/time-records/${id}`);
}

export function createTimeRecord(input: TimeRecordInput): Promise<TimeRecord> {
  return apiFetch<TimeRecord>('/time-records', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTimeRecord(
  id: string,
  input: TimeRecordInput,
): Promise<TimeRecord> {
  return apiFetch<TimeRecord>(`/time-records/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteTimeRecord(id: string): Promise<void> {
  return apiFetch<void>(`/time-records/${id}`, { method: 'DELETE' });
}

export function getStats(
  filters: Pick<ListFilters, 'from' | 'to'> = {},
): Promise<StatsResponse> {
  return apiFetch<StatsResponse>(`/time-records/stats${buildQuery(filters)}`);
}

export type { CategoryStat };
