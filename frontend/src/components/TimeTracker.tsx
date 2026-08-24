import { useState } from 'react';
import { Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTimer } from '@/hooks/useTimer';
import { formatElapsed } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import type { TimeRecordInput } from '@/types/timeRecord';

interface TimeTrackerProps {
    onSave: (input: TimeRecordInput) => Promise<void>;
}

const fieldLabelClass = 'text-sm font-semibold uppercase tracking-widest text-muted-foreground';
const ghostInputClass =
    'h-auto border-0 border-b border-border bg-transparent px-3 py-1.5 shadow-none transition-colors focus-visible:border-b-ring focus-visible:ring-0';

export function TimeTracker({ onSave }: TimeTrackerProps) {
    const { status, elapsedMs, start, pause, resume, computeSpan, reset } = useTimer();
    const [category, setCategory] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleStart = () => {
        if (!category.trim()) return;
        setError(null);
        start();
    };

    const handleStop = async () => {
        if (!category.trim()) {
            setError('Category is required.');
            return;
        }
        const span = computeSpan();
        if (!span) return;

        setError(null);
        setSubmitting(true);
        try {
            await onSave({
                startTime: span.startIso,
                endTime: span.endIso,
                category: category.trim(),
                notes: notes.trim() || null,
            });
            reset();
            setCategory('');
            setNotes('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save time record.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDiscard = () => {
        reset();
        setCategory('');
        setNotes('');
        setError(null);
    };

    if (status === 'idle') {
        return (
            <div className="rounded-lg border-2 border-[#4E1782] bg-surface px-6 py-12 text-center sm:px-10 sm:py-16">
                <p className="text-2xl font-semibold text-foreground">What are you working on?</p>
                <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Work, Sleep, Exercise"
                    className={cn(ghostInputClass, 'mx-auto mt-6 max-w-md py-3 text-center text-3xl font-medium')}
                />
                <Button
                    type="button"
                    size="lg"
                    className="mt-8 h-14 min-w-64 px-10 text-lg"
                    disabled={!category.trim()}
                    onClick={handleStart}
                >
                    <Play className="size-5" />
                    Start tracking
                </Button>
            </div>
        );
    }

    return (
        <div className="rounded-lg border-2 border-[#A855F7] bg-surface px-6 py-12 text-center sm:px-10 sm:py-16">
            <p className={cn(fieldLabelClass, status === 'running' && 'text-primary')}>
                {status === 'running' ? 'Tracking' : 'Paused'}
            </p>
            <p className="mt-4 text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl">
                {formatElapsed(elapsedMs)}
            </p>

            <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Work, Sleep, Exercise"
                className={cn(ghostInputClass, 'mx-auto mt-4 max-w-xs text-center text-lg font-medium')}
            />

            <div className="mt-8 flex items-center justify-center gap-4">
                {status === 'running' ? (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={pause}
                        className="h-14 min-w-40 px-8 text-lg"
                    >
                        <Pause className="size-5" />
                        Pause
                    </Button>
                ) : (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={resume}
                        className="h-14 min-w-40 px-8 text-lg"
                    >
                        <Play className="size-5" />
                        Resume
                    </Button>
                )}
                <Button
                    type="button"
                    onClick={handleStop}
                    disabled={submitting}
                    className="h-14 min-w-40 px-8 text-lg"
                >
                    <Square className="size-5" />
                    Stop
                </Button>
            </div>

            <div className="mt-10 border-t border-border pt-6 text-left">
                <Label htmlFor="tracker-notes" className={fieldLabelClass}>
                    Notes
                </Label>
                <Textarea
                    id="tracker-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add context for this block of time…"
                    rows={7}
                    className="field-sizing-fixed resize-none border-0 bg-transparent px-3 py-1 text-lg shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
                />
            </div>

            {error && <p className="mt-4 text-base text-destructive">{error}</p>}

            <Button
                type="button"
                variant="outline"
                onClick={handleDiscard}
                className="mx-auto mt-6 flex w-full max-w-sm border-primary text-primary hover:bg-primary/10 hover:text-primary"
            >
                Discard session
            </Button>
        </div>
    );
}
