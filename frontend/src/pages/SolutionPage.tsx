import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { askAi } from '@/api/ai';
import { cn } from '@/lib/utils';

interface ChatMessage {
    id: string;
    role: 'assistant' | 'user';
    content: string;
}

export function SolutionPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hasConversation = messages.length > 0;

    const sendMessage = async () => {
        const question = draft.trim();
        if (!question || submitting) return;

        setError(null);
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: question }]);
        setDraft('');
        setSubmitting(true);

        try {
            const { response } = await askAi(question);
            setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: response }]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reach the assistant.');
        } finally {
            setSubmitting(false);
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
                                            <div className="rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-3 text-sm leading-relaxed">
                                                {message.content}
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
