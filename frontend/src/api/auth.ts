import { apiFetch } from './client';
import type { AuthResponse, AuthUser } from '../types/auth';

export function signup(username: string, password: string): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
}

export function login(username: string, password: string): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
}

export function getMe(): Promise<AuthUser> {
    return apiFetch<AuthUser>('/auth/me');
}
