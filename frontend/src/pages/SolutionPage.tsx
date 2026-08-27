import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { askAi } from '@/api/ai';
import { approveScheduleProposal, cancelScheduleProposal } from '@/api/scheduleProposals';
import type { ScheduleProposal } from '@/types/schedule';
import { cn } from '@/lib/utils';

type ProposalStatus = 'pending' | 'approved' | 'cancelled';

interface ChatMessage {
    id: string;
    role: 'assistant' | 'user';
    content: string;
    proposal?: ScheduleProposal;
    proposalStatus?: ProposalStatus;
}

export function SolutionPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resolvingProposalId, setResolvingProposalId] = useState<string | null>(null);

    const hasConversation = messages.length > 0;

    const sendMessage = async () => {
        const question = draft.trim();
        if (!question || submitting) return;

        setError(null);
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: question }]);
        setDraft('');
        setSubmitting(true);

        try {
            const { response, proposal } = await askAi(question);
            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: response,
                    proposal: proposal ?? undefined,
                    proposalStatus: proposal ? 'pending' : undefined,
                },
            ]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reach the assistant.');
        } finally {
            setSubmitting(false);
        }
    };

    const setProposalStatus = (messageId: string, status: ProposalStatus) => {
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, proposalStatus: status } : m)));
    };

    const handleApprove = async (messageId: string, proposalId: string) => {
        setError(null);
        setResolvingProposalId(proposalId);
        try {
            await approveScheduleProposal(proposalId);
            setProposalStatus(messageId, 'approved');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to apply the schedule.');
        } finally {
            setResolvingProposalId(null);
        }
    };

    const handleCancel = async (messageId: string, proposalId: string) => {
        setError(null);
        setResolvingProposalId(proposalId);
        try {
            await cancelScheduleProposal(proposalId);
            setProposalStatus(messageId, 'cancelled');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to cancel the proposal.');
        } finally {
            setResolvingProposalId(null);
        }
    };

    const handleSend = (e: FormEvent) => {
        e.preventDefault();
        void sendMessage();
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void sendMessage();
        }
    };

    const chatInput = (
        <form
            onSubmit={handleSend}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-5 py-3.5 shadow-[0_0_32px_-12px_oklch(0.66_0.21_305_/_0.35)]"
        >
            <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything…"
                rows={1}
                className="max-h-40 flex-1 resize-none bg-transparent py-1 leading-6 text-base outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" size="icon" disabled={submitting || !draft.trim()} className="shrink-0">
                <Send className="size-4" />
            </Button>
        </form>
    );

    return (
        <AppLayout fitViewport>
            <main
                className={cn(
                    'relative z-10 mx-auto flex h-full w-full max-w-270 flex-1 flex-col px-7 pb-6',
                    hasConversation && 'pt-8',
                )}
            >
                {hasConversation ? (
                    <>
                        <div className="min-h-0 flex-1 overflow-y-auto">
                            <div className="mx-auto flex max-w-2xl flex-col gap-4 py-6">
                                {messages.map((message) =>
                                    message.role === 'assistant' ? (
                                        <div key={message.id} className="flex items-start gap-3">
                                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
                                                <Logo size={16} />
                                            </div>
                                            <div className="flex max-w-[80%] flex-col gap-3">
                                                <div className="rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-3 text-sm leading-relaxed">
                                                    {message.content}
                                                </div>

                                                {message.proposal && (
                                                    <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3.5">
                                                        <p className="text-[11px] font-medium tracking-wide text-primary uppercase">
                                                            Recommended schedule · not yet applied
                                                        </p>
                                                        <p className="mt-1.5 text-sm font-semibold">
                                                            {message.proposal.title}
                                                            <span className="ml-2 font-normal text-muted-foreground">
                                                                {message.proposal.date}
                                                            </span>
                                                        </p>

                                                        <ul className="mt-3 space-y-2.5">
                                                            {message.proposal.items.map((item, index) => (
                                                                <li key={index} className="text-sm">
                                                                    <span className="font-medium tabular-nums">
                                                                        {item.startTime}–{item.endTime}
                                                                    </span>{' '}
                                                                    <span>{item.activity}</span>
                                                                    {item.reason && (
                                                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                                                            {item.reason}
                                                                        </p>
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>

                                                        {message.proposalStatus === 'pending' && (
                                                            <div className="mt-4 flex gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        void handleApprove(message.id, message.proposal!.proposalId)
                                                                    }
                                                                    disabled={resolvingProposalId === message.proposal.proposalId}
                                                                >
                                                                    Apply Schedule
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        void handleCancel(message.id, message.proposal!.proposalId)
                                                                    }
                                                                    disabled={resolvingProposalId === message.proposal.proposalId}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        )}
                                                        {message.proposalStatus === 'approved' && (
                                                            <p className="mt-4 text-sm font-medium text-primary">
                                                                Schedule applied.
                                                            </p>
                                                        )}
                                                        {message.proposalStatus === 'cancelled' && (
                                                            <p className="mt-4 text-sm text-muted-foreground">
                                                                Recommendation cancelled.
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div key={message.id} className="flex justify-end">
                                            <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground">
                                                {message.content}
                                            </div>
                                        </div>
                                    ),
                                )}

                                {submitting && (
                                    <div className="flex items-start gap-3">
                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
                                            <Logo size={16} />
                                        </div>
                                        <div className="rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
                                            Thinking…
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mx-auto w-full max-w-2xl pt-4">
                            {chatInput}
                            {error && <p className="mt-2 text-center text-xs text-destructive">{error}</p>}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center">
                        <div className="flex w-full flex-col items-center text-center">
                            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                                Ready when you are.
                            </h1>
                            <p className="mt-3 text-base text-muted-foreground">
                                Ask KONER about your time, habits, and productivity.
                            </p>
                            <div className="mt-8 w-full sm:w-4/5 sm:min-w-[480px] sm:max-w-4xl">{chatInput}</div>
                            {error && <p className="mt-2 text-center text-xs text-destructive">{error}</p>}
                        </div>
                    </div>
                )}
            </main>
        </AppLayout>
    );
}
