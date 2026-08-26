import type { ReactNode } from 'react';
import { useMillisecondsUntilNextReset } from '@/hooks/useMillisecondsUntilNextReset';
import { formatCountdown, formatHoursAsClock } from '@/lib/datetime';
import type { StatsResponse } from '@/types/timeRecord';

interface KpiRowProps {
  stats: StatsResponse | null;
  recordCount: number;
}

function Kpi({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="px-5.5 py-4.5 first:pl-0 last:pr-0">
      <div className="text-[12px] font-bold tracking-widest text-muted-foreground uppercase">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </div>
    </div>
  );
}

export function KpiRow({ stats, recordCount }: KpiRowProps) {
  const remainingMs = useMillisecondsUntilNextReset();

  return (
    <div className="grid grid-cols-2 divide-x divide-border rounded-lg border border-border bg-surface px-5.5 sm:grid-cols-4">
      <Kpi label="Total tracked" value={stats ? formatHoursAsClock(stats.totalHours) : '—'} />
      <Kpi label="Next reset" value={formatCountdown(remainingMs)} />
      <Kpi label="Records today" value={recordCount} />
      <Kpi label="Categories today" value={stats ? stats.byCategory.length : '—'} />
    </div>
  );
}
