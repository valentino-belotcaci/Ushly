export type AuthPath = '/login' | '/register';

export function isAuthPath(path: string): path is AuthPath {
  return path === '/login' || path === '/register';
}

export function authMetadata(path: AuthPath): string {
  const login = path === '/login';
  return `<title>${login ? 'Log in' : 'Create an account'} | Ushly</title>
<meta name="description" content="${login ? 'Log in to your Ushly account to manage your links.' : 'Create a Ushly account to manage links and access click analytics.'}">
<meta name="robots" content="noindex, follow">`;
}
