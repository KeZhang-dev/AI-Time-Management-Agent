import { useState, type FormEvent } from "react";
import type { TimeRecord, TimeRecordInput } from "../types/timeRecord";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "../lib/datetime";

interface TimeRecordFormProps {
  initialRecord?: TimeRecord;
  onSubmit: (input: TimeRecordInput) => Promise<void>;
  onCancel?: () => void;
}

function defaultDatetimeLocal(offsetMinutes = 0): string {
  const date = new Date(Date.now() + offsetMinutes * 60_000);
  date.setSeconds(0, 0);
  return toDatetimeLocalValue(date.toISOString());
}

export function TimeRecordForm({ initialRecord, onSubmit, onCancel }: TimeRecordFormProps) {
  const [startTime, setStartTime] = useState(
    initialRecord ? toDatetimeLocalValue(initialRecord.startTime) : defaultDatetimeLocal(-60),
  );
  const [endTime, setEndTime] = useState(
    initialRecord ? toDatetimeLocalValue(initialRecord.endTime) : defaultDatetimeLocal(),
  );
  const [category, setCategory] = useState(initialRecord?.category ?? "");
  const [notes, setNotes] = useState(initialRecord?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const startIso = fromDatetimeLocalValue(startTime);
    const endIso = fromDatetimeLocalValue(endTime);
    if (endIso <= startIso) {
      setError("End time must be after start time.");
      return;
    }
    if (!category.trim()) {
      setError("Category is required.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        startTime: startIso,
        endTime: endIso,
        category: category.trim(),
        notes: notes.trim() || null,
      });
      if (!initialRecord) {
        setCategory("");
        setNotes("");
        setStartTime(defaultDatetimeLocal(-60));
        setEndTime(defaultDatetimeLocal());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save time record.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="time-record-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label>
          Start
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </label>
        <label>
          End
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Category
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Work, Sleep, Exercise"
            required
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {initialRecord ? "Save changes" : "Add record"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
