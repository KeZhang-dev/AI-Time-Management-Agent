import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { BarChart3, CalendarClock, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
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
import { askAi } from '@/api/ai';
import { getConversation } from '@/api/conversation';
import { approveScheduleProposal, cancelScheduleProposal } from '@/api/scheduleProposals';
import { useAuth } from '@/context/AuthContext';
import type { ScheduleProposal } from '@/types/schedule';
import type { ActivityOverview, ProposalStatus } from '@/types/conversation';
import { formatHoursAsClock, formatScheduleDate, formatTimeRangeDuration } from '@/lib/datetime';
import { categoryBarColorVar } from '@/lib/categoryColor';
import { onNewChatRequested } from '@/lib/newChatSignal';
import { notifyScheduleApplied } from '@/lib/scheduleAppliedSignal';
import { cn } from '@/lib/utils';

const CONTENT_MAX_WIDTH = 'max-w-3xl';
const COMPOSER_MAX_TEXTAREA_HEIGHT = 200;

/**
 * A genuine rolling window - a message stays visible for a full 24 hours after
 * it was sent, no matter what time of day it happened to be created. (An
 * earlier version anchored this to local midnight instead, which meant a chat
 * could vanish after being alive for as little as a few minutes if it started
 * shortly before the boundary - that was the bug.)
 */
const ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000;

const messagesCacheKey = (userId: string) => `koner-solution-messages:${userId}`;
const resetKey = (userId: string) => `koner-solution-chat-reset-at:${userId}`;

/**
 * The actual root cause of the "disappears after Dashboard -> Solution" bug:
 * SolutionPage fully unmounts on route change (a different <Route>), so all of
 * its React state - including `messages` - is discarded. Coming back remounted
 * a fresh component that had nothing to show until a brand-new network fetch
 * completed, and if that fetch was ever slow, raced with something else, or
 * failed, the user saw an empty chat instead. None of that was about the 24h
 * math (which was already correct) - it was that the UI had no way to survive
 * a remount without depending on the network.
 *
 * The fix: cache the currently-displayed conversation in localStorage (per
 * user) and restore it *synchronously* when the component mounts, before any
 * fetch happens. A remount is then instant and never empty. The server is
 * still consulted in the background to reconcile (pick up the 24h/New Chat
 * boundary, refreshed proposal statuses, etc.), but a failed or slow fetch can
 * only leave the cached view as-is - it can never blank it out.
 */
function readCachedMessages(userId: string): ChatMessage[] | null {
    try {
        const raw = window.localStorage.getItem(messagesCacheKey(userId));
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as ChatMessage[]) : null;
    } catch {
        return null;
    }
}

function writeCachedMessages(userId: string, messages: ChatMessage[]): void {
    try {
        window.localStorage.setItem(messagesCacheKey(userId), JSON.stringify(messages));
    } catch {
        // Best-effort (private browsing, quota, etc.) - never block the UI for this.
    }
}

/** 0 if this user has never triggered a reset (manual or automatic) yet. */
function readLastResetMs(userId: string): number {
    const stored = window.localStorage.getItem(resetKey(userId));
    if (!stored) return 0;
    const parsed = new Date(stored).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
}

function buildTranscript(messages: { role: 'user' | 'assistant'; content: string }[]): string {
    return messages.map((m) => `${m.role === 'user' ? 'User' : 'KONER'}: ${m.content}`).join('\n');
}

function buildSummaryInstruction(messages: { role: 'user' | 'assistant'; content: string }[], reason: string): string {
    return (
        `${reason} Review the transcript below and, only if there is something genuinely durable ` +
        'worth remembering (a stated preference, a recurring habit, or a long-term goal), call ' +
        'save_user_memory to save it - concise, one fact per call. Do not save temporary task ' +
        "details, greetings, one-off requests, or the transcript itself. If nothing durable came " +
        'up, don\'t call save_user_memory at all. Do not reply with a normal conversational message ' +
        '- a brief acknowledgement is enough.\n\n--- Conversation transcript ---\n' +
        buildTranscript(messages)
    );
}

interface ChatMessage {
    id: string;
    role: 'assistant' | 'user';
    content: string;
    createdAt: string;
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
    const { user } = useAuth();
    const userId = user?.id ?? null;

