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
