import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { KpiRow } from '@/components/KpiRow';
import { RecordsTable } from '@/components/RecordsTable';
import { DeleteRecordDialog } from '@/components/DeleteRecordDialog';
import { InsightsPanel } from '@/components/InsightsPanel';
import { useTimeRecords } from '@/hooks/useTimeRecords';
import { getStats } from '@/api/timeRecords';
import type { StatsResponse, TimeRecord } from '@/types/timeRecord';

export function DashboardPage() {
    const navigate = useNavigate();
    const { records, loading, error, removeRecord } = useTimeRecords();

    const [stats, setStats] = useState<StatsResponse | null>(null);
    const [statsError, setStatsError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<TimeRecord | null>(null);

    const refreshStats = useCallback(() => {
        getStats()
            .then(setStats)
            .catch((err) => setStatsError(err instanceof Error ? err.message : 'Failed to load insights.'));
    }, []);

    useEffect(() => {
        refreshStats();
    }, [refreshStats, records]);

    return (
        <AppLayout>
            <main className="relative z-10 mx-auto max-w-270 flex-1 px-7 py-10 pb-20">
                <h1 className="mb-4 text-2xl font-semibold tracking-tight">Overview</h1>

                <KpiRow stats={stats} recordCount={records.length} />

                <section>
                    <h2 className="mb-4 text-2xl font-semibold tracking-tight">Records</h2>
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

                <section className="mt-11">
                    <h2 className="mb-4 text-2xl font-semibold tracking-tight">Time Breakdown</h2>
                    <InsightsPanel stats={stats} error={statsError} />
                </section>
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
