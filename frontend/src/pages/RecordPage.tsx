import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Plus } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { RecordForm } from '@/components/RecordForm';
import { TimeTracker } from '@/components/TimeTracker';
import { Button } from '@/components/ui/button';
import { createTimeRecord, getTimeRecord, updateTimeRecord } from '@/api/timeRecords';
import { RECORD_CARD_HEIGHT_CLASS } from '@/lib/layout';
import { cn } from '@/lib/utils';
import type { TimeRecord, TimeRecordInput } from '@/types/timeRecord';

export function RecordPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditing = Boolean(id);

    const [record, setRecord] = useState<TimeRecord | null>(null);
    const [loading, setLoading] = useState(isEditing);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [showManualForm, setShowManualForm] = useState(false);
    const [showSavedNotice, setShowSavedNotice] = useState(false);

    useEffect(() => {
        if (!id) {
            setRecord(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setLoadError(null);
        getTimeRecord(id)
            .then(setRecord)
            .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load record.'))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (!showSavedNotice) return;
        const timer = setTimeout(() => setShowSavedNotice(false), 3000);
        return () => clearTimeout(timer);
    }, [showSavedNotice]);

    const handleSubmit = async (input: TimeRecordInput) => {
        if (id) {
            await updateTimeRecord(id, input);
        } else {
            await createTimeRecord(input);
        }
        navigate('/dashboard');
    };

    const handleTrackerSave = async (input: TimeRecordInput) => {
        await createTimeRecord(input);
        setShowSavedNotice(true);
    };

    return (
        <>
            <AppLayout fitViewport={!isEditing}>
                <main
                    className={cn(
                        'relative z-10 mx-4 flex-1 sm:mx-8',
                        isEditing ? 'py-14 pb-24' : 'flex h-full min-h-0 flex-col py-10',
                    )}
                >
                    <div
                        className={cn(
                            'mx-auto flex w-full max-w-270 flex-col',
                            isEditing ? 'gap-10' : 'h-full min-h-0 gap-6',
                        )}
                    >
                        <h1 className="shrink-0 text-center text-4xl font-semibold tracking-tight">
                            {isEditing ? 'Edit record' : 'Create your time record'}
                        </h1>

                        {loading ? (
                            <p className="text-base text-muted-foreground">Loading…</p>
                        ) : loadError ? (
                            <p className="text-base text-destructive">{loadError}</p>
                        ) : isEditing ? (
                            <RecordForm
                                editingRecord={record}
                                onSubmit={handleSubmit}
                                onCancel={() => navigate('/dashboard')}
                            />
                        ) : (
                            <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
                                <TimeTracker onSave={handleTrackerSave} />

                                <section
                                    className={cn(
                                        'flex flex-col rounded-lg border-2 border-[#4E1782] bg-surface transition-colors',
                                        RECORD_CARD_HEIGHT_CLASS,
                                    )}
                                >
                                    <div
                                        className={cn(
                                            'flex-1 overflow-y-auto px-6 py-12 sm:px-10 sm:py-16',
                                            showManualForm
                                                ? 'py-8 text-left sm:py-10'
                                                : 'flex items-center justify-center',
                                        )}
                                    >
                                        {showManualForm ? (
                                            <RecordForm
                                                variant="bare"
                                                editingRecord={null}
                                                onSubmit={handleSubmit}
                                                onCancel={() => setShowManualForm(false)}
                                            />
                                        ) : (
                                            <Button
                                                type="button"
                                                size="lg"
                                                variant="outline"
                                                onClick={() => setShowManualForm(true)}
                                                className="h-12 min-w-56 border-2 border-[#4E1782] bg-transparent px-8 text-base text-[#4E1782] hover:bg-[#4E1782]/10 hover:text-[#A855F7]"
                                            >
                                                <Plus className="size-4" />
                                                Add new record
                                            </Button>
                                        )}
                                    </div>
                                </section>
                            </div>
                        )}
                    </div>
                </main>
            </AppLayout>

            {showSavedNotice && (
                <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
                    <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-surface px-5 py-3 text-sm shadow-[0_0_24px_-6px_oklch(0.66_0.21_305_/_0.35)]">
                        <CheckCircle2 className="size-4 shrink-0 text-primary" />
                        <span>
                            Saved.{' '}
                            <Link
                                to="/dashboard"
                                className="font-semibold text-primary underline-offset-2 hover:underline"
                            >
                                View it on the dashboard
                            </Link>
                            .
                        </span>
                    </div>
                </div>
            )}
        </>
    );
}
