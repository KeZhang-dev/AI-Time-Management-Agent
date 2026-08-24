import type { ReactNode } from 'react';
import { AppBackground } from '@/components/AppBackground';
import { AppNav } from '@/components/AppNav';
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
        <div
            className={cn(
                'relative flex flex-col text-foreground',
                fitViewport ? 'h-svh overflow-hidden' : 'min-h-svh',
            )}
        >
            <AppBackground />
            <AppNav />
            {fitViewport ? (
                <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
            ) : (
                children
            )}
        </div>
    );
}
