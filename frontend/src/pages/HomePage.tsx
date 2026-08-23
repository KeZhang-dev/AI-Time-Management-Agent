import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { AppBackground } from '@/components/AppBackground';
import { LoggedOutNav } from '@/components/LoggedOutNav';

export function HomePage() {
    return (
        <div className="relative flex min-h-svh flex-col text-foreground">
            <AppBackground />

            <LoggedOutNav />

            <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
                <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
                    Understand Your Time
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                    Time Tracker is your intelligent time management agent. It analyzes how you spend your
                    time, identifies patterns and inefficiencies, and provides personalized strategies to
                    help you take control of your time and work more effectively.
                </p>
                <Button size="lg" className="mt-10" asChild>
                    <Link to="/dashboard">Get Started</Link>
                </Button>
            </main>

            <footer className="relative z-10 flex flex-col items-center gap-3 border-t border-border px-8 py-8 sm:flex-row sm:justify-between sm:px-12">
                <div className="flex items-center gap-2">
                    <Logo size={20} />
                    <span className="text-sm font-medium text-muted-foreground">Time Tracker</span>
                </div>
                <p className="text-sm text-muted-foreground">
                    © {new Date().getFullYear()} Time Tracker. All rights reserved.
                </p>
            </footer>
        </div>
    );
}
