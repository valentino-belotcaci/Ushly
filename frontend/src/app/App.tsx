import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router';
import { BrandLogo } from '../components/BrandLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import { LoadingState } from '../components/LoadingState';

// Vite removes this branch and its preview chunk from production builds.
const ComponentPreview = import.meta.env.DEV
  ? lazy(() => import('../dev/ComponentPreview'))
  : null;

function Foundation() {
  return (
    <main className="foundation">
      <BrandLogo />
      <h1>Frontend foundation</h1>
      <p className="muted">
        The shared interface foundation is ready. Product features will be added
        in later tasks.
      </p>
      <ThemeToggle />
      {import.meta.env.DEV && (
        <Link to="/dev/components">Explore the component library</Link>
      )}
    </main>
  );
}
export function App() {
  return (
    <Routes>
      <Route path="/" element={<Foundation />} />
      {ComponentPreview && (
        <Route
          path="/dev/components"
          element={
            <Suspense fallback={<LoadingState />}>
              <ComponentPreview />
            </Suspense>
          }
        />
      )}
      <Route
        path="*"
        element={
          <main className="foundation">
            <h1>Page unavailable</h1>
            <Link to="/">Return to the foundation</Link>
          </main>
        }
      />
    </Routes>
  );
}
