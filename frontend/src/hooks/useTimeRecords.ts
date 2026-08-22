import { useCallback, useEffect, useState } from "react";
import * as api from "../api/timeRecords";
import type { TimeRecord, TimeRecordInput } from "../types/timeRecord";

export function useTimeRecords() {
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listTimeRecords();
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load time records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addRecord = useCallback(
    async (input: TimeRecordInput) => {
      await api.createTimeRecord(input);
      await refresh();
    },
    [refresh],
  );

  const editRecord = useCallback(
    async (id: string, input: TimeRecordInput) => {
      await api.updateTimeRecord(id, input);
      await refresh();
    },
    [refresh],
  );

  const removeRecord = useCallback(
    async (id: string) => {
      await api.deleteTimeRecord(id);
      await refresh();
    },
    [refresh],
  );

  return { records, loading, error, refresh, addRecord, editRecord, removeRecord };
}
