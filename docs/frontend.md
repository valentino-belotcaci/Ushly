# Frontend

The frontend is a React 19 application built with Vite 8 and strict TypeScript.
It renders one shared component tree for English and Italian public pages,
authentication, the authenticated dashboard, administration, and legal content.
Plus Jakarta Sans and the shared CSS token system provide the Ushly visual style.

## Setup and commands

Use Node 22.12 or later within Node 22. From `frontend/`:

```bash
npm ci
npm run dev
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite on `127.0.0.1`. |
| `npm run lint` | Run ESLint and React/TypeScript rules. |
| `npm run typecheck` | Run strict TypeScript without emitting files. |
| `npm test` | Run the bounded Vitest and Testing Library suite. |
| `npm run test:watch` | Run Vitest interactively. |
| `npm run build` | Type-check, build assets, and prerender public pages. |
| `npm run preview` | Serve the production build locally. |
| `npm run format` / `format:check` | Write or verify Prettier formatting. |
| `npm run test:browser` | Run Playwright responsive and browser behavior tests. |

Install Chromium once before browser tests:

```bash
npx playwright install chromium
npm run test:browser
```

## Directory and feature organization

```text
frontend/
├── public/                     Static icons, manifests, and auth images
├── scripts/prerender.mjs       Production HTML, sitemap, and robots generation
├── src/
│   ├── api/                    Typed link and in-memory session clients
│   ├── app/                    Route tree and route metadata
│   ├── components/             Reusable accessible controls and visual states
│   ├── config/                 Validated public build configuration
│   ├── features/
│   │   ├── home/               Homepage and anonymous shortening
│   │   ├── public-pages/       Product pages
│   │   ├── legal/              Legal templates and metadata
│   │   ├── auth/               Login, registration, and OAuth popup UI
│   │   ├── dashboard/          Overview, links, analytics, QR, and settings
│   │   ├── admin/              Protected user/link/statistics interfaces
│   │   └── consent/            Persisted optional-consent controls
│   ├── i18n/                   English/Italian dictionaries and route helpers
│   ├── layout/                 Public and authenticated application shells
│   ├── styles/                 Global rules and design tokens
│   └── theme/                  Dark/light preference and persistence
└── tests/browser/              Playwright suites
```

Network behavior stays in `src/api` or feature API modules. Shared controls stay
in `components`; feature-specific state and styles stay with the feature. The
project intentionally uses React context and external-store subscriptions for
theme, toast, and session state rather than a global state dependency.

## Routing and pages

`src/app/App.tsx` defines both compatibility routes and localized `/en/` and
`/it/` families without duplicating page components.

Public pages are the homepage, URL Shortener, QR Codes, Analytics, Features,
Privacy Policy, Cookie Policy, and Terms of Service. Authentication pages are
login and registration. Protected dashboard routes provide Overview, Links,
Analytics, QR Codes, Settings, and administrator pages for users, links, and
global statistics.

`ApplicationLayout` supplies the public skip link, header, main landmark, footer,
theme toggle, language selector, and cookie controls. `DashboardGuard` restores
the session before rendering `DashboardLayout`; anonymous users go to the
equivalent localized login route. The dashboard uses its own responsive sidebar
and account/logout controls. Backend authorization remains authoritative even
when the UI hides an admin control.

Navigation uses `useLocalizedRoute()` or `localizedPath()` from
`src/i18n/locale.ts`. The helpers strip a current prefix and add the selected
locale to the equivalent route. The language selector preserves the current
query and hash. If a localized equivalent is unavailable, route code must use a
documented safe fallback rather than silently changing session state.

When adding a public or legal route, update its small route registry, add it to
the shared `App.tsx` route family, supply translations and metadata, then verify
both locale prefixes. Do not create language-specific page components.

## Internationalization

`src/i18n/en.ts` and `src/i18n/it.ts` are the single source of truth for localized
visible content. They contain matching keys, nested types, and array lengths.
`src/i18n/index.ts` selects a dictionary and runs a development parity check;
`src/i18n/index.test.ts` verifies the structure in tests. Shared content shapes
are defined in `src/i18n/types.ts`.

`localeFromPath()` selects Italian for `/it` and `/it/*`; English is the default.
`hasLocalePrefix()`, `stripLocale()`, `localizedPath()`, and
`localizedEquivalentPath()` maintain paths and legal aliases. `RouteMetadata`
sets `<html lang="en">` or `<html lang="it">` after navigation, while the
prerenderer writes the correct language into static documents.

To add or modify translated text:

1. Add the same nested key and array position to both locale files.
2. Use natural Italian search intent instead of a literal translation.
3. Read the value with `translations(locale)` from the shared component.
4. Keep dynamic email addresses, URLs, dates, analytics values, and API data out
   of translation files.
5. Run `npm test` and exercise both `/en/` and `/it/` versions.

Do not hardcode user-facing navigation, buttons, validation, loading, empty,
error, dialog, toast, FAQ, or accessibility text in components.

## API client and authentication state

`src/api/session.ts` is a typed native-fetch client. It sends cookie-based auth
requests with `credentials: 'include'`, keeps the access JWT in memory, restores
the safe user projection through `/auth/refresh`, and deduplicates concurrent
refresh attempts. A protected request retries once after a successful refresh;
a persistent 401 clears local state. Logout clears memory and calls the backend
to revoke the refresh session.

No access or refresh token is stored in localStorage, sessionStorage, a URL, or
logs. API responses are decoded at the client boundary, and arbitrary response
bodies are not displayed to users. Network, validation, authentication, and
configuration failures map to safe localized UI states.

Google OAuth opens a popup. The parent accepts completion only from the expected
origin and exact popup window. It refreshes the existing backend session after a
safe status message; no OAuth token or provider data crosses `postMessage`.
Settings offers explicit Google linking only when the backend's safe session
projection says it is available, and password re-verification remains server
enforced.

## Link, QR, analytics, and admin interfaces

The public form creates anonymous links and generates its QR locally from the
exact public short URL. Authenticated link management uses owner-scoped APIs for
creation, pagination, editing, enable/disable, deletion, copying, visiting, and
owner-authorized SVG QR download. Destructive operations use confirmation
dialogs, and expired/disabled state controls available actions without changing
backend enforcement.

Analytics selects an owned link and requests bounded owner statistics with UTC
ranges and hour/day/week granularity. Accessible CSS/SVG summaries avoid a chart
dependency. Admin pages use only existing protected endpoints and expose safe
user/link projections, filters, pages, status actions, and global statistics.

## Design system, accessibility, and responsive behavior

`src/styles/tokens.css` defines semantic surfaces, text, borders, spacing,
typography, radii, shadows, and Ushly orange. Dark mode is the default; the theme
provider persists only the theme preference and applies a pre-React bootstrap to
avoid a color flash. Components include buttons, inputs, cards, badges, tables,
pagination, tabs, dialogs, loading states, error states, and toasts.

The application uses semantic headings and landmarks, a skip link, visible
focus styles, keyboard-operable menus/dialogs, accessible names for icon actions,
status announcements, and touch-friendly targets. Mobile layouts prevent page
overflow; dashboard tables become full-width stacked cards where appropriate.
Animations are short and restrained, and nonessential motion is disabled under
`prefers-reduced-motion`.

Loading skeletons approximate final card, list, filter, and table layouts without
presenting false data. Empty, error, retry, success, and unauthorized states are
separate. Playwright and axe cover representative routes, themes, breakpoints,
keyboard flows, reduced motion, and route protection; manual device and
assistive-technology review remains necessary.

## SEO

Public feature metadata helpers use localized dictionary values for unique page
titles, descriptions, Open Graph content, canonical URLs, and English/Italian
`hreflang` pairs. Canonical public route families are `/en/*` and `/it/*`.
Authentication, dashboard, admin, development, unknown, and SPA fallback pages
are excluded from the sitemap and disallowed or marked `noindex`.

The production build runs `scripts/prerender.mjs` against the real React page
trees. It writes localized HTML, `dist/sitemap.xml`, `dist/robots.txt`, and a
non-indexable `dist/200.html`. Generated absolute URLs come from
`VITE_SITE_ORIGIN`; a production build fails when that origin is missing.

After deployment, verify titles, descriptions, canonical and `hreflang` links,
language attributes, sitemap entries, robots rules, and public/private
indexability against the final origin. Google Search Console verification and
sitemap submission are external manual actions and are not implemented by the
repository.

## Environment and builds

`frontend/.env.example` documents public build configuration:

- `VITE_SITE_ORIGIN`: exact frontend origin for metadata, sitemap, and robots.
- `VITE_API_ORIGIN`: exact API and short-link origin.
- `VITE_LEGAL_NAME` and `VITE_LEGAL_CONTACT_EMAIL`: optional verified public
  operator details for legal templates.

Never put secrets in `VITE_*`. Local development normally uses an ignored
`frontend/.env.local`. Production values are supplied before `npm run build`;
changing either origin requires rebuilding the assets.

The deployment workflow installs from the lockfile, builds `frontend/dist`,
synchronizes its contents to the private S3 bucket with obsolete-object deletion,
and invalidates CloudFront. Origin Access Control, custom domains, cache behavior,
and SPA fallback configuration are documented in
[Deployment and operations](deployment.md).
