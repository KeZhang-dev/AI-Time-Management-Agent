import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { RecordForm } from '@/components/RecordForm';
import { TimeTracker } from '@/components/TimeTracker';
import { Button } from '@/components/ui/button';
import { createTimeRecord, getTimeRecord, updateTimeRecord } from '@/api/timeRecords';
import type { TimeRecord, TimeRecordInput } from '@/types/timeRecord';

export function RecordPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditing = Boolean(id);

    const [record, setRecord] = useState<TimeRecord | null>(null);
    const [loading, setLoading] = useState(isEditing);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [showManualForm, setShowManualForm] = useState(false);
    const manualFormRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (showManualForm) {
            manualFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [showManualForm]);

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

    const handleSubmit = async (input: TimeRecordInput) => {
        if (id) {
            await updateTimeRecord(id, input);
        } else {
            await createTimeRecord(input);
        }
        navigate('/dashboard');
    };

    return (
        <AppLayout fitViewport={!isEditing && !showManualForm}>
            <main className="relative z-10 mx-4 flex-1 py-14 pb-24 sm:mx-8">
                <div className="mx-auto max-w-270">
                    <h1 className="mb-12 text-center text-4xl font-semibold tracking-tight">
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
                        <>
                            <TimeTracker onSave={handleSubmit} />

                            {showManualForm ? (
                                <section ref={manualFormRef} className="mt-10 scroll-mt-8">
                                    <button
                                        type="button"
                                        onClick={() => setShowManualForm(false)}
                                        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        <ArrowLeft className="size-4" />
                                        Back to timer
                                    </button>
                                    <h2 className="mb-4 text-2xl font-semibold tracking-tight">Add new record</h2>
                                    <RecordForm
                                        editingRecord={null}
                                        onSubmit={handleSubmit}
                                        onCancel={() => setShowManualForm(false)}
                                    />
                                </section>
                            ) : (
                                <div className="mt-10 flex justify-center">
                                    <Button
                                        type="button"
                                        size="lg"
                                        onClick={() => setShowManualForm(true)}
                                        className="h-12 min-w-56 bg-[#A855F7] px-8 text-base text-white hover:bg-[#A855F7]/90"
                                    >
                                        <Plus className="size-4" />
                                        Add new record
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </AppLayout>
    );
}
