import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router';
import { LoadingState } from '../components/LoadingState';
import { ApplicationLayout } from '../layout/ApplicationLayout';
import { PageLayout } from '../layout/PageLayout';
import { HomePage } from '../features/home/HomePage';
import { AuthPage } from '../features/auth/AuthPage';
import { DashboardGuard } from '../features/dashboard/DashboardLayout';
import { OverviewPage } from '../features/dashboard/OverviewPage';
import { LinksPage } from '../features/dashboard/LinksPage';
import { AnalyticsPage } from '../features/dashboard/AnalyticsPage';
import { QrCodesPage } from '../features/dashboard/QrCodesPage';
import { SettingsPage } from '../features/dashboard/SettingsPage';
import { PublicPage } from '../features/public-pages/PublicPage';
import {
  publicPages,
  isPublicPagePath,
} from '../features/public-pages/content';
import { RouteMetadata } from './RouteMetadata';
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
    <>
      <RouteMetadata />
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/dashboard" element={<DashboardGuard />}>
          <Route index element={<OverviewPage />} />
          <Route path="links" element={<LinksPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="qr-codes" element={<QrCodesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route element={<ApplicationLayout />}>
          <Route path="/" element={<HomePage />} />
          {Object.keys(publicPages)
            .filter(isPublicPagePath)
            .map((path) => (
              <Route
                key={path}
                path={path}
                element={<PublicPage path={path} />}
              />
            ))}
          {footerGroups
            .flatMap((group) => group.links)
            .filter(
              (link) =>
                link.to !== '/' &&
                link.to !== '/login' &&
                link.to !== '/register' &&
                !isPublicPagePath(link.to),
            )
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
    </>
  );
}
