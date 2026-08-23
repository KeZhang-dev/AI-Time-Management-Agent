import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppBackground } from '@/components/AppBackground';
import { LoggedOutNav } from '@/components/LoggedOutNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/api/client';
import { useAuth } from '@/context/AuthContext';

export function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            await login(username, password);
            navigate('/dashboard');
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                setError('Invalid username or password.');
            } else {
                setError(err instanceof Error ? err.message : 'Login failed.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="relative flex min-h-svh flex-col text-foreground">
            <AppBackground />
            <LoggedOutNav />

            <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
                <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8">
                    <div className="mb-6 text-center">
                        <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Log in to your Time Tracker account.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="login-username">Username</Label>
                            <Input
                                id="login-username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoFocus
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="login-password">Password</Label>
                            <Input
                                id="login-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        <Button type="submit" disabled={submitting} className="mt-2">
                            {submitting ? 'Logging in…' : 'Log in'}
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        Don&apos;t have an account?{' '}
                        <Link to="/signup" className="font-medium text-foreground hover:underline">
                            Sign up
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
