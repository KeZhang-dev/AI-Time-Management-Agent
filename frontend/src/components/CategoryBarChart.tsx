import { categoryBarColorVar } from '@/lib/categoryColor';
import { formatHoursAsClock } from '@/lib/datetime';
import type { CategoryStat } from '@/types/timeRecord';

interface CategoryBarChartProps {
    /** Expected pre-sorted descending by totalHours (the backend already returns it this way). */
    data: CategoryStat[];
}

export function CategoryBarChart({ data }: CategoryBarChartProps) {
    const maxHours = data[0]?.totalHours || 1;

    return (
        <ul className="flex flex-col gap-3.5">
            {data.map((c) => {
                const widthPct = c.totalHours > 0 ? Math.max((c.totalHours / maxHours) * 100, 3) : 0;
                return (
                    <li
                        key={c.category}
                        className="grid grid-cols-[minmax(0,5.5rem)_1fr_auto] items-center gap-3 sm:grid-cols-[minmax(0,8rem)_1fr_auto]"
                    >
                        <span className="truncate text-[15px] font-medium">{c.category}</span>
                        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full transition-[width]"
                                style={{ width: `${widthPct}%`, backgroundColor: categoryBarColorVar(c.category) }}
                            />
                        </div>
                        <span className="shrink-0 text-right text-[15px] tabular-nums text-muted-foreground">
                            {formatHoursAsClock(c.totalHours)}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}
