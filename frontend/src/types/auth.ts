export interface AuthUser {
    id: string;
    username: string;
    role: string;
}

export interface AuthResponse {
    token: string;
    user: AuthUser;
}
