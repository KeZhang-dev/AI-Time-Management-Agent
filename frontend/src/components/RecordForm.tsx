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
    /**
     * 'card' (default) renders its own bordered surface — used on the edit page.
     * 'bare' drops that wrapper so the form can sit inside a parent section
     * that already provides the border/background (e.g. the Add new record section).
     */
    variant?: 'card' | 'bare';
}

type EntryMode = 'end' | 'duration';

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

function computeEndFromDuration(startValue: string, hours: string, minutes: string): string {
    if (!startValue) return '';
    const totalMinutes = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
    if (totalMinutes <= 0) return '';
    const startMs = new Date(startValue).getTime();
    if (!Number.isFinite(startMs)) return '';
    return toDatetimeLocalValue(new Date(startMs + totalMinutes * 60_000).toISOString());
}

const fieldLabelClass = 'text-sm font-semibold uppercase tracking-widest text-muted-foreground';
const ghostInputClass =
    'h-auto border-0 border-b border-border bg-transparent px-3 py-1.5 shadow-none transition-colors focus-visible:border-b-ring focus-visible:ring-0';
const modeToggleClass = (active: boolean) =>
    cn(
        'text-sm font-semibold uppercase tracking-widest transition-colors',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/70',
    );

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <div className="flex flex-1 flex-col gap-2.5">
            <span className={fieldLabelClass}>{label}</span>
            <Input
                type="datetime-local"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required
                className={cn(
                    ghostInputClass,
                    'w-full text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl',
                )}
            />
        </div>
    );
}

export function RecordForm({ editingRecord, onSubmit, onCancel, variant = 'card' }: RecordFormProps) {
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [entryMode, setEntryMode] = useState<EntryMode>('end');
    const [durationHours, setDurationHours] = useState('');
    const [durationMinutes, setDurationMinutes] = useState('');
    const [category, setCategory] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setError(null);
        setEntryMode('end');
        setDurationHours('');
        setDurationMinutes('');
        if (editingRecord) {
            setStartTime(toDatetimeLocalValue(editingRecord.startTime));
            setEndTime(editingRecord.endTime ? toDatetimeLocalValue(editingRecord.endTime) : '');
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
        let endIso: string | null;

        if (entryMode === 'duration') {
            const totalMinutes = (Number(durationHours) || 0) * 60 + (Number(durationMinutes) || 0);
            if (totalMinutes <= 0) {
                setError('Enter a duration greater than zero.');
                return;
            }
            endIso = new Date(new Date(startIso).getTime() + totalMinutes * 60_000).toISOString();
        } else {
            endIso = endTime ? fromDatetimeLocalValue(endTime) : null;
            if (endIso && endIso <= startIso) {
                setError('End time must be after start time.');
                return;
            }
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

    const effectiveEndValue =
        entryMode === 'duration' ? computeEndFromDuration(startTime, durationHours, durationMinutes) : endTime;
    const durationLabel = formatDurationShort(startTime, effectiveEndValue);

    return (
        <form
            onSubmit={handleSubmit}
            className={cn(variant === 'card' && 'rounded-lg border border-border bg-surface px-6 py-8 sm:px-10 sm:py-10')}
        >
            <section className="border-b border-border pb-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-12">
                    <TimeField label="Start" value={startTime} onChange={setStartTime} />

                    <div className="flex flex-1 flex-col gap-2.5">
                        <div className="flex items-center gap-3">
                            <button type="button" className={modeToggleClass(entryMode === 'end')} onClick={() => setEntryMode('end')}>
                                End
                            </button>
                            <span className="text-muted-foreground/40">/</span>
                            <button
                                type="button"
                                className={modeToggleClass(entryMode === 'duration')}
                                onClick={() => setEntryMode('duration')}
                            >
                                Duration
                            </button>
                        </div>

                        {entryMode === 'end' ? (
                            <Input
                                type="datetime-local"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className={cn(
                                    ghostInputClass,
                                    'w-full text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl',
                                )}
                            />
                        ) : (
                            <div className="flex items-baseline gap-4">
                                <div className="flex items-baseline gap-1.5">
                                    <Input
                                        type="number"
                                        min={0}
                                        inputMode="numeric"
                                        value={durationHours}
                                        onChange={(e) => setDurationHours(e.target.value)}
                                        placeholder="0"
                                        className={cn(
                                            ghostInputClass,
                                            'w-16 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl',
                                        )}
                                    />
                                    <span className="text-sm text-muted-foreground">h</span>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                    <Input
                                        type="number"
                                        min={0}
                                        max={59}
                                        inputMode="numeric"
                                        value={durationMinutes}
                                        onChange={(e) => setDurationMinutes(e.target.value)}
                                        placeholder="0"
                                        className={cn(
                                            ghostInputClass,
                                            'w-16 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl',
                                        )}
                                    />
                                    <span className="text-sm text-muted-foreground">m</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {entryMode === 'end' && (
                    <div className="mt-7 flex items-baseline gap-2">
                        <span className={fieldLabelClass}>Duration</span>
                        <span className="text-xl font-semibold tabular-nums text-primary">{durationLabel}</span>
                    </div>
                )}
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
                    className={cn(ghostInputClass, 'text-xl font-medium')}
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
                    className="field-sizing-fixed resize-none border-0 bg-transparent px-3 py-1 text-lg shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
                />
            </div>

            {error && <p className="pt-1 text-base text-destructive">{error}</p>}

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
