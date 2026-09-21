import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router';
import { LoadingState } from '../components/LoadingState';
import { ApplicationLayout } from '../layout/ApplicationLayout';
import { PageLayout } from '../layout/PageLayout';
import { footerGroups } from '../layout/navigation';

// Vite removes this branch and its preview chunk from production builds.
const ComponentPreview = import.meta.env.DEV
  ? lazy(() => import('../dev/ComponentPreview'))
  : null;

function Placeholder({ title }: { title: string }) {
  return (
    <PageLayout title={title}>
      <p className="muted">
        This page is not available yet. Ushly’s public pages and account
        features are coming in later updates.
      </p>
      {import.meta.env.DEV && (
        <Link to="/dev/components">Explore the component library</Link>
      )}
    </PageLayout>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<ApplicationLayout />}>
        {footerGroups
          .flatMap((group) => group.links)
          .map((link) => (
            <Route
              key={link.to}
              path={link.to}
              element={<Placeholder title={link.label} />}
            />
          ))}
        <Route
          path="*"
          element={
            <PageLayout title="Page unavailable">
              <Link to="/">Return to Ushly</Link>
            </PageLayout>
          }
        />
      </Route>
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
    </Routes>
  );
}
