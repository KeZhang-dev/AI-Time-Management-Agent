import { CategoryBarChart } from '@/components/CategoryBarChart';
import type { StatsResponse } from '@/types/timeRecord';

interface InsightsPanelProps {
  stats: StatsResponse | null;
  error: string | null;
}

export function InsightsPanel({ stats, error }: InsightsPanelProps) {
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!stats) {
    return <p className="text-sm text-muted-foreground">Loading insights…</p>;
  }

  if (stats.byCategory.length === 0) {
    return (
      <div className="rounded-lg border border-border py-16 text-center text-sm text-muted-foreground">
        No data yet today.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface px-5 py-5">
      <CategoryBarChart data={stats.byCategory} />
    </div>
  );
}
