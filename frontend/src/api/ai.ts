import { apiFetch } from './client';
import type { ScheduleProposal } from '../types/schedule';
import type { ActivityOverview } from '../types/conversation';

export interface AiAnalyzeResponse {
  response: string;
  proposal: ScheduleProposal | null;
  overview: ActivityOverview | null;
}

export function askAi(message: string): Promise<AiAnalyzeResponse> {
  return apiFetch<AiAnalyzeResponse>('/ai/analyze', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

/**
 * Proactive daily check-in - server composes the opening message (sleep check-in and/or
 * today's overview) instead of the user typing first. Same response shape as askAi.
 */
export function checkIn(): Promise<AiAnalyzeResponse> {
  return apiFetch<AiAnalyzeResponse>('/ai/checkin', { method: 'POST' });
}
