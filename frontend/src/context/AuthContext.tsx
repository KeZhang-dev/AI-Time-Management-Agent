import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as authApi from '@/api/auth';
import { clearToken, getToken, setToken } from '@/lib/auth';
import type { AuthUser } from '@/types/auth';

interface AuthContextValue {
    user: AuthUser | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<void>;
    signup: (username: string, password: string) => Promise<void>;
    logout: () => void;
    updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = getToken();
        if (!token) {
            setLoading(false);
            return;
        }
        authApi
            .getMe()
            .then(setUser)
            .catch(() => clearToken())
            .finally(() => setLoading(false));
    }, []);

    const login = async (username: string, password: string) => {
        const res = await authApi.login(username, password);
        setToken(res.token);
        setUser(res.user);
    };

    const signup = async (username: string, password: string) => {
        const res = await authApi.signup(username, password);
        setToken(res.token);
        setUser(res.user);
    };

    const logout = () => {
        clearToken();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser: setUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}
