import { useState } from "react";
import "./App.css";
import { TimeRecordForm } from "./components/TimeRecordForm";
import { TimeRecordList } from "./components/TimeRecordList";
import { StatsPanel } from "./components/StatsPanel";
import { useTimeRecords } from "./hooks/useTimeRecords";
import type { TimeRecord } from "./types/timeRecord";

function App() {
  const { records, loading, error, addRecord, editRecord, removeRecord } = useTimeRecords();
  const [editingRecord, setEditingRecord] = useState<TimeRecord | null>(null);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  const bumpStats = () => setStatsRefreshKey((k) => k + 1);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this time record?")) return;
    await removeRecord(id);
    bumpStats();
  };

  return (
    <div className="app">
      <header>
        <h1>Time Tracker</h1>
      </header>

      <main>
        <section className="panel">
          <h2>{editingRecord ? "Edit record" : "New record"}</h2>
          <TimeRecordForm
            key={editingRecord?.id ?? "new"}
            initialRecord={editingRecord ?? undefined}
            onSubmit={async (input) => {
              if (editingRecord) {
                await editRecord(editingRecord.id, input);
                setEditingRecord(null);
              } else {
                await addRecord(input);
              }
              bumpStats();
            }}
            onCancel={editingRecord ? () => setEditingRecord(null) : undefined}
          />
        </section>

        <section className="panel">
          <h2>Records</h2>
          {loading && <p>Loading...</p>}
          {error && <p className="form-error">{error}</p>}
          {!loading && !error && (
            <TimeRecordList records={records} onEdit={setEditingRecord} onDelete={handleDelete} />
          )}
        </section>

        <section className="panel">
          <h2>Statistics</h2>
          <StatsPanel refreshKey={statsRefreshKey} />
        </section>
      </main>
    </div>
  );
}

export default App;
