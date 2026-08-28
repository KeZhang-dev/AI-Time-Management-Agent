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

/** One row in the sidebar's applied-schedule history. */
export interface AppliedScheduleSummary {
  scheduleId: string;
  number: number;
  title: string;
  date: string;
  createdAt: string;
  totalHours: number;
  itemCount: number;
}

export interface AppliedScheduleItem {
  id: string;
  startTime: string;
  endTime: string;
  activity: string;
  description: string | null;
}

export interface AppliedScheduleDetail {
  scheduleId: string;
  title: string;
  date: string;
  createdAt: string;
  totalHours: number;
  items: AppliedScheduleItem[];
}

export interface UpdateAppliedScheduleItem {
  id: string;
  startTime: string;
  endTime: string;
  activity: string;
  description: string | null;
}

export interface UpdateAppliedSchedule {
  title: string;
  date: string;
  items: UpdateAppliedScheduleItem[];
}
