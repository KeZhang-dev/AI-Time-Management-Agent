import { useEffect, useState, type ComponentType } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    CalendarClock,
    ChevronsUpDown,
    ClipboardList,
    HelpCircle,
    LayoutDashboard,
    LogOut,
    PanelLeft,
    PanelLeftClose,
    Plus,
    Sparkles,
    User,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { ScheduleDetailModal } from '@/components/ScheduleDetailModal';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { listAppliedSchedules } from '@/api/schedules';
import { useAuth } from '@/context/AuthContext';
import { requestNewChat } from '@/lib/newChatSignal';
import { onScheduleApplied } from '@/lib/scheduleAppliedSignal';
import { cn } from '@/lib/utils';
import type { AppliedScheduleSummary } from '@/types/schedule';

interface NavItem {
    to: string;
    label: string;
    /** Swap this for a custom icon component whenever you're ready. */
    icon: ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
    { to: '/record', label: 'Record', icon: ClipboardList },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/solution', label: 'Solution', icon: Sparkles },
];

const SIDEBAR_COLLAPSED_KEY = 'koner-sidebar-collapsed';

function initialsFor(username: string): string {
    return username.slice(0, 2).toUpperCase();
}

function getInitialCollapsed(): boolean {
    if (typeof window === 'undefined') return false;
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(max-width: 768px)').matches;
}

export function AppSidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(getInitialCollapsed);
    const [schedules, setSchedules] = useState<AppliedScheduleSummary[]>([]);
    const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);

    const refreshSchedules = () => {
        if (!user) return;
        listAppliedSchedules()
            .then(setSchedules)
            .catch(() => {
                /* sidebar list is non-critical - silently keep the previous state */
            });
    };

    useEffect(() => {
        refreshSchedules();
        return onScheduleApplied(refreshSchedules);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const toggleCollapsed = () => {
        setCollapsed((prev) => {
            const next = !prev;
            window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
            return next;
        });
    };

    const handleLogout = () => {
        navigate('/');
        logout();
    };

    return (
        <>
        <aside
            className={cn(
                'sticky top-0 z-20 flex h-svh shrink-0 flex-col border-r border-border/60 bg-background/40 shadow-[6px_0_28px_-10px_oklch(0.66_0.21_305_/_0.25)] backdrop-blur-sm transition-[width] duration-200 ease-out',
                collapsed ? 'w-[72px]' : 'w-64',
            )}
        >
            <div className={cn('flex h-16 shrink-0 items-center gap-2 px-4', collapsed && 'justify-center px-0')}>
                <Link to="/record" className="flex min-w-0 items-center gap-2.5 overflow-hidden">
                    <Logo size={28} className="shrink-0" />
                    {!collapsed && <span className="truncate text-lg font-medium tracking-wide">KONER</span>}
                </Link>
                {!collapsed && (
                    <button
                        type="button"
                        onClick={toggleCollapsed}
                        aria-label="Collapse sidebar"
                        className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                        <PanelLeftClose className="size-4" />
                    </button>
                )}
            </div>

            {collapsed && (
                <button
                    type="button"
                    onClick={toggleCollapsed}
                    aria-label="Expand sidebar"
                    className="mx-auto mb-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                    <PanelLeft className="size-4" />
                </button>
            )}

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.to}>
                            <NavLink
                                to={item.to}
                                title={collapsed ? item.label : undefined}
                                className={({ isActive }) =>
                                    cn(
                                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                                        collapsed && 'justify-center px-0',
                                        isActive
                                            ? 'bg-accent text-foreground'
                                            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                                    )
                                }
                            >
                                <span className="flex size-[18px] shrink-0 items-center justify-center">
                                    <Icon className="size-[18px]" />
                                </span>
                                {!collapsed && <span className="truncate">{item.label}</span>}
                            </NavLink>

                            {item.to === '/solution' && location.pathname === '/solution' && (
                                <button
                                    type="button"
                                    onClick={requestNewChat}
                                    title={collapsed ? 'New Chat' : undefined}
                                    className={cn(
                                        'mt-1 flex w-full items-center gap-3 rounded-lg py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground',
                                        collapsed ? 'justify-center px-0' : 'pl-9 pr-3',
                                    )}
                                >
                                    <span className="flex size-4 shrink-0 items-center justify-center">
                                        <Plus className="size-4" />
                                    </span>
                                    {!collapsed && <span className="truncate">New Chat</span>}
                                </button>
                            )}

                            {item.to === '/solution' &&
                                location.pathname === '/solution' &&
                                !collapsed &&
                                schedules.length > 0 && (
                                    <div className="mt-2 flex flex-col gap-0.5 pl-9 pr-3">
                                        {schedules.map((s) => (
                                            <button
                                                key={s.scheduleId}
                                                type="button"
                                                onClick={() => setSelectedScheduleId(s.scheduleId)}
                                                className="flex items-center gap-2 rounded-md py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                                            >
                                                <CalendarClock className="size-3.5 shrink-0" />
                                                <span className="truncate">
                                                    Schedule-{String(s.number).padStart(2, '0')}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                        </div>
                    );
                })}
            </nav>

            {user && (
                <div className="shrink-0 border-t border-border/60 p-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            className={cn(
                                'flex w-full items-center gap-2.5 rounded-lg p-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
                                collapsed && 'justify-center px-0',
                            )}
                        >
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                                {initialsFor(user.username)}
                            </div>
                            {!collapsed && (
                                <>
                                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                                        {user.username}
                                    </p>
                                    <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
                                </>
                            )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            side="top"
                            align={collapsed ? 'center' : 'start'}
                            sideOffset={8}
                            className="w-56"
                        >
                            <DropdownMenuItem disabled>
                                <User className="size-4" />
                                Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>
                                <HelpCircle className="size-4" />
                                Help
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} variant="destructive">
                                <LogOut className="size-4" />
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
        </aside>

        <ScheduleDetailModal
            scheduleId={selectedScheduleId}
            onOpenChange={(open) => !open && setSelectedScheduleId(null)}
            onChanged={refreshSchedules}
        />
        </>
    );
}
