import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { NavShell } from '@/components/NavShell';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
    { to: '/record', label: 'Record' },
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/solution', label: 'Solution' },
];

function initialsFor(username: string): string {
    return username.slice(0, 2).toUpperCase();
}

export function AppNav() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        navigate('/');
        logout();
    };

    return (
        <NavShell className="grid grid-cols-3">
            <Link to="/record" className="flex items-center gap-3 justify-self-start">
                <Logo size={28} />
                <span className="hidden text-lg font-medium tracking-wide sm:inline">KONER</span>
            </Link>

            <nav className="flex items-center gap-1 justify-self-center">
                {NAV_ITEMS.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            cn(
                                'rounded-full px-4 py-1.5 text-base font-medium transition-colors',
                                isActive
                                    ? 'bg-accent text-foreground'
                                    : 'text-muted-foreground hover:text-foreground',
                            )
                        }
                    >
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div className="justify-self-end">
                {user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <span className="hidden text-base font-medium text-muted-foreground sm:inline">
                                {user.username}
                            </span>
                            <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                                {initialsFor(user.username)}
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleLogout} variant="destructive">
                                <LogOut className="size-4" />
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </NavShell>
    );
}
