import { apiFetch } from './client';

export interface AiAnalyzeResponse {
  response: string;
}

export function askAi(message: string): Promise<AiAnalyzeResponse> {
  return apiFetch<AiAnalyzeResponse>('/ai/analyze', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}
