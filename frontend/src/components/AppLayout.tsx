import type { ReactNode } from 'react';
import { AppBackground } from '@/components/AppBackground';
import { AppSidebar } from '@/components/AppSidebar';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
    children: ReactNode;
    /**
     * When true, locks this page to the viewport height instead of letting the
     * document grow and scroll — no scrollbar appears, page or otherwise, and
     * any overflow is clipped. Default (false) keeps the normal document-level
     * scrolling every other page relies on.
     */
    fitViewport?: boolean;
}

export function AppLayout({ children, fitViewport = false }: AppLayoutProps) {
    return (
        <div className="relative flex min-h-svh text-foreground">
            <AppBackground />
            <AppSidebar />
            <div
                className={cn(
                    'relative z-10 flex min-w-0 flex-1 flex-col',
                    fitViewport ? 'h-svh overflow-hidden' : 'min-h-svh',
                )}
            >
                {fitViewport ? (
                    <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
}
