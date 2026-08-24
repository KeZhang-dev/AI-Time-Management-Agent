import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { TimeRecord, TimeRecordInput } from '@/types/timeRecord';
import { fromDatetimeLocalValue, toDatetimeLocalValue } from '@/lib/datetime';
import { cn } from '@/lib/utils';

interface RecordFormProps {
    editingRecord?: TimeRecord | null;
    onSubmit: (input: TimeRecordInput) => Promise<void>;
    onCancel?: () => void;
}

function defaultDatetimeLocal(offsetMinutes = 0): string {
    const date = new Date(Date.now() + offsetMinutes * 60_000);
    date.setSeconds(0, 0);
    return toDatetimeLocalValue(date.toISOString());
}

function formatDurationShort(startValue: string, endValue: string): string {
    if (!startValue || !endValue) return '—';
    const startMs = new Date(startValue).getTime();
    const endMs = new Date(endValue).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return '—';
    const totalMinutes = Math.round((endMs - startMs) / 60_000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

const fieldLabelClass = 'text-[11px] font-semibold uppercase tracking-widest text-muted-foreground';
const ghostInputClass =
    'h-auto border-0 border-b border-border bg-transparent px-3 py-1.5 shadow-none transition-colors focus-visible:border-b-ring focus-visible:ring-0';

function TimeField({
    label,
    value,
    onChange,
    align = 'left',
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    align?: 'left' | 'right';
}) {
    return (
        <div className={cn('flex flex-1 flex-col gap-2.5', align === 'right' && 'sm:items-end')}>
            <span className={fieldLabelClass}>{label}</span>
            <Input
                type="datetime-local"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required
                className={cn(
                    ghostInputClass,
                    'w-full text-xl font-semibold tracking-tight tabular-nums sm:text-2xl',
                    align === 'right' && 'text-right',
                )}
            />
        </div>
    );
}

export function RecordForm({ editingRecord, onSubmit, onCancel }: RecordFormProps) {
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [category, setCategory] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setError(null);
        if (editingRecord) {
            setStartTime(toDatetimeLocalValue(editingRecord.startTime));
            setEndTime(toDatetimeLocalValue(editingRecord.endTime));
            setCategory(editingRecord.category);
            setNotes(editingRecord.notes ?? '');
        } else {
            setStartTime(defaultDatetimeLocal(-60));
            setEndTime(defaultDatetimeLocal());
            setCategory('');
            setNotes('');
        }
    }, [editingRecord]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        const startIso = fromDatetimeLocalValue(startTime);
        const endIso = fromDatetimeLocalValue(endTime);
        if (endIso <= startIso) {
            setError('End time must be after start time.');
            return;
        }
        if (!category.trim()) {
            setError('Category is required.');
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
            setError(err instanceof Error ? err.message : 'Failed to save time record.');
        } finally {
            setSubmitting(false);
        }
    };

    const durationLabel = formatDurationShort(startTime, endTime);

    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-border bg-surface px-6 py-8 sm:px-10 sm:py-10"
        >
            <section className="border-b border-border pb-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-12">
                    <TimeField label="Start" value={startTime} onChange={setStartTime} />
                    <TimeField label="End" value={endTime} onChange={setEndTime} align="right" />
                </div>
                <div className="mt-7 flex items-baseline gap-2">
                    <span className={fieldLabelClass}>Duration</span>
                    <span className="text-lg font-semibold tabular-nums text-primary">{durationLabel}</span>
                </div>
            </section>

            <div className="flex flex-col gap-2.5 border-b border-border py-6">
                <Label htmlFor="record-category" className={fieldLabelClass}>
                    Category
                </Label>
                <Input
                    id="record-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Work, Sleep, Exercise"
                    required
                    className={cn(ghostInputClass, 'text-base font-medium')}
                />
            </div>

            <div className="flex flex-col gap-2.5 py-6">
                <Label htmlFor="record-notes" className={fieldLabelClass}>
                    Notes
                </Label>
                <Textarea
                    id="record-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add context for this block of time…"
                    rows={7}
                    className="field-sizing-fixed resize-none border-0 bg-transparent px-3 py-1 text-sm shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
                />
            </div>

            {error && <p className="pt-1 text-sm text-destructive">{error}</p>}

            <div className="mt-3 flex items-center justify-end gap-3 pt-4">
                {onCancel && (
                    <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
                        Cancel
                    </Button>
                )}
                <Button type="submit" disabled={submitting}>
                    {editingRecord ? 'Save changes' : 'Save record'}
                </Button>
            </div>
        </form>
    );
}
