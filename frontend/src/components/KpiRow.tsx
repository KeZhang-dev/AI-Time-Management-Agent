import type { ReactNode } from 'react';
import type { StatsResponse } from '@/types/timeRecord';

interface KpiRowProps {
  stats: StatsResponse | null;
  recordCount: number;
}

function Kpi({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: string;
}) {
  return (
    <div className="px-5.5 py-4.5 first:pl-0 last:pr-0">
      <div className="text-[12px] font-bold tracking-widest text-muted-foreground uppercase">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
        {unit && (
          <span className="ml-0.5 text-sm font-medium text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function KpiRow({ stats, recordCount }: KpiRowProps) {
  const topCategory = stats?.byCategory[0];
  const topCategoryShare =
    topCategory && stats && stats.totalHours > 0
      ? Math.round((topCategory.totalHours / stats.totalHours) * 100)
      : null;

  return (
    <div className="mb-11 grid grid-cols-2 divide-x divide-border rounded-lg border border-border bg-surface px-5.5 sm:grid-cols-4">
      <Kpi
        label="Total tracked"
        value={stats ? stats.totalHours.toFixed(1) : '—'}
        unit="h"
      />
      <Kpi label="Records" value={recordCount} sub="all time" />
      <Kpi
        label="Categories"
        value={stats ? stats.byCategory.length : '—'}
        sub="in use"
      />
      <Kpi
        label="Top category"
        value={<span className="text-xl">{topCategory?.category ?? '—'}</span>}
        sub={
          topCategory
            ? `${topCategory.totalHours.toFixed(1)}h · ${topCategoryShare}% of total`
            : 'no data yet'
        }
      />
    </div>
  );
}
