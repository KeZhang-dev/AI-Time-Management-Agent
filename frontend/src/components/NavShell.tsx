import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface NavShellProps {
    children: ReactNode;
    className?: string;
}

export function NavShell({ children, className }: NavShellProps) {
    return (
        <div className="sticky top-4 z-20 mx-4 mt-4 sm:mx-8 sm:mt-6">
            <div
                className={cn(
                    'mx-auto flex h-14 max-w-270 items-center justify-between rounded-full border border-border/80 bg-background/70 px-6 backdrop-blur-md shadow-[0_0_24px_-6px_oklch(0.66_0.21_305_/_0.35)]',
                    className,
                )}
            >
                {children}
            </div>
        </div>
    );
}
