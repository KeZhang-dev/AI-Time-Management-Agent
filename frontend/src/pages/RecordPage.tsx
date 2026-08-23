import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { RecordForm } from '@/components/RecordForm';
import { createTimeRecord, getTimeRecord, updateTimeRecord } from '@/api/timeRecords';
import type { TimeRecord, TimeRecordInput } from '@/types/timeRecord';

export function RecordPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [record, setRecord] = useState<TimeRecord | null>(null);
    const [loading, setLoading] = useState(Boolean(id));
    const [loadError, setLoadError] = useState<string | null>(null);

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
        <AppLayout>
            <main className="relative z-10 mx-auto w-full max-w-2xl flex-1 px-7 py-10 pb-20">
                <h1 className="mb-1 text-2xl font-semibold tracking-tight">
                    {id ? 'Edit record' : 'New record'}
                </h1>
                <p className="mb-6 text-sm text-muted-foreground">
                    Log a block of time and what it was spent on.
                </p>

                {loading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                ) : loadError ? (
                    <p className="text-sm text-destructive">{loadError}</p>
                ) : (
                    <div className="rounded-lg border border-border bg-surface p-6">
                        <RecordForm
                            editingRecord={record}
                            onSubmit={handleSubmit}
                            onCancel={() => navigate('/dashboard')}
                        />
                    </div>
                )}
            </main>
        </AppLayout>
    );
}
