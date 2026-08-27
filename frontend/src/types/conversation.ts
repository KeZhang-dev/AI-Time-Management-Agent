import type { ScheduleProposal } from './schedule';

export interface ActivityCategoryShare {
  category: string;
  hours: number;
  count: number;
}

export interface ActivityOverview {
  label: string;
  totalHours: number;
  recordCount: number;
  byCategory: ActivityCategoryShare[];
}

export type ProposalStatus = 'pending' | 'approved' | 'cancelled';

export interface ConversationMessageDto {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  overview: ActivityOverview | null;
  proposal: ScheduleProposal | null;
  proposalStatus: ProposalStatus | null;
}
