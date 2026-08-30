import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Logo } from '@/components/Logo';
import Orb from '@/components/Orb';
import { AppBackground } from '@/components/AppBackground';
import { LoggedOutNav } from '@/components/LoggedOutNav';

export function HomePage() {
    return (
        <div className="relative flex min-h-svh flex-col text-foreground">
            <AppBackground />

            <LoggedOutNav />

            <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
                <div className="relative h-56 w-56 sm:h-72 sm:w-72">
                    <Orb hoverIntensity={0.3} rotateOnHover />
                </div>
                <div className="relative z-10 -mt-6 flex flex-col items-center pointer-events-none sm:-mt-24">
                    <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
                        Understand Your Time
                    </h1>
                    <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                        KONER is your intelligent time management agent. It analyzes how you spend your
                        time, identifies patterns and inefficiencies, and provides personalized strategies to
                        help you take control of your time and work more effectively.
                    </p>
                    <Link
                        to="/solution"
                        className="pointer-events-auto mt-10 inline-flex items-center gap-2 text-lg font-bold text-[#A855F7] transition-colors hover:text-[#A855F7]/80"
                    >
                        Get Started
                        <ArrowRight className="size-5" />
                    </Link>
                </div>
            </main>

            <footer className="relative z-10 mt-16 border-t border-[#262626] sm:mt-64">
                <div className="px-8 py-14 sm:px-12 sm:py-16">
                    <div className="mx-auto max-w-270">
                        <div className="flex flex-col gap-10 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
                            <div className="flex items-center justify-center gap-2 sm:justify-start">
                                <Logo size={20} />
                                <span className="text-base font-medium text-foreground">KONER</span>
                            </div>

                            <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-16">
                                <div>
                                    <h3 className="text-base font-semibold text-foreground">Product</h3>
                                    <ul className="mt-4 flex flex-col gap-3">
                                        <li className="text-base text-muted-foreground">KONER Web</li>
                                        <li className="text-base text-muted-foreground">KONER App</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-foreground">Legal &amp; Security</h3>
                                    <ul className="mt-4 flex flex-col gap-3">
                                        <li>
                                            <Link
                                                to="/privacy"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-base text-muted-foreground transition-colors hover:text-foreground"
                                            >
                                                Privacy Policy
                                            </Link>
                                        </li>
                                        <li className="text-base text-muted-foreground">Report Issue</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-foreground">About Us</h3>
                                    <ul className="mt-4 flex flex-col gap-3">
                                        <li>
                                            <a
                                                href="https://www.linkedin.com/in/ke-z-a4739a319/"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-base text-muted-foreground transition-colors hover:text-foreground"
                                            >
                                                kezhangpersonal5@gmail.com
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-[#262626] px-8 py-8 sm:px-12">
                    <p className="text-center text-sm text-muted-foreground">
                        © {new Date().getFullYear()} KONER. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
