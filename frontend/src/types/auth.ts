export interface AuthUser {
    id: string;
    username: string;
    role: string;
    name: string;
    avatarDataUrl: string | null;
    preferredLlmProvider: string;
}

export interface AuthResponse {
    token: string;
    user: AuthUser;
}
