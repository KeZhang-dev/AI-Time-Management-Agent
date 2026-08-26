import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { KpiRow } from '@/components/KpiRow';
import { RecordsTable } from '@/components/RecordsTable';
import { DeleteRecordDialog } from '@/components/DeleteRecordDialog';
import { InsightsPanel } from '@/components/InsightsPanel';
import { TimeInsightCard } from '@/components/TimeInsightCard';
import { useTimeRecords } from '@/hooks/useTimeRecords';
import { getStats } from '@/api/timeRecords';
import type { StatsResponse, TimeRecord } from '@/types/timeRecord';

/**
 * Start of the current local calendar day, as an ISO string. This is the Dashboard's
 * 24-hour reset boundary — it only scopes which records are *displayed* here and is
 * recomputed on every refresh, so it naturally rolls over at midnight. It never
 * deletes or modifies the underlying time records, which remain fully intact and
 * queryable (e.g. by the AI) regardless of this view's daily reset.
 */
function startOfTodayIso(): string {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
}

export function DashboardPage() {
    const navigate = useNavigate();
    const { records, loading, error, removeRecord } = useTimeRecords();

    const [stats, setStats] = useState<StatsResponse | null>(null);
    const [statsError, setStatsError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<TimeRecord | null>(null);

    const refreshStats = useCallback(() => {
        getStats({ from: startOfTodayIso() })
            .then(setStats)
            .catch((err) => setStatsError(err instanceof Error ? err.message : 'Failed to load insights.'));
    }, []);

    useEffect(() => {
        refreshStats();
    }, [refreshStats, records]);

    const todayRecordCount = stats ? stats.byCategory.reduce((sum, c) => sum + c.recordCount, 0) : 0;

    return (
        <AppLayout>
            <main className="relative z-10 mx-4 flex-1 py-10 pb-20 sm:mx-8">
                <div className="mx-auto max-w-270">
                    <h1 className="mb-6 text-2xl font-semibold tracking-tight">Overview</h1>

                    <section className="mb-11">
                        <TimeInsightCard stats={stats} />
                    </section>

                    <section className="mb-11">
                        <KpiRow stats={stats} recordCount={todayRecordCount} />
                    </section>

                    <section className="mb-8">
                        <h2 className="mb-4 text-2xl font-semibold tracking-tight">Today's time distribution</h2>
                        <InsightsPanel stats={stats} error={statsError} />
                    </section>

                    <section>
                        <h2 className="mb-4 text-lg font-semibold tracking-tight text-muted-foreground">
                            Recent records
                        </h2>
                        {loading ? (
                            <p className="text-sm text-muted-foreground">Loading…</p>
                        ) : error ? (
                            <p className="text-sm text-destructive">{error}</p>
                        ) : (
                            <RecordsTable
                                records={records}
                                onEdit={(record) => navigate(`/record/${record.id}`)}
                                onDelete={setDeleteTarget}
                            />
                        )}
                    </section>
                </div>
            </main>

            <DeleteRecordDialog
                record={deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                onConfirm={async () => {
                    if (deleteTarget) {
                        await removeRecord(deleteTarget.id);
                        setDeleteTarget(null);
                    }
                }}
            />
        </AppLayout>
    );
}
