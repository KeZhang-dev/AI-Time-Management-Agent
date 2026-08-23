import type { ReactNode } from 'react';
import { AppBackground } from '@/components/AppBackground';
import { AppNav } from '@/components/AppNav';

interface AppLayoutProps {
    children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    return (
        <div className="relative flex min-h-svh flex-col text-foreground">
            <AppBackground />
            <AppNav />
            {children}
        </div>
    );
}
