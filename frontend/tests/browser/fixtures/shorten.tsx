import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { ShortenForm } from '../../../src/features/home/ShortenForm';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import '../../../src/styles/global.css';
import '../../../src/features/home/home.css';

// Test-only entry: no login UI or token injection hook is included in the production bundle.
const root = document.getElementById('root');
if (!root) throw new Error('Missing fixture root');
createRoot(root).render(
  <ThemeProvider>
    <MemoryRouter>
      <h1>Owned-link form fixture</h1>
      <ShortenForm accessToken="test-access-token" />
    </MemoryRouter>
  </ThemeProvider>,
);
