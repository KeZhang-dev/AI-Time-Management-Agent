import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppBackground } from '@/components/AppBackground';
import { LoggedOutNav } from '@/components/LoggedOutNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';

export function SignupPage() {
    const navigate = useNavigate();
    const { signup } = useAuth();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setSubmitting(true);
        try {
            await signup(username, password);
            navigate('/solution');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Sign up failed.');
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
                        <h1 className="text-xl font-semibold tracking-tight">Create an account</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Only email registration is supported in your region.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="signup-username">Username</Label>
                            <Input
                                id="signup-username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoFocus
                                required
                                minLength={3}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="signup-password">Password</Label>
                            <PasswordInput
                                id="signup-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="signup-confirm-password">Confirm password</Label>
                            <PasswordInput
                                id="signup-confirm-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                        </div>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        <Button type="submit" disabled={submitting} className="mt-2">
                            {submitting ? 'Creating account…' : 'Sign up'}
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <Link to="/login" className="font-medium text-foreground hover:underline">
                            Log in
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
