import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StatsResponse } from '@/types/timeRecord';

interface TimeInsightCardProps {
    stats: StatsResponse | null;
}

export function TimeInsightCard({ stats }: TimeInsightCardProps) {
    const topCategory = stats?.byCategory[0];
    const share =
        topCategory && stats && stats.totalHours > 0
            ? Math.round((topCategory.totalHours / stats.totalHours) * 100)
            : null;

    const message =
        topCategory && share !== null
            ? `${topCategory.category} accounts for ${share}% of your tracked time today.`
            : 'Start tracking your time today to see personalized insights here.';

    return (
        <div className="flex flex-col gap-4 rounded-lg border border-primary/30 bg-primary/5 px-5 py-4.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <Sparkles className="size-4 text-primary" />
                </div>
                <div>
                    <div className="text-[12px] font-bold tracking-widest text-primary uppercase">Time insight</div>
                    <p className="mt-1 text-sm text-foreground">{message}</p>
                </div>
            </div>
            <Button
                asChild
                variant="outline"
                size="sm"
                className="shrink-0 self-start border-primary/40 text-primary hover:bg-primary/10 hover:text-primary sm:self-auto"
            >
                <Link to="/solution">
                    Explore with KONER
                    <ArrowRight className="size-3.5" />
                </Link>
            </Button>
        </div>
    );
}
