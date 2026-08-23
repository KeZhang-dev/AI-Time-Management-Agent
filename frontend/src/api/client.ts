import { getToken } from '../lib/auth';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5224/api';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function extractErrorMessage(text: string): string | null {
  if (!text) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null) return text;

    const obj = parsed as Record<string, unknown>;
    if (typeof obj.detail === 'string' && obj.detail) return obj.detail;
    if (typeof obj.message === 'string' && obj.message) return obj.message;
    if (obj.errors && typeof obj.errors === 'object') {
      const firstError = Object.values(obj.errors as Record<string, unknown>).flat()[0];
      if (typeof firstError === 'string') return firstError;
    }
    return text;
  } catch {
    return text;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, extractErrorMessage(text) ?? response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
