import { describe, expect, it, vi } from 'vitest';
import { ApiClientError, ApiSession } from './session';

const origin = 'https://api.ushly.test';
const user = {
  id: 'user-1',
  email: 'reader@example.test',
  createdAt: '2026-09-22T10:00:00.000Z',
};

type Call = { url: string; init: RequestInit };
function setup(handler: (call: Call) => Promise<Response> | Response) {
  const calls: Call[] = [];
  const session = new ApiSession(origin, async (input, init) => {
    if (typeof input !== 'string' || !init)
      throw new Error('Unexpected fetch invocation');
    const call = { url: input, init };
    calls.push(call);
    return handler(call);
  });
  return { session, calls };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((finish) => {
    resolve = finish;
  });
  return { promise, resolve };
}

function header(call: Call | undefined, name: string): string | null {
  if (!call) throw new Error('Expected a fetch call');
  return new Headers(call.init.headers).get(name);
}

describe('API session lifecycle', () => {
  it('logs in with the backend contract and keeps its token out of the public state', async () => {
    const { session, calls } = setup(() =>
      Response.json({ accessToken: 'access-1', user }),
    );
    const state = await session.login({
      email: user.email,
      password: 'long-secret-password',
    });
    expect(state).toEqual({ status: 'authenticated', user });
    expect(JSON.stringify(state)).not.toContain('access-1');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(`${origin}/auth/login`);
    expect(calls[0]?.init.method).toBe('POST');
    expect(calls[0]?.init.credentials).toBe('include');
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      email: user.email,
      password: 'long-secret-password',
    });
  });

  it('restores a new client from the refresh cookie without inventing a user profile', async () => {
    const { session, calls } = setup(() =>
      Response.json({ accessToken: 'restored-access' }),
    );
    expect(await session.restore()).toEqual({
      status: 'authenticated',
      user: null,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(`${origin}/auth/refresh`);
    expect(calls[0]?.init.credentials).toBe('include');
    expect(calls[0]?.init.body).toBeUndefined();
    expect(header(calls[0], 'Authorization')).toBeNull();
  });

  it('reports a logged-out state when the refresh cookie has expired', async () => {
    const { session, calls } = setup(() =>
      Response.json({ error: 'unauthorized' }, { status: 401 }),
    );
    await expect(session.restore()).resolves.toEqual({
      status: 'anonymous',
      user: null,
    });
    expect(calls).toHaveLength(1);
  });

  it('deduplicates concurrent refreshes and retries protected requests with the new token', async () => {
    const pending = deferred<Response>();
    const { session, calls } = setup((call) => {
      if (call.url.endsWith('/auth/refresh')) return pending.promise;
      return Response.json({ ok: true });
    });
    const requests = [
      session.requestProtected('/links/one', { method: 'GET' }, (data) => data),
      session.requestProtected('/links/two', { method: 'GET' }, (data) => data),
    ];
    expect(
      calls.filter((call) => call.url.endsWith('/auth/refresh')),
    ).toHaveLength(1);
    pending.resolve(Response.json({ accessToken: 'shared-token' }));
    await expect(Promise.all(requests)).resolves.toEqual([
      { ok: true },
      { ok: true },
    ]);
    expect(calls).toHaveLength(3);
    expect(header(calls[1], 'Authorization')).toBe('Bearer shared-token');
    expect(header(calls[2], 'Authorization')).toBe('Bearer shared-token');
  });

  it('refreshes on a protected 401 and retries that request only once', async () => {
    let refreshes = 0;
    const { session, calls } = setup((call) => {
      if (call.url.endsWith('/auth/login'))
        return Response.json({ accessToken: 'old-access', user });
      if (call.url.endsWith('/auth/refresh')) {
        refreshes += 1;
        return Response.json({ accessToken: 'new-access' });
      }
      return header(call, 'Authorization') === 'Bearer old-access'
        ? Response.json({ error: 'unauthorized' }, { status: 401 })
        : Response.json({ id: 'owned-link' });
    });
    await session.login({ email: user.email, password: 'password' });
    await expect(
      session.requestProtected(
        '/links/owned-link',
        { method: 'GET' },
        (data) => data,
      ),
    ).resolves.toEqual({ id: 'owned-link' });
    expect(refreshes).toBe(1);
    expect(
      calls.filter((call) => call.url.endsWith('/links/owned-link')),
    ).toHaveLength(2);
    expect(header(calls[3], 'Authorization')).toBe('Bearer new-access');
  });

  it('clears authentication after a persistent 401', async () => {
    const { session, calls } = setup((call) => {
      if (call.url.endsWith('/auth/login'))
        return Response.json({ accessToken: 'old-access', user });
      if (call.url.endsWith('/auth/refresh'))
        return Response.json({ accessToken: 'new-access' });
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    });
    await session.login({ email: user.email, password: 'password' });
    await expect(
      session.requestProtected(
        '/links/owned-link',
        { method: 'GET' },
        (data) => data,
      ),
    ).rejects.toMatchObject({ status: 401, code: 'unauthorized' });
    expect(session.getSnapshot()).toEqual({ status: 'anonymous', user: null });
    expect(
      calls.filter((call) => call.url.endsWith('/links/owned-link')),
    ).toHaveLength(2);
  });

  it('clears local state and calls the existing backend logout endpoint', async () => {
    const { session, calls } = setup((call) =>
      call.url.endsWith('/auth/login')
        ? Response.json({ accessToken: 'access-1', user })
        : new Response(null, { status: 204 }),
    );
    await session.login({ email: user.email, password: 'password' });
    await session.logout();
    expect(session.getSnapshot()).toEqual({ status: 'anonymous', user: null });
    expect(calls[1]?.url).toBe(`${origin}/auth/logout`);
    expect(calls[1]?.init.credentials).toBe('include');
    expect(header(calls[1], 'Authorization')).toBeNull();
  });

  it('uses safe typed errors for API and network failures', async () => {
    const failedLogin = setup(() =>
      Response.json(
        { error: 'invalid_credentials', message: 'secret internal details' },
        { status: 401 },
      ),
    );
    await expect(
      failedLogin.session.login({ email: user.email, password: 'wrong' }),
    ).rejects.toMatchObject({
      kind: 'http',
      status: 401,
      code: 'invalid_credentials',
      message: 'Invalid email or password.',
    });
    const serverFailure = setup(() =>
      Response.json(
        { error: 'internal_server_error', message: 'private database detail' },
        { status: 500 },
      ),
    );
    await expect(serverFailure.session.restore()).rejects.toMatchObject({
      kind: 'http',
      status: 500,
      code: 'internal_server_error',
      message: 'Ushly could not complete the request. Please try again later.',
    });
    const unreachable = setup(() => Promise.reject(new Error('private URL')));
    await expect(unreachable.session.restore()).rejects.toMatchObject({
      kind: 'network',
      code: 'network_error',
      message: 'Could not reach Ushly. Check your connection and try again.',
    });
    expect(unreachable.session.getSnapshot().status).toBe('anonymous');
    expect(
      new ApiClientError('network', null, 'network_error', 'safe'),
    ).toBeInstanceOf(Error);
  });

  it('never puts a token in browser storage or request URLs', async () => {
    const local = vi.spyOn(window.localStorage, 'setItem');
    const sessionStore = vi.spyOn(window.sessionStorage, 'setItem');
    const { session, calls } = setup((call) => {
      if (call.url.endsWith('/auth/login'))
        return Response.json({ accessToken: 'sensitive-access', user });
      return Response.json({ result: true });
    });
    try {
      await session.login({ email: user.email, password: 'password' });
      await session.requestProtected(
        '/links/owned',
        { method: 'GET' },
        (data) => data,
      );
      expect(local).not.toHaveBeenCalled();
      expect(sessionStore).not.toHaveBeenCalled();
      expect(
        calls.every((call) => !call.url.includes('sensitive-access')),
      ).toBe(true);
      expect(header(calls[1], 'Authorization')).toBe('Bearer sensitive-access');
      expect(JSON.stringify(session.getSnapshot())).not.toContain(
        'sensitive-access',
      );
    } finally {
      local.mockRestore();
      sessionStore.mockRestore();
    }
  });
});
