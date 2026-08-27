import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { BarChart3, CalendarClock, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { askAi } from '@/api/ai';
import { getConversation } from '@/api/conversation';
import { approveScheduleProposal, cancelScheduleProposal } from '@/api/scheduleProposals';
import type { ScheduleProposal } from '@/types/schedule';
import type { ActivityOverview, ProposalStatus } from '@/types/conversation';
import { formatHoursAsClock, formatScheduleDate, formatTimeRangeDuration } from '@/lib/datetime';
import { categoryBarColorVar } from '@/lib/categoryColor';
import { cn } from '@/lib/utils';

const CONTENT_MAX_WIDTH = 'max-w-3xl';
const COMPOSER_MAX_TEXTAREA_HEIGHT = 200;

interface ChatMessage {
    id: string;
    role: 'assistant' | 'user';
    content: string;
    overview?: ActivityOverview;
    proposal?: ScheduleProposal;
    proposalStatus?: ProposalStatus;
}

function MarkdownContent({ content }: { content: string }) {
    return (
        <div className="space-y-2 text-sm leading-relaxed">
            <ReactMarkdown
                components={{
                    p: ({ children }) => <p className="leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                    a: ({ children, href }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline underline-offset-2"
                        >
                            {children}
                        </a>
                    ),
                    code: ({ children }) => (
                        <code className="rounded bg-muted px-1 py-0.5 text-[13px]">{children}</code>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}

function OverviewCard({ overview }: { overview: ActivityOverview }) {
    return (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-5 py-4.5">
            <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <BarChart3 className="size-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-bold tracking-widest text-primary uppercase">
                        {overview.label}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {formatHoursAsClock(overview.totalHours)} tracked · {overview.recordCount}{' '}
                        {overview.recordCount === 1 ? 'record' : 'records'}
                    </p>

                    {overview.byCategory.length > 0 && (
                        <>
                            <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-muted">
                                {overview.byCategory.map((c) => (
                                    <div
                                        key={c.category}
                                        className="h-full"
                                        style={{
                                            width: `${overview.totalHours > 0 ? (c.hours / overview.totalHours) * 100 : 0}%`,
                                            backgroundColor: categoryBarColorVar(c.category),
                                        }}
                                    />
                                ))}
                            </div>
                            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                                {overview.byCategory.map((c) => (
                                    <div key={c.category} className="flex items-center gap-1.5 text-xs">
                                        <span
                                            className="size-2 shrink-0 rounded-full"
                                            style={{ backgroundColor: categoryBarColorVar(c.category) }}
                                        />
                                        <span className="font-medium text-foreground">{c.category}</span>
                                        <span className="text-muted-foreground">{formatHoursAsClock(c.hours)}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export function SolutionPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [draft, setDraft] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resolvingProposalId, setResolvingProposalId] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        let cancelled = false;

        getConversation()
            .then((rows) => {
                if (cancelled) return;
                setMessages(
                    rows.map((row) => ({
                        id: row.id,
                        role: row.role,
                        content: row.content,
                        overview: row.overview ?? undefined,
                        proposal: row.proposal ?? undefined,
                        proposalStatus: row.proposalStatus ?? undefined,
                    })),
                );
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to load conversation history.');
                }
            })
            .finally(() => {
                if (!cancelled) setHistoryLoaded(true);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // Auto-grow the composer to fit its content, capped at a reasonable max height -
    // this replaces the browser's default fixed-row textarea box (which showed a
    // scrollbar as soon as text wrapped past one line).
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_TEXTAREA_HEIGHT)}px`;
    }, [draft]);

    const hasConversation = messages.length > 0;

    const sendMessage = async () => {
        const question = draft.trim();
        if (!question || submitting) return;

        setError(null);
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: question }]);
        setDraft('');
        setSubmitting(true);

        try {
            const { response, proposal, overview } = await askAi(question);
            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: response,
                    overview: overview ?? undefined,
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
            className="flex items-end gap-3 rounded-2xl border border-border bg-surface px-5 py-3.5 shadow-[0_0_32px_-12px_oklch(0.66_0.21_305_/_0.35)]"
        >
            <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything…"
                rows={1}
                className="max-h-50 flex-1 resize-none overflow-y-auto bg-transparent py-1 leading-6 text-base outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" size="icon" disabled={submitting || !draft.trim()} className="shrink-0">
                <Send className="size-4" />
            </Button>
        </form>
    );

    return (
        <AppLayout>
            <main
                className={cn(
                    'relative z-10 mx-auto flex w-full max-w-270 flex-1 flex-col px-7 pb-6',
                    hasConversation && 'pt-4',
                )}
            >
                {!historyLoaded ? (
                    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                        Loading conversation…
                    </div>
                ) : hasConversation ? (
                    <>
                        <div className={cn('mx-auto flex w-full flex-1 flex-col gap-4 py-6', CONTENT_MAX_WIDTH)}>
                            {messages.map((message) =>
                                message.role === 'assistant' ? (
                                    <div key={message.id} className="flex items-start gap-3">
                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
                                            <Logo size={16} />
                                        </div>
                                        <div className="flex max-w-[80%] flex-col gap-3">
                                            <div className="rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-3">
                                                <MarkdownContent content={message.content} />
                                            </div>

                                            {message.overview && <OverviewCard overview={message.overview} />}

                                            {message.proposal && (
                                                <div className="rounded-lg border border-primary/30 bg-primary/5 px-5 py-4.5">
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
                                                            <CalendarClock className="size-4 text-primary" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-[12px] font-bold tracking-widest text-primary uppercase">
                                                                Recommended schedule · not yet applied
                                                            </div>
                                                            <div className="mt-1 flex items-baseline justify-between gap-3">
                                                                <p className="truncate text-sm font-semibold text-foreground">
                                                                    {message.proposal.title}
                                                                </p>
                                                                <p className="shrink-0 text-xs text-muted-foreground">
                                                                    {formatScheduleDate(message.proposal.date)}
                                                                </p>
                                                            </div>

                                                            <ol className="mt-4">
                                                                {message.proposal.items.map((item, index) => {
                                                                    const isLast =
                                                                        index === message.proposal!.items.length - 1;
                                                                    return (
                                                                        <li key={index} className="flex gap-3">
                                                                            <div className="flex flex-col items-center">
                                                                                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                                                                                {!isLast && (
                                                                                    <span className="w-px flex-1 bg-primary/25" />
                                                                                )}
                                                                            </div>
                                                                            <div className={cn('min-w-0 flex-1', !isLast && 'pb-4')}>
                                                                                <div className="flex flex-wrap items-baseline gap-x-2">
                                                                                    <span className="text-xs font-medium tabular-nums text-muted-foreground">
                                                                                        {item.startTime}–{item.endTime}
                                                                                    </span>
                                                                                    <span className="text-[11px] text-muted-foreground/70">
                                                                                        {formatTimeRangeDuration(
                                                                                            item.startTime,
                                                                                            item.endTime,
                                                                                        )}
                                                                                    </span>
                                                                                </div>
                                                                                <p className="mt-0.5 text-sm font-semibold text-foreground">
                                                                                    {item.activity}
                                                                                </p>
                                                                                {item.reason && (
                                                                                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                                                                        {item.reason}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ol>

                                                            {message.proposalStatus === 'pending' && (
                                                                <>
                                                                    <p className="mt-1 text-sm font-medium text-foreground">
                                                                        Apply this schedule?
                                                                    </p>
                                                                    <div className="mt-2.5 flex gap-2">
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                void handleApprove(
                                                                                    message.id,
                                                                                    message.proposal!.proposalId,
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                resolvingProposalId ===
                                                                                message.proposal.proposalId
                                                                            }
                                                                        >
                                                                            Apply Schedule
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() =>
                                                                                void handleCancel(
                                                                                    message.id,
                                                                                    message.proposal!.proposalId,
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                resolvingProposalId ===
                                                                                message.proposal.proposalId
                                                                            }
                                                                        >
                                                                            Cancel
                                                                        </Button>
                                                                    </div>
                                                                </>
                                                            )}
                                                            {message.proposalStatus === 'approved' && (
                                                                <p className="mt-1 text-sm font-medium text-primary">
                                                                    Schedule applied.
                                                                </p>
                                                            )}
                                                            {message.proposalStatus === 'cancelled' && (
                                                                <p className="mt-1 text-sm text-muted-foreground">
                                                                    Recommendation cancelled.
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
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

                        <div
                            className={cn(
                                'sticky bottom-0 mx-auto w-full bg-background/85 pt-4 pb-6 backdrop-blur-sm',
                                CONTENT_MAX_WIDTH,
                            )}
                        >
                            {chatInput}
                            {error && <p className="mt-2 text-center text-xs text-destructive">{error}</p>}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center pb-32">
                        <div className="flex w-full flex-col items-center text-center">
                            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                                Ready when you are.
                            </h1>
                            <p className="mt-3 text-base text-muted-foreground">
                                Ask KONER about your time, habits, and productivity.
                            </p>
                            <div className={cn('mt-8 w-full', CONTENT_MAX_WIDTH)}>{chatInput}</div>
                            {error && <p className="mt-2 text-center text-xs text-destructive">{error}</p>}
                        </div>
                    </div>
                )}
            </main>
        </AppLayout>
    );
}
