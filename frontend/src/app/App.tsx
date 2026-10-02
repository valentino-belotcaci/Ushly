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
  isPublicPagePath,
  publicPagePaths,
} from '../features/public-pages/routes';
import { RouteMetadata } from './RouteMetadata';
import { footerGroups } from '../layout/navigation';
import { LegalPage } from '../features/legal/LegalPage';
import {
  isLegalPagePath,
  legalPagePaths,
  localizedLegalRoutes,
} from '../features/legal/routes';
import { CookieConsent } from '../features/consent/CookieConsent';
import {
  AdminLinksPage,
  AdminOverviewPage,
  AdminUsersPage,
} from '../features/admin/AdminPages';
import { locales, useLocalizedRoute, useLocale } from '../i18n/locale';
import { translations } from '../i18n';

// Vite removes this branch and its preview chunk from production builds.
const ComponentPreview = import.meta.env.DEV
  ? lazy(() => import('../dev/ComponentPreview'))
  : null;

function Placeholder({ title }: { title: string }) {
  const text = translations(useLocale()).common;
  return (
    <PageLayout title={title}>
      <p className="muted">
        {text.unavailableText}
      </p>
      {import.meta.env.DEV && (
        <Link to="/dev/components">{text.componentLibrary}</Link>
      )}
    </PageLayout>
  );
}

function UnavailablePage() {
  const text = translations(useLocale()).common;
  const route = useLocalizedRoute();
  return (
    <PageLayout title={text.unavailable}>
      <Link to={route('/')}>{text.returnUshly}</Link>
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
          <Route path="admin" element={<AdminOverviewPage />} />
          <Route path="admin/users" element={<AdminUsersPage />} />
          <Route path="admin/links" element={<AdminLinksPage />} />
        </Route>
        <Route element={<ApplicationLayout />}>
          <Route path="/" element={<HomePage />} />
          {publicPagePaths.map((path) => (
              <Route
                key={path}
                path={path}
                element={<PublicPage path={path} />}
              />
            ))}
          {legalPagePaths.map((path) => (
              <Route
                key={path}
                path={path}
                element={<LegalPage path={path} />}
              />
            ))}
          {footerGroups
            .flatMap((group) => group.links)
            .filter(
              (link) =>
                link.to !== '/' &&
                link.to !== '/login' &&
                link.to !== '/register' &&
                !isPublicPagePath(link.to) &&
                !isLegalPagePath(link.to),
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
              <UnavailablePage />
            }
          />
        </Route>
        {locales.map((locale) => (
          <Route key={locale} path={`/${locale}`}>
            <Route path="login" element={<AuthPage mode="login" />} />
            <Route path="register" element={<AuthPage mode="register" />} />
            <Route path="dashboard" element={<DashboardGuard />}>
              <Route index element={<OverviewPage />} />
              <Route path="links" element={<LinksPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="qr-codes" element={<QrCodesPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="admin" element={<AdminOverviewPage />} />
              <Route path="admin/users" element={<AdminUsersPage />} />
              <Route path="admin/links" element={<AdminLinksPage />} />
            </Route>
            <Route element={<ApplicationLayout />}>
              <Route index element={<HomePage />} />
              {publicPagePaths.map((path) => (
                  <Route
                    key={path}
                    path={path.slice(1)}
                    element={<PublicPage path={path} />}
                  />
                ))}
              {Object.entries(localizedLegalRoutes).map(([route, path]) => (
                <Route
                  key={route}
                  path={route.slice(1)}
                  element={<LegalPage path={path} />}
                />
              ))}
              <Route
                path="contact"
                element={<Placeholder title={translations(locale).layout.contact} />}
              />
              <Route path="*" element={<UnavailablePage />} />
            </Route>
          </Route>
        ))}
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
      <CookieConsent />
    </>
  );
}
