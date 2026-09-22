import { useSyncExternalStore } from 'react';
import { apiOrigin } from '../config/public';

export type AuthUser = { id: string; email: string; createdAt: string };
export type SessionState =
  | { status: 'checking'; user: null }
  | { status: 'authenticated'; user: AuthUser | null }
  | { status: 'anonymous'; user: null };

export type ApiErrorKind =
  'http' | 'network' | 'invalid_response' | 'configuration';

export class ApiClientError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly status: number | null,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

type Credentials = { email: string; password: string };
type JsonRequest = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
};
const checkingState: SessionState = { status: 'checking', user: null };

const networkError = () =>
  new ApiClientError(
    'network',
    null,
    'network_error',
    'Could not reach Ushly. Check your connection and try again.',
  );
const invalidResponse = () =>
  new ApiClientError(
    'invalid_response',
    null,
    'invalid_response',
    'Ushly returned an invalid response. Please try again later.',
  );
const sessionChanged = () =>
  new ApiClientError(
    'http',
    401,
    'session_changed',
    'Your session has expired. Please log in again.',
  );

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function tokenFrom(value: unknown): string {
  if (
    !isRecord(value) ||
    typeof value.accessToken !== 'string' ||
    value.accessToken.length === 0 ||
    value.accessToken.length > 8192
  )
    throw invalidResponse();
  return value.accessToken;
}

function loginFrom(value: unknown): { accessToken: string; user: AuthUser } {
  const accessToken = tokenFrom(value);
  if (!isRecord(value) || !isRecord(value.user)) throw invalidResponse();
  const user = value.user;
  if (
    typeof user.id !== 'string' ||
    user.id.length === 0 ||
    typeof user.email !== 'string' ||
    user.email.length === 0 ||
    typeof user.createdAt !== 'string' ||
    Number.isNaN(Date.parse(user.createdAt))
  )
    throw invalidResponse();
  return {
    accessToken,
    user: { id: user.id, email: user.email, createdAt: user.createdAt },
  };
}

function userFrom(value: unknown): AuthUser {
  if (!isRecord(value)) throw invalidResponse();
  if (
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    typeof value.email !== 'string' ||
    value.email.length === 0 ||
    typeof value.createdAt !== 'string' ||
    Number.isNaN(Date.parse(value.createdAt))
  )
    throw invalidResponse();
  return { id: value.id, email: value.email, createdAt: value.createdAt };
}

async function errorFrom(response: Response): Promise<ApiClientError> {
  let code = 'http_error';
  try {
    const body: unknown = await response.json();
    if (
      isRecord(body) &&
      typeof body.error === 'string' &&
      /^[a-z_]{1,64}$/.test(body.error)
    )
      code = body.error;
  } catch {
    // A malformed error body never becomes user-facing text.
  }
  const messages: Record<number, string> = {
    400: 'Check your request and try again.',
    401: 'Your session has expired. Please log in again.',
    403: 'You do not have permission to do that.',
    404: 'The requested item was not found.',
    409: 'This request conflicts with an existing item.',
    429: 'Too many requests. Please wait before trying again.',
    503: 'Ushly is temporarily unavailable. Please try again later.',
  };
  const message =
    code === 'invalid_credentials'
      ? 'Invalid email or password.'
      : (messages[response.status] ??
        'Ushly could not complete the request. Please try again later.');
  return new ApiClientError('http', response.status, code, message);
}

async function jsonFrom(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw invalidResponse();
  }
}

export class ApiSession {
  private accessToken: string | null = null;
  private state: SessionState = checkingState;
  private listeners = new Set<() => void>();
  private refreshPromise: Promise<string> | null = null;
  private generation = 0;

  constructor(
    private readonly origin: string | undefined,
    private readonly fetcher: typeof fetch = (input, init) =>
      fetch(input, init),
  ) {}

  readonly getSnapshot = (): SessionState => this.state;
  readonly getServerSnapshot = (): SessionState => checkingState;
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private setState(state: SessionState): void {
    this.state = state;
    for (const listener of this.listeners) listener();
  }

  private clear(): void {
    this.accessToken = null;
    this.setState({ status: 'anonymous', user: null });
  }

