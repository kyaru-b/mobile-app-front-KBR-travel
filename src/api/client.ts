import { useAuth } from '@/store/auth';

import { ApiError, parseErrorBody } from './errors';
import { mockRequest } from './mocks';
import type { AuthTokens } from './types';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
export const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === 'true' || API_URL === '';

const TIMEOUT_MS = 15_000;

type Query = Record<string, string | number | boolean | null | undefined>;
type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type RequestOptions = {
  method?: Method;
  query?: Query;
  body?: unknown;
  /** false — запрос без токена (вход, обновление токена). */
  auth?: boolean;
};

function buildQuery(query: Query | undefined): string {
  if (!query) return '';
  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return params.length ? `?${params.join('&')}` : '';
}

async function send<T>(path: string, opts: RequestOptions, accessToken: string | null): Promise<T> {
  const { method = 'GET', query, body } = opts;

  if (USE_MOCKS) {
    return mockRequest<T>(method, path, query, body);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}${buildQuery(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    throw new ApiError(0, aborted ? 'timeout' : 'network', '');
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) throw parseErrorBody(res.status, data);
  return data as T;
}

let refreshing: Promise<string> | null = null;

/** Одно общее обновление токена на все параллельные запросы, получившие 401. */
function refreshAccessToken(): Promise<string> {
  if (!refreshing) {
    refreshing = (async () => {
      const { refreshToken, setTokens, signOut } = useAuth.getState();
      if (!refreshToken) {
        await signOut();
        throw new ApiError(401, 'unauthorized', '');
      }
      try {
        const tokens = await send<AuthTokens>(
          '/auth/refresh',
          { method: 'POST', body: { refresh_token: refreshToken } },
          null,
        );
        await setTokens(tokens);
        return tokens.access_token;
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) await signOut();
        throw e;
      }
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const withAuth = opts.auth !== false;
  const token = withAuth ? useAuth.getState().accessToken : null;
  try {
    return await send<T>(path, opts, token);
  } catch (e) {
    if (!withAuth || !(e instanceof ApiError) || e.status !== 401) throw e;
    const fresh = await refreshAccessToken();
    return send<T>(path, opts, fresh);
  }
}

/** Адрес WebSocket того же бэкенда: http → ws, https → wss. */
export function wsUrl(path: string, query: Query): string {
  return `${API_URL.replace(/^http/, 'ws')}${path}${buildQuery(query)}`;
}
