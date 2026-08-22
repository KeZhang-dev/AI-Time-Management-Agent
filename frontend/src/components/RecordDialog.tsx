import { useEffect, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TimeRecord, TimeRecordInput } from "@/types/timeRecord";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/datetime";

interface RecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRecord: TimeRecord | null;
  onSubmit: (input: TimeRecordInput) => Promise<void>;
}

function defaultDatetimeLocal(offsetMinutes = 0): string {
  const date = new Date(Date.now() + offsetMinutes * 60_000);
  date.setSeconds(0, 0);
  return toDatetimeLocalValue(date.toISOString());
}

export function RecordDialog({ open, onOpenChange, editingRecord, onSubmit }: RecordDialogProps) {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingRecord) {
      setStartTime(toDatetimeLocalValue(editingRecord.startTime));
      setEndTime(toDatetimeLocalValue(editingRecord.endTime));
      setCategory(editingRecord.category);
      setNotes(editingRecord.notes ?? "");
    } else {
      setStartTime(defaultDatetimeLocal(-60));
      setEndTime(defaultDatetimeLocal());
      setCategory("");
      setNotes("");
    }
  }, [open, editingRecord]);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save time record.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-110">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editingRecord ? "Edit record" : "New record"}</DialogTitle>
            <DialogDescription>Log a block of time and what it was spent on.</DialogDescription>
          </DialogHeader>

          <div className="mt-5 flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="record-start">Start</Label>
                <Input
                  id="record-start"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="record-end">End</Label>
                <Input
                  id="record-end"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="record-category">Category</Label>
              <Input
                id="record-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Work, Sleep, Exercise"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="record-notes">Notes</Label>
              <Textarea
                id="record-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
                rows={3}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className="mt-6 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {editingRecord ? "Save changes" : "Save record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
