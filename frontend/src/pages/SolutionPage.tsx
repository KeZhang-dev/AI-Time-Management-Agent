import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { askAi } from '@/api/ai';

interface ChatMessage {
    id: string;
    role: 'assistant' | 'user';
    content: string;
}

const GREETING: ChatMessage = {
    id: 'greeting',
    role: 'assistant',
    content:
        "Hi! I'm your KONER assistant. Ask me about your tracked time — how you're spending it, " +
        'which categories take up the most hours, or anything else your records can answer.',
};

export function SolutionPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
    const [draft, setDraft] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    return (
        <AppLayout>
            <main className="relative z-10 mx-auto flex w-full max-w-270 flex-1 flex-col px-7 pt-8 pb-6">
                <div className="flex-1 overflow-y-auto">
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
                    <form
                        onSubmit={handleSend}
                        className="flex items-end gap-2 rounded-2xl border border-border bg-surface px-4 py-3"
                    >
                        <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about your time…"
                            rows={1}
                            className="max-h-40 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                        <Button type="submit" size="icon-sm" disabled={submitting || !draft.trim()} className="shrink-0">
                            <Send className="size-4" />
                        </Button>
                    </form>
                    {error && <p className="mt-2 text-center text-xs text-destructive">{error}</p>}
                </div>
            </main>
        </AppLayout>
    );
}
