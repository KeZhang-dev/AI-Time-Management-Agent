import { apiFetch } from './client';
import type { AppliedScheduleDetail, AppliedScheduleSummary, UpdateAppliedSchedule } from '../types/schedule';

export function listAppliedSchedules(): Promise<AppliedScheduleSummary[]> {
  return apiFetch<AppliedScheduleSummary[]>('/schedules');
}

export function getAppliedSchedule(scheduleId: string): Promise<AppliedScheduleDetail> {
  return apiFetch<AppliedScheduleDetail>(`/schedules/${scheduleId}`);
}

export function updateAppliedSchedule(
  scheduleId: string,
  dto: UpdateAppliedSchedule,
): Promise<AppliedScheduleDetail> {
  return apiFetch<AppliedScheduleDetail>(`/schedules/${scheduleId}`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
}

export function deleteAppliedSchedule(scheduleId: string): Promise<void> {
  return apiFetch<void>(`/schedules/${scheduleId}`, { method: 'DELETE' });
}
