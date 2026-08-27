import { apiFetch } from './client';
import type { ScheduleProposal } from '../types/schedule';

export interface AiAnalyzeResponse {
  response: string;
  proposal: ScheduleProposal | null;
}

export function askAi(message: string): Promise<AiAnalyzeResponse> {
  return apiFetch<AiAnalyzeResponse>('/ai/analyze', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}
