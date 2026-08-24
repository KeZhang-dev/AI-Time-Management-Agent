export interface TimeRecord {
  id: string;
  startTime: string;
  endTime: string | null;
  category: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface TimeRecordInput {
  startTime: string;
  endTime: string | null;
  category: string;
  notes: string | null;
}

export interface CategoryStat {
  category: string;
  totalHours: number;
  recordCount: number;
}

export interface StatsResponse {
  from: string | null;
  to: string | null;
  totalHours: number;
  byCategory: CategoryStat[];
}
