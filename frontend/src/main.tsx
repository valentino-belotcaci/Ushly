import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import '@fontsource-variable/plus-jakarta-sans';
import { App } from './app/App';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastProvider } from './components/ToastProvider';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing application root');
const application = (
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>
);

if (root.dataset.prerendered) {
  hydrateRoot(root, application);
} else {
  createRoot(root).render(application);
}
