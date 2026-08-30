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

export function updateName(name: string): Promise<AuthUser> {
    return apiFetch<AuthUser>('/auth/me/name', {
        method: 'PUT',
        body: JSON.stringify({ name }),
    });
}

export function updateAvatar(avatarDataUrl: string): Promise<AuthUser> {
    return apiFetch<AuthUser>('/auth/me/avatar', {
        method: 'PUT',
        body: JSON.stringify({ avatarDataUrl }),
    });
}

export function updatePreferredModel(preferredLlmProvider: string): Promise<AuthUser> {
    return apiFetch<AuthUser>('/auth/me/model', {
        method: 'PUT',
        body: JSON.stringify({ preferredLlmProvider }),
    });
}