    // Synchronous restore from cache - runs before the first paint, so a
    // remount (e.g. Solution -> Dashboard -> Solution) never shows an empty
    // or loading chat while a network fetch catches up. `null` means "never
    // cached" (brand new session), which is the only case that still needs
    // to wait on the initial fetch.
    const [messages, setMessages] = useState<ChatMessage[]>(() => (userId ? (readCachedMessages(userId) ?? []) : []));
    const [historyLoaded, setHistoryLoaded] = useState(() => (userId ? readCachedMessages(userId) !== null : false));
    const [draft, setDraft] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resolvingProposalId, setResolvingProposalId] = useState<string | null>(null);
    const [showNewChatConfirm, setShowNewChatConfirm] = useState(false);
    const [startingNewChat, setStartingNewChat] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Keep the cache in lockstep with whatever is actually on screen - every
    // send, proposal-status update, reconciliation, or New Chat clear.
    useEffect(() => {
        if (!userId) return;
        writeCachedMessages(userId, messages);
    }, [userId, messages]);

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;

        (async () => {
            try {
                const rows = await getConversation();
                if (cancelled) return;

                // The Solution chat shows a message for a rolling 24 hours after it was
                // sent, or until the user explicitly starts a new chat - whichever comes
                // first. This only affects what's displayed here - nothing is deleted,
                // and older messages (along with all TimeRecords, Memory, Schedules, and
                // ScheduleProposals) remain fully intact and queryable.
                const lastResetMs = readLastResetMs(userId);
                const rollingBoundaryMs = Date.now() - ROLLING_WINDOW_MS;

                // If the last reset (manual or automatic) is itself now more than 24h
                // old, a new natural expiry window has opened: everything between that
                // old reset point and today's rolling boundary just aged out. Summarize
                // it to memory before it disappears, then advance the marker so this
                // doesn't repeat on every subsequent load.
                if (lastResetMs < rollingBoundaryMs) {
                    const newlyExpired = rows.filter((row) => {
                        const t = new Date(row.createdAt).getTime();
                        return t >= lastResetMs && t < rollingBoundaryMs;
                    });

                    if (newlyExpired.length > 0) {
                        try {
                            await askAi(
                                buildSummaryInstruction(
                                    newlyExpired,
                                    'This conversation is more than 24 hours old and is about to be cleared from view.',
                                ),
                            );
                        } catch {
                            // Best-effort - an automatic reset must never get stuck because
                            // the summary call failed.
                        }
                        window.localStorage.setItem(resetKey(userId), new Date().toISOString());
                    }
                }

                if (cancelled) return;

                const boundaryMs = Math.max(readLastResetMs(userId), rollingBoundaryMs);
                const currentRows = rows.filter((row) => new Date(row.createdAt).getTime() >= boundaryMs);

                // This is a reconciliation, not the source of truth for "did my chat
                // survive a remount" - that's already guaranteed by the synchronous
                // cache restore above. This just brings the view up to date with
                // anything the server knows that the cache doesn't yet (a message
                // sent from another tab, a proposal Approved/Cancelled elsewhere, or
                // an actual 24h/New Chat boundary having been crossed).
                setMessages(
                    currentRows.map((row) => ({
                        id: row.id,
                        role: row.role,
                        content: row.content,
                        createdAt: row.createdAt,
                        overview: row.overview ?? undefined,
                        proposal: row.proposal ?? undefined,
                        proposalStatus: row.proposalStatus ?? undefined,
                    })),
                );
            } catch (err) {
                // Deliberately do NOT clear `messages` here. A failed background
                // fetch must leave whatever is already cached/displayed untouched -
                // that's the whole point of restoring from cache first.
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to refresh conversation history.');
                }
            } finally {
                if (!cancelled) setHistoryLoaded(true);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [userId]);

    // Auto-grow the composer to fit its content, capped at a reasonable max height -
    // this replaces the browser's default fixed-row textarea box (which showed a
    // scrollbar as soon as text wrapped past one line).
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_TEXTAREA_HEIGHT)}px`;
    }, [draft]);

    // Triggered by the sidebar's "New Chat" button (only shown while on this page).
    useEffect(() => onNewChatRequested(() => setShowNewChatConfirm(true)), []);

    // Keep the viewport pinned to the latest message - both right after a
    // restored conversation renders (e.g. Solution -> Dashboard -> Solution)
    // and during normal chat (new message sent, reply arrives, "Thinking…"
    // appears/disappears). The page scrolls at the document level (no inner
    // overflow container), so this scrolls the whole window. requestAnimationFrame
    // defers it until after the browser has actually laid out the update this
    // effect is reacting to, rather than racing the render.
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            window.scrollTo({ top: document.documentElement.scrollHeight });
        });
        return () => cancelAnimationFrame(frame);
    }, [messages, submitting, historyLoaded]);

    const hasConversation = messages.length > 0;

    const handleStartNewChat = async () => {
        setStartingNewChat(true);
        setError(null);

        if (messages.length > 0) {
            const summaryInstruction = buildSummaryInstruction(
                messages,
                'The user just clicked "New Chat", ending this conversation.',
            );

            try {
                await askAi(summaryInstruction);
            } catch {
                // Best-effort: saving a memory summary should never block starting a new chat.
                setError('Could not save a summary of that conversation to memory, but your new chat has started.');
            }
        }

        if (userId) window.localStorage.setItem(resetKey(userId), new Date().toISOString());
        setMessages([]);
        setStartingNewChat(false);
        setShowNewChatConfirm(false);
    };

    const sendMessage = async () => {
        const question = draft.trim();
        if (!question || submitting) return;

        setError(null);
        setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: 'user', content: question, createdAt: new Date().toISOString() },
        ]);
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
                    createdAt: new Date().toISOString(),
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
            notifyScheduleApplied();
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

            <AlertDialog
                open={showNewChatConfirm}
                onOpenChange={(open) => !startingNewChat && setShowNewChatConfirm(open)}
            >
                <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Start a new chat?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will end your current conversation and save any useful long-term
                            details from it — like preferences, habits, or goals — to memory. Your time
                            records, memory, and schedules stay exactly as they are.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={startingNewChat}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={startingNewChat}
                            onClick={(e) => {
                                e.preventDefault();
                                void handleStartNewChat();
                            }}
                        >
                            {startingNewChat ? 'Starting…' : 'Start New Chat'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
