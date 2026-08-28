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
import { startOfTodayIso } from '@/lib/datetime';
import type { StatsResponse, TimeRecord } from '@/types/timeRecord';

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
