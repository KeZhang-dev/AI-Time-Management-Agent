import { useCallback, useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { KpiRow } from "@/components/KpiRow";
import { RecordsTable } from "@/components/RecordsTable";
import { RecordDialog } from "@/components/RecordDialog";
import { DeleteRecordDialog } from "@/components/DeleteRecordDialog";
import { InsightsPanel } from "@/components/InsightsPanel";
import { useTimeRecords } from "@/hooks/useTimeRecords";
import { getStats } from "@/api/timeRecords";
import type { StatsResponse, TimeRecord } from "@/types/timeRecord";

function App() {
  const { records, loading, error, addRecord, editRecord, removeRecord } = useTimeRecords();

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TimeRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TimeRecord | null>(null);

  const refreshStats = useCallback(() => {
    getStats()
      .then(setStats)
      .catch((err) => setStatsError(err instanceof Error ? err.message : "Failed to load insights."));
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats, records]);

  const openCreateDialog = () => {
    setEditingRecord(null);
    setDialogOpen(true);
  };

  const openEditDialog = (record: TimeRecord) => {
    setEditingRecord(record);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-svh bg-background text-foreground">
      <TopBar onNewRecord={openCreateDialog} />

      <main className="mx-auto max-w-270 px-7 py-10 pb-20">
        <div className="mb-9">
          <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">All-time totals across every recorded entry.</p>
        </div>

        <KpiRow stats={stats} recordCount={records.length} />

        <section>
          <div className="mb-3.5 flex items-center gap-2">
            <h2 className="text-[11px] font-bold tracking-wider text-faint-foreground uppercase">Records</h2>
            <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {records.length}
            </span>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <RecordsTable records={records} onEdit={openEditDialog} onDelete={setDeleteTarget} />
          )}
        </section>

        <section className="mt-11">
          <h2 className="mb-3.5 text-[11px] font-bold tracking-wider text-faint-foreground uppercase">
            Insights by category
          </h2>
          <InsightsPanel stats={stats} error={statsError} />
        </section>
      </main>

      <RecordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingRecord={editingRecord}
        onSubmit={async (input) => {
          if (editingRecord) {
            await editRecord(editingRecord.id, input);
          } else {
            await addRecord(input);
          }
          setDialogOpen(false);
        }}
      />

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
    </div>
  );
}

export default App;
