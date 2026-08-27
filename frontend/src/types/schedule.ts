export interface ScheduleItem {
  startTime: string;
  endTime: string;
  activity: string;
  reason: string | null;
}

export interface ScheduleProposal {
  proposalId: string;
  title: string;
  date: string;
  items: ScheduleItem[];
}

export interface ScheduleProposalActionResponse {
  proposalId: string;
  status: string;
  schedule: ScheduleItem[] | null;
}
