import { useState } from 'react';
import { Send } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';

export function SolutionPage() {
    const [draft, setDraft] = useState('');

    return (
        <AppLayout>
            <main className="relative z-10 mx-auto flex w-full max-w-270 flex-1 flex-col px-7 pt-8 pb-6">
                <div className="flex-1 overflow-y-auto">
                    <div className="mx-auto flex max-w-2xl flex-col gap-4 py-6">
                        <div className="flex items-start gap-3">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
                                <Logo size={16} />
                            </div>
                            <div className="rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-3 text-sm leading-relaxed">
                                Hi! I'm your KONER assistant. Once connected, I'll help you understand
                                how you spend your time, spot patterns, and suggest ways to work more
                                effectively. This is a preview of the chat interface — I can't respond just
                                yet.
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mx-auto w-full max-w-2xl pt-4">
                    <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface px-4 py-3">
                        <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="Ask about your time…"
                            rows={1}
                            className="max-h-40 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                        <Button size="icon-sm" disabled className="shrink-0">
                            <Send className="size-4" />
                        </Button>
                    </div>
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                        Solution is a preview — chat isn't wired up yet.
                    </p>
                </div>
            </main>
        </AppLayout>
    );
}