  private async send(
    path: string,
    request: JsonRequest,
    token?: string,
  ): Promise<Response> {
    if (!this.origin)
      throw new ApiClientError(
        'configuration',
        null,
        'api_unconfigured',
        'Ushly is not configured yet. Please try again later.',
      );
    if (!path.startsWith('/') || path.startsWith('//'))
      throw new Error('API paths must be relative to the configured origin');
    const headers = new Headers();
    if (request.body !== undefined)
      headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    try {
      return await this.fetcher(`${this.origin}${path}`, {
        method: request.method,
        headers,
        ...(request.body !== undefined
          ? { body: JSON.stringify(request.body) }
          : {}),
        credentials: 'include',
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw networkError();
    }
  }

  private async refreshOnce(generation: number): Promise<string> {
    try {
      const response = await this.send('/auth/refresh', { method: 'POST' });
      if (!response.ok) throw await errorFrom(response);
      const token = tokenFrom(await jsonFrom(response));
      if (generation !== this.generation) throw sessionChanged();
      this.accessToken = token;
      this.setState({
        status: 'authenticated',
        user: this.state.status === 'authenticated' ? this.state.user : null,
      });
      return token;
    } catch (error) {
      if (
        generation === this.generation &&
        (this.state.status === 'checking' ||
          (error instanceof ApiClientError &&
            (error.status === 401 || error.kind === 'invalid_response')))
      )
        this.clear();
      throw error;
    }
  }

  private refresh(): Promise<string> {
    if (this.refreshPromise) return this.refreshPromise;
    const pending = this.refreshOnce(this.generation);
    this.refreshPromise = pending;
    const release = () => {
      if (this.refreshPromise === pending) this.refreshPromise = null;
    };
    void pending.then(release, release);
    return pending;
  }

  async restore(): Promise<SessionState> {
    if (this.state.status === 'authenticated') return this.state;
    try {
      await this.refresh();
    } catch (error) {
      if (!(error instanceof ApiClientError && error.status === 401))
        throw error;
    }
    return this.state;
  }

  async login(credentials: Credentials): Promise<SessionState> {
    if (this.refreshPromise) {
      try {
        await this.refreshPromise;
      } catch {
        // Login can proceed after a failed session restoration.
      }
    }
    const generation = this.generation;
    const response = await this.send('/auth/login', {
      method: 'POST',
      body: credentials,
    });
    if (generation !== this.generation) throw sessionChanged();
    if (!response.ok) throw await errorFrom(response);
    const session = loginFrom(await jsonFrom(response));
    this.generation += 1;
    this.accessToken = session.accessToken;
    this.setState({ status: 'authenticated', user: session.user });
    return this.state;
  }

  async register(credentials: Credentials): Promise<AuthUser> {
    const response = await this.send('/auth/register', {
      method: 'POST',
      body: credentials,
    });
    if (!response.ok) throw await errorFrom(response);
    return userFrom(await jsonFrom(response));
  }

  async beginGoogleLink(password: string): Promise<string> {
    return this.requestProtected(
      '/auth/google/link',
      { method: 'POST', body: { password } },
      (value) => {
        if (!isRecord(value) || typeof value.authorizationUrl !== 'string')
          throw invalidResponse();
        let url: URL;
        try {
          url = new URL(value.authorizationUrl);
        } catch {
          throw invalidResponse();
        }
        if (url.origin !== 'https://accounts.google.com')
          throw invalidResponse();
        return url.href;
      },
    );
  }

  async requestProtected<T>(
    path: string,
    request: JsonRequest,
    decode: (value: unknown) => T,
  ): Promise<T> {
    const generation = this.generation;
    const firstToken = this.accessToken ?? (await this.refresh());
    let response = await this.send(path, request, firstToken);
    if (generation !== this.generation) throw sessionChanged();
    if (response.status === 401) {
      const nextToken =
        this.accessToken && this.accessToken !== firstToken
          ? this.accessToken
          : await this.refresh();
      response = await this.send(path, request, nextToken);
      if (generation !== this.generation) throw sessionChanged();
      if (response.status === 401) {
        this.generation += 1;
        this.clear();
      }
    }
    if (!response.ok) throw await errorFrom(response);
    const data = response.status === 204 ? null : await jsonFrom(response);
    try {
      return decode(data);
    } catch {
      throw invalidResponse();
    }
  }

  async logout(): Promise<void> {
    this.generation += 1;
    const generation = this.generation;
    this.clear();
    if (this.refreshPromise) {
      try {
        await this.refreshPromise;
      } catch {
        // The cookie may still exist, so always ask the backend to revoke it.
      }
    }
    try {
      const response = await this.send('/auth/logout', { method: 'POST' });
      if (!response.ok) throw await errorFrom(response);
    } finally {
      if (generation === this.generation) this.clear();
    }
  }
}

export const apiSession = new ApiSession(apiOrigin);

export function useSession(): SessionState {
  return useSyncExternalStore(
    apiSession.subscribe,
    apiSession.getSnapshot,
    apiSession.getServerSnapshot,
  );
}
