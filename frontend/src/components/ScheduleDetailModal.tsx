import { useEffect, useState } from 'react';
import { CalendarClock, Pencil, Trash2, X } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { deleteAppliedSchedule, getAppliedSchedule, updateAppliedSchedule } from '@/api/schedules';
import { formatCreatedDate, formatHoursAsClock, formatScheduleDate, formatTimeRangeDuration } from '@/lib/datetime';
import type { AppliedScheduleDetail, UpdateAppliedScheduleItem } from '@/types/schedule';

interface ScheduleDetailModalProps {
    scheduleId: string | null;
    onOpenChange: (open: boolean) => void;
    onChanged: () => void;
}

interface EditState {
    title: string;
    date: string;
    items: UpdateAppliedScheduleItem[];
}

function toEditState(detail: AppliedScheduleDetail): EditState {
    return {
        title: detail.title,
        date: detail.date,
        items: detail.items.map((item) => ({
            id: item.id,
            startTime: item.startTime,
            endTime: item.endTime,
            activity: item.activity,
            description: item.description,
        })),
    };
}

function totalHoursOf(items: UpdateAppliedScheduleItem[]): number {
    return items.reduce((sum, item) => {
        const [startH, startM] = item.startTime.split(':').map(Number);
        const [endH, endM] = item.endTime.split(':').map(Number);
        let minutes = endH * 60 + endM - (startH * 60 + startM);
        if (minutes <= 0) minutes += 24 * 60;
        return sum + minutes / 60;
    }, 0);
}

export function ScheduleDetailModal({ scheduleId, onOpenChange, onChanged }: ScheduleDetailModalProps) {
    const [detail, setDetail] = useState<AppliedScheduleDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [edit, setEdit] = useState<EditState | null>(null);
    const [saving, setSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!scheduleId) {
            setDetail(null);
            setEditing(false);
            setEdit(null);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);
        getAppliedSchedule(scheduleId)
            .then((d) => setDetail(d))
            .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load schedule.'))
            .finally(() => setLoading(false));
    }, [scheduleId]);

    const startEditing = () => {
        if (!detail) return;
        setEdit(toEditState(detail));
        setEditing(true);
        setError(null);
    };

    const cancelEditing = () => {
        setEditing(false);
        setEdit(null);
        setError(null);
    };

    const updateItem = (index: number, patch: Partial<UpdateAppliedScheduleItem>) => {
        setEdit((prev) => {
            if (!prev) return prev;
            const items = prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item));
            return { ...prev, items };
        });
    };

    const handleSave = async () => {
        if (!edit || !scheduleId) return;
        setSaving(true);
        setError(null);
        try {
            const updated = await updateAppliedSchedule(scheduleId, edit);
            setDetail(updated);
            setEditing(false);
            setEdit(null);
            onChanged();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!scheduleId) return;
        setDeleting(true);
        setError(null);
        try {
            await deleteAppliedSchedule(scheduleId);
            setShowDeleteConfirm(false);
            onOpenChange(false);
            onChanged();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete the schedule.');
            setDeleting(false);
        }
    };

    return (
        <>
            <Dialog
                open={scheduleId !== null}
                onOpenChange={(open) => {
                    if (!open && (saving || deleting)) return;
                    onOpenChange(open);
                }}
            >
                <DialogContent className="max-h-[85vh] overflow-y-auto scrollbar-subtle sm:max-w-3xl">
                    <DialogHeader>
                        <div className="flex items-start gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
                                <CalendarClock className="size-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                                {editing && edit ? (
                                    <Input
                                        value={edit.title}
                                        onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                                        placeholder="Schedule title"
                                        className="text-base font-semibold"
                                    />
                                ) : (
                                    <DialogTitle className="truncate">{detail?.title ?? 'Schedule'}</DialogTitle>
                                )}
                                {detail && !editing && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {formatCreatedDate(detail.createdAt)}
                                    </p>
                                )}
                            </div>
                        </div>
                    </DialogHeader>

                    {loading && <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>}

                    {error && (
                        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {error}
                        </p>
                    )}

                    {detail && !loading && (
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between gap-3">
                                {editing && edit ? (
                                    <Input
                                        type="date"
                                        value={edit.date}
                                        onChange={(e) => setEdit({ ...edit, date: e.target.value })}
                                        className="w-auto"
                                    />
                                ) : (
                                    <p className="text-sm font-medium text-foreground">
                                        {formatScheduleDate(detail.date)}
                                    </p>
                                )}
                                <p className="shrink-0 text-xs text-muted-foreground">
                                    Total: {formatHoursAsClock(editing && edit ? totalHoursOf(edit.items) : detail.totalHours)}
                                </p>
                            </div>

                            <ol className="flex flex-col gap-4">
                                {(editing && edit ? edit.items : detail.items).map((item, index) => {
                                    return (
                                        <li key={item.id} className="rounded-lg border border-border/60 bg-surface/60 px-4 py-3">
                                            {editing && edit ? (
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="time"
                                                            value={item.startTime}
                                                            onChange={(e) => updateItem(index, { startTime: e.target.value })}
                                                            className="w-auto"
                                                        />
                                                        <span className="text-xs text-muted-foreground">to</span>
                                                        <Input
                                                            type="time"
                                                            value={item.endTime}
                                                            onChange={(e) => updateItem(index, { endTime: e.target.value })}
                                                            className="w-auto"
                                                        />
                                                        <span className="ml-auto text-[11px] text-muted-foreground/70">
                                                            {formatTimeRangeDuration(item.startTime, item.endTime)}
                                                        </span>
                                                    </div>
                                                    <Input
                                                        value={item.activity}
                                                        onChange={(e) => updateItem(index, { activity: e.target.value })}
                                                        placeholder="Activity"
                                                    />
                                                    <Textarea
                                                        value={item.description ?? ''}
                                                        onChange={(e) => updateItem(index, { description: e.target.value || null })}
                                                        placeholder="Description (optional)"
                                                        className="min-h-12 text-sm"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-baseline gap-x-2">
                                                        <span className="text-xs font-medium tabular-nums text-muted-foreground">
                                                            {item.startTime}–{item.endTime}
                                                        </span>
                                                        <span className="text-[11px] text-muted-foreground/70">
                                                            {formatTimeRangeDuration(item.startTime, item.endTime)}
                                                        </span>
                                                    </div>
                                                    <p className="mt-0.5 text-sm font-semibold text-foreground">{item.activity}</p>
                                                    {item.description && (
                                                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ol>

                            <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-4">
                                {editing ? (
                                    <div className="flex w-full justify-end gap-2">
                                        <Button variant="outline" size="sm" onClick={cancelEditing} disabled={saving}>
                                            <X className="size-4" />
                                            Cancel
                                        </Button>
                                        <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
                                            {saving ? 'Saving…' : 'Save changes'}
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => setShowDeleteConfirm(true)}
                                        >
                                            <Trash2 className="size-4" />
                                            Delete
                                        </Button>
                                        <Button size="sm" onClick={startEditing}>
                                            <Pencil className="size-4" />
                                            Edit
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={showDeleteConfirm} onOpenChange={(open) => !deleting && setShowDeleteConfirm(open)}>
                <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this schedule?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={deleting}
                            onClick={(e) => {
                                e.preventDefault();
                                void handleDelete();
                            }}
                        >
                            {deleting ? 'Deleting…' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
