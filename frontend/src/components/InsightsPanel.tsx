import type { StatsResponse } from "@/types/timeRecord";
import { categoryBarColorVar } from "@/lib/categoryColor";

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
        No data yet.
      </div>
    );
  }

  const maxHours = stats.byCategory[0]?.totalHours || 1;

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface px-5 py-4.5">
      {stats.byCategory.map((c) => (
        <div key={c.category} className="grid grid-cols-[minmax(0,120px)_1fr_64px] items-center gap-3.5">
          <span className="truncate text-sm font-medium">{c.category}</span>
          <div className="h-1.75 overflow-hidden rounded-full border border-border bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((c.totalHours / maxHours) * 100, 3)}%`,
                backgroundColor: categoryBarColorVar(c.category),
              }}
            />
          </div>
          <span className="text-right text-sm tabular-nums text-muted-foreground">{c.totalHours.toFixed(1)}h</span>
        </div>
      ))}
    </div>
  );
}
