import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { NavShell } from '@/components/NavShell';
import { Button } from '@/components/ui/button';

export function LoggedOutNav() {
    return (
        <NavShell>
            <Link to="/" className="flex items-center gap-3">
                <Logo />
                <span className="text-lg font-medium tracking-wide">KONER</span>
            </Link>
            <Button variant="outline" size="sm" asChild>
                <Link to="/login">Login</Link>
            </Button>
        </NavShell>
    );
}
