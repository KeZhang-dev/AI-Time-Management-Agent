import { useEffect, useState } from "react";
import { getStats } from "../api/timeRecords";
import type { StatsResponse } from "../types/timeRecord";

interface StatsPanelProps {
  refreshKey: number;
}

export function StatsPanel({ refreshKey }: StatsPanelProps) {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load stats."));
  }, [refreshKey]);

  if (error) return <p className="form-error">{error}</p>;
  if (!stats) return <p>Loading stats...</p>;

  return (
    <div className="stats-panel">
      <p className="stats-total">
        Total tracked: <strong>{stats.totalHours}h</strong>
      </p>
      {stats.byCategory.length === 0 ? (
        <p className="empty-state">No data yet.</p>
      ) : (
        <ul className="stats-breakdown">
          {stats.byCategory.map((c) => (
            <li key={c.category}>
              <span>{c.category}</span>
              <span>
                {c.totalHours}h ({c.recordCount} {c.recordCount === 1 ? "record" : "records"})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
