import { apiFetch } from './client';
import type { ScheduleProposalActionResponse } from '../types/schedule';

export function approveScheduleProposal(proposalId: string): Promise<ScheduleProposalActionResponse> {
  return apiFetch<ScheduleProposalActionResponse>(`/schedule-proposals/${proposalId}/approve`, {
    method: 'POST',
  });
}

export function cancelScheduleProposal(proposalId: string): Promise<ScheduleProposalActionResponse> {
  return apiFetch<ScheduleProposalActionResponse>(`/schedule-proposals/${proposalId}/cancel`, {
    method: 'POST',
  });
}
