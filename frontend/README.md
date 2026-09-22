# Ushly frontend foundation

T9.1 provides React, routing, themes, and shared interface components. T9.2 adds
the responsive application shell, header, footer, and placeholder navigation.
T9.3 adds the public homepage and a native-fetch link client. T9.5 adds the
in-memory API session lifecycle. T9.6 adds login and registration pages plus
header account actions. Management interfaces and analytics dashboards remain
unimplemented.

## Setup and commands

Use Node **22.12+ within Node 22** and npm. Development was verified on
Node 22.23.2 with TypeScript 5.9.3, matching the backend TypeScript version.
The existing `.nvmrc` selects Node 22. Run these commands from `frontend/`:

```bash
npm ci
npm run dev
```

Open the URL Vite prints, then `/dev/components` for the component library.
This route and its preview code are removed from production builds. The `/`
route is the public homepage; the product, legal, and authentication pages have
their own routes. Contact remains a placeholder.
Unknown routes have a basic fallback in the shared shell. Configure the API
origin as described under T9.3 below.

| Command                | Purpose                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| `npm run dev`          | Local Vite development server, bound to 127.0.0.1                    |
| `npm run lint`         | ESLint, TypeScript and React Hooks rules                             |
| `npm run typecheck`    | Strict TypeScript check, including tests and configuration           |
| `npm test`             | Bounded Vitest and Testing Library suite                             |
| `npm run test:watch`   | Optional interactive unit-test runner                                |
| `npm run build`        | Type check and production Vite build                                 |
| `npm run preview`      | Serve the built application locally                                  |
| `npm run format`       | Prettier; supplied assets and generated files are excluded           |
| `npm run format:check` | Verify formatting without writes                                     |
| `npm run test:browser` | Playwright responsive, keyboard, accessibility and production checks |

Before the first browser test, install Chromium:

```bash
npx playwright install chromium
npm run test:browser
```

Playwright starts its own development server on port 4173 and a production
build/preview server on port 4174, then closes both. Keep those ports free.
On Linux machines missing browser system libraries, follow Playwright's system
dependency instructions (`npx playwright install --with-deps chromium`). Browser
screenshots and failure traces go to ignored `test-results/`.

## Structure

```text
src/
  app/App.tsx              Route definitions and shared placeholder content
  layout/                 ApplicationLayout, Header, Footer, PageLayout, PageContainer
                          navigation.ts destinations and layout.css responsive styles
  assets/brand/            Original, unmodified SVG logos
  components/             Shared UI components and component behavior tests
  content/en.ts            Shared English labels; starting point for Italian later
  dev/                    Development-only component preview and its layout CSS
  styles/tokens.css        Color, spacing, typography and radius tokens
  styles/global.css       Base styles and reusable component styles
  theme/                  Preference validation, React context and provider
  test/setup.ts           Unit-test cleanup and minimal jsdom dialog shim
  main.tsx                React root, providers, router and local font import
public/
  favicon-*.png            Original, unmodified icon assets
  theme-init.js            Apply a saved preference before the first paint
  manifest-*.webmanifest  Theme-specific app identity and icon metadata
```

Add feature folders only when their features are implemented. Shared UI stays
in `components/`; future network calls belong in a dedicated client/service
layer, not these components. There is no global state library or CSS framework.

## Design tokens

Colors are CSS custom properties. Use the semantic token rather than adding
raw colors to component styles. The primary fill stays exactly `#FF7A00` in
both themes. Its dark foreground has a **6.96:1** contrast ratio; white text
would not provide sufficient contrast. Light-mode links use a darker orange.
Primary buttons also have a contrasting border in light mode.

| Token                            | Dark (default)        | Light                 |
| -------------------------------- | --------------------- | --------------------- |
| `--background`                   | `#121212`             | `#F7F8FA`             |
| `--surface`                      | `#1B1C20`             | `#FFFFFF`             |
| `--surface-raised`               | `#24262B`             | `#ECEEF2`             |
| `--text`                         | `#F5F5F6`             | `#20242B`             |
| `--text-muted`                   | `#B2B6BF`             | `#565E6C`             |
| `--border` (decorative)          | `#383B43`             | `#D3D7DE`             |
| `--border-control`               | `#7E8490`             | `#747B85`             |
| `--brand`                        | `#FF7A00`             | `#FF7A00`             |
| `--on-brand`                     | `#211206`             | `#211206`             |
| `--brand-ink`                    | `#FF9A42`             | `#A74600`             |
| `--focus`                        | `#FFB36B`             | `#A74600`             |
| `--success-bg` / `--success-ink` | `#163426` / `#81D6AB` | `#EAF6EF` / `#11613F` |
| `--warning-bg` / `--warning-ink` | `#3B2C14` / `#FFD17A` | `#FFF3D6` / `#794508` |
| `--danger-bg` / `--danger-ink`   | `#3D2226` / `#FFA4A4` | `#FFEDEF` / `#A72230` |

Supporting text on surfaces exceeds 4.5:1. Semantic text/background pairs are
at least 6.39:1. Interactive borders exceed 3:1 against their surfaces; quieter
decorative dividers are not used as the only way to identify an input/control.
Status messages use words as well as color.

- **Typography:** self-hosted Plus Jakarta Sans Variable, normal weights
  200–800. Browser unicode ranges select the needed font subset; no Google Fonts
  request is made. Use `system-ui` as the fallback. Default body: 15px/1.65;
  headings: 18–36px; labels and supporting text: 12–14px.
- **Spacing:** 4, 8, 12, 16, 24, 32 and 48px tokens.
- **Radii:** buttons exactly **12px**, inputs 10px, cards/dialogs 16px.
- **Focus:** 3px visible outline with 4px offset. Do not suppress it.
- **Targets:** buttons and tabs have a minimum height of 44px.
- **Responsive layout:** fluid components; wrapping action groups; preview
  uses two columns on desktop, one at 1000px or less, and compact spacing at
  600px or less. Tables retain readable columns inside a labeled, keyboard
  focusable horizontal scroll region. The page itself must not overflow.
- **Motion:** only loading spinners animate. `prefers-reduced-motion: reduce`
  stops animations and transitions; visible loading text remains.
- **Visual treatment:** flat surfaces, restrained borders, no gradients,
  backdrop blur, glowing effects or decorative shadows.

## Theme behavior and assets

`ThemeProvider` holds `dark | light` and `useTheme()` exposes the current theme
and setter. `localStorage['ushly.theme']` contains only this preference. Missing
or invalid values default to dark regardless of the operating-system theme.
Blocked storage still permits switching for the current tab. Storage events
synchronize open tabs; clearing the preference restores dark.

`public/theme-init.js` runs before CSS to avoid a wrong-theme flash. The React
provider then maintains the same root `data-theme`, `theme-color`, favicon,
apple-touch icon and manifest. Keep its storage key/default and metadata paths
aligned with `src/theme/theme.ts` when changing this contract. The small
bootstrap is deliberately plain JavaScript so it does not wait for React.

`BrandLogo` selects the supplied light/dark SVG and renders it next to the
word “Ushly”; the image has an empty alt attribute to avoid reading the brand
twice. The existing PNGs supply the favicon, apple-touch icon and 192/512px app
icons. All original artwork is preserved byte-for-byte. Manifests provide
app metadata only; there is no service worker or offline feature.

The homepage, four public product pages, and three legal pages are indexable and
prerendered in production. Placeholder routes remain non-indexable. Configure
`VITE_SITE_ORIGIN` to the actual public origin before deployment so every
public page receives its canonical URL and absolute social image URL.

## Component contracts

| Component                    | Usage and accessibility behavior                                                                                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Button`                     | Native button props; `variant="primary\|secondary\|quiet\|danger"`; defaults to `type="button"`. `loading` disables activation and sets `aria-busy`. Supply descriptive visible text, including the busy state.                |
| `Input`                      | Native input props plus required `label`, optional `hint` and `error`. Generated unique IDs connect labels/descriptions; error sets `aria-invalid`. Native required/disabled semantics stay intact.                            |
| `Card`                       | Named section with `title`, optional `description` and children. Title is an `h2`; place under the page's `h1`.                                                                                                                |
| `Dialog`                     | Controlled `open`, `onClose`, `title`, optional `description`, children. Native `showModal()` supplies modal focus behavior and inert background; Escape/close call `onClose`. Use the controlled API to close it.             |
| `Tabs`                       | `label` and items with stable unique `id`, `label`, `content`, optional `disabled`. Automatic activation with left/right arrows, Home/End; disabled tabs are skipped. Hidden panels remain mounted to preserve their contents. |
| `Table`                      | Native table props and children with a required `caption`. Use semantic `thead`, `tbody`, and `th scope`. A focusable labeled wrapper contains horizontal overflow.                                                            |
| `Badge`                      | `tone="neutral\|success\|warning\|danger"` and meaningful text. No meaning conveyed by color alone.                                                                                                                            |
| `Pagination`                 | Controlled `page`, `pageCount`, `onPageChange`. Previous/next are bounded; zero pages displays page 1 of 1 with both disabled. Two buttons keep very large totals lightweight.                                                 |
| `ToastProvider` / `useToast` | `notify(message, tone)` adds to a polite live region. Keeps at most five recent messages; explicit dismissal, no time limit, no automatic focus stealing. Put essential errors inline as well.                                 |
| `LoadingState`               | `label` in a status region plus decorative spinner. Set a surrounding data region's `aria-busy` when appropriate.                                                                                                              |
| `ErrorState`                 | `title`, `message`, optional `onRetry`; text is announced as an alert. Errors supplied here must be safe user-facing messages.                                                                                                 |
| `ThemeToggle`                | Sun/moon icon button with a changing accessible name and hover/focus tooltip; switches through the provider.                                                                                                                   |
| `BrandLogo`                  | Theme-aware supplied artwork and readable brand name.                                                                                                                                                                          |

Example:

```tsx
<Card title="Example input">
  <Input label="Name" hint="Choose an easy-to-recognize name." />
  <Button variant="secondary" onClick={() => setDialogOpen(true)}>
    Open dialog
  </Button>
</Card>
```

The native dialog is tested in a real browser: the jsdom shim deliberately
models only the open state, not focus confinement. Avoid replacing it with a
hand-written focus trap. Keep comments explaining these decisions.

## Test coverage and limits

Vitest tests cover persisted/default/invalid/blocked theme preferences,
cross-tab updates, theme-specific logos, busy/disabled buttons, input labels
and errors, tabs, pagination boundaries, dialogs, tables, badges, retry actions
and notification dismissal. Playwright checks both themes at 320, 768 and
1440px, axe WCAG A/AA rules, keyboard focus, native dialog behavior, storage,
reduced motion, long content, metadata/assets, and preview exclusion in the
production build.

Browser checks currently run in Chromium. Firefox, Safari/WebKit, physical
devices and manual screen-reader testing are not included. Automated axe checks
do not replace a manual accessibility assessment.

## Application layout (T9.2)

`ApplicationLayout` provides a skip link, `Header`, one focusable `main` with a
router `Outlet`, and `Footer`. It fills at least the viewport height without a
fixed footer. Navigation to a different path focuses main and resets scroll so
keyboard and screen-reader users have a predictable starting point.

`PageContainer` supplies the shared 1280px maximum width and 32px horizontal
padding (16px on small screens). `PageLayout` adds page spacing and an `h1`;
it deliberately does not nest another main landmark. Use these for later pages.

`navigation.ts` holds labels and routes shared by the header, footer and
placeholder routes. Product destinations are `/url-shortener`, `/qr-codes`,
`/analytics`, and `/features`; Resources use `/contact`; Legal uses
`/privacy`, `/cookies`, `/terms`; Account uses `/login` and `/register`.
The homepage at `/` contains the shortening form. Contact still reserves a
destination. The legal pages are project templates whose operator identity and
contact details must be configured and legally reviewed before production. The
development component preview stays outside the application shell to keep its
own landmarks intact.

Below 64rem, primary navigation becomes a disclosure with a native button and
`aria-expanded`/`aria-controls`. Hidden links are removed from keyboard navigation
by CSS. Links retain normal Tab navigation, without ARIA menu roles or a focus
trap. Escape closes the menu and restores trigger focus. Selecting a link closes
it; a pathname change resets header state, including history navigation.
Breakpoint changes close the disclosure and move focus if its control or links
would become hidden. Desktop navigation stays visible. The footer uses four
columns on desktop, two below 64rem, and one below 360px.

Account actions are router links using the existing button CSS, rather than
buttons pretending to navigate. The theme toggle reuses `Button` and
`useTheme`; inline decorative sun/moon SVGs indicate the available action, and
the accessible name changes between “Use light theme” and “Use dark theme”.
Its tooltip appears on hover or focus, can be hovered itself, and closes with
Escape. Existing persisted preference, blocked-storage behavior and theme
metadata are unchanged. No new dependencies, tokens, animation, or language
selector were introduced. Existing explanatory comments and original assets
were preserved.

Layout tests cover footer destinations, placeholders, active navigation,
landmarks, disclosure state, route focus, keyboard switching, tooltip dismissal,
theme persistence, browser history, breakpoint changes, and axe checks in both
themes at 320, 768 and 1440px. The earlier design-system suite remains in place.

## Public homepage and API client (T9.3)

Copy `.env.example` to `.env.local` and set these public build-time values:

- `VITE_API_ORIGIN`: the HTTP(S) origin serving the existing backend. Its
  `/links` endpoint creates links and `/:shortCode` serves redirects. For local
  development the example uses `http://localhost:3000`. Configure the frontend
  origin in backend `CORS_ALLOWED_ORIGINS`; this task does not change backend CORS.
- `VITE_SITE_ORIGIN`: the actual deployed frontend origin, without a path,
  credentials, query or fragment. Canonical, Open Graph URL and social image URLs
  are derived from it. When unset, those absolute tags are omitted rather than
  guessing a production domain. Set it before publishing and rebuild.
- `VITE_LEGAL_NAME`: the verified legal name of the production service operator.
- `VITE_LEGAL_CONTACT_EMAIL`: the verified address for privacy and deletion
  requests. Until configured, the legal templates show an explicit placeholder.

`VITE_*` values are embedded in browser assets. Never put secrets in them.
The API origin is also the short-link origin because the current QR endpoint
uses its request origin. Deploy the API/redirect origin consistently; do not
point returned short links at the frontend SPA server.

`src/features/home/` contains page content, the form, examples, styles and
metadata. `src/api/links.ts` makes native-fetch calls and validates the fields
used from responses. It sends exactly `{ url }` to `POST /links`, accepts only
HTTP(S) destinations up to 2,048 characters, and constructs share URLs from the
configured origin plus the validated alphanumeric short code. Server errors
are mapped to fixed messages rather than exposing arbitrary response bodies.
Requests time out after 15 seconds and creation is never automatically retried.
Copy failures leave a read-only, selectable short URL for manual copying.

There is no session lifecycle in T9.3. The homepage sends anonymous requests.
`ShortenForm` and the client accept an optional access-token argument in memory
for later authenticated integration. It is sent only in the Authorization
header; cookies are omitted and no credential is stored or logged. A rejected
authenticated request is never retried anonymously. The creation response does
not state ownership, so the UI does not infer ownership from it.

Anonymous visitors can generate and download QR codes after shortening.
`src/features/home/qr.ts` dynamically imports `qrcode@1.5.4` only when requested.
It encodes exactly the displayed/copied public short URL; no QR endpoint,
redirect, destination fetch, third-party service or credential is involved.
The initial encoder JavaScript chunk is the only on-demand asset request.
Input is capped at 2,048 UTF-8 bytes and must match the configured API origin,
an alphanumeric short-code path, and no credentials, query or fragment.
Output is capped at 64 KiB. SVG uses black on white, 512px, a four-module quiet
zone and error correction M, independently of the page theme.

The preview and download share a Blob URL, never injected SVG markup. Repeated
clicks do not queue generation. Failures show a safe retry message. Creating a
new link revokes the old URL, and pending results after replacement/unmount
are discarded before allocating a URL. Existing URLs are revoked on unmount.
Download feedback says the download was requested, not necessarily saved.
Scanning still uses normal redirect expiration/deactivation checks; generating
an image does not verify continued availability or record a click.

`GET /links/:id/qr` remains an authenticated owner-only backend resource with
unchanged authorization. The homepage does not call it. Anonymous links stay
anonymous; creating their QR images does not confer ownership. No public API,
session flow, database model, or rate limit changed. Existing creation limits
remain server-enforced; local QR work adds no server generation load.

The content describes implemented backend capabilities with their current
access restrictions. The privacy explanation reflects keyed IP pseudonymization,
referrer-origin storage and bounded user-agent storage; it does not promise
anonymous tracking, compliance certifications, unlimited usage or malware
scanning. Public short links are not a confidentiality mechanism. Anonymous
links are not automatically claimed after sign-up. FAQ answers about expiration,
disabling, analytics and QR access match the inspected backend services.

URL examples are labeled illustrations using reserved example domains. A
one-time, one-second movement sequence preserves full text contrast at every
frame; `prefers-reduced-motion` disables it. Text is stable and is not announced
repeatedly through a live region. FAQ uses native details/summary controls.
The shared Card title wrapper is a div to avoid an extra banner landmark; its
named section and h2 contract are unchanged. Existing comments are preserved.

### Static HTML and deployment

`npm run build` type-checks, builds browser assets, then runs
`scripts/prerender.mjs`. Vite's existing SSR build support compiles
`src/entry-server.tsx` into ignored `.prerender/`; React renders the homepage
and shared layout into `dist/index.html`, and the four public pages into their
own `dist/<route>/index.html` files. Their headings, content, and metadata are
present before JavaScript runs. The homepage form is
disabled in static markup with a no-JavaScript explanation, preventing a native
GET submission from putting destinations in the URL. React hydrates prerendered
routes and enables the homepage form. Theme hydration initially matches the server's dark
markup and then adopts the saved preference. No running SSR server is required.

Serve `dist/index.html` at `/`, each `dist/<route>/index.html` at its public
route, assets normally, and `dist/200.html` for other SPA route fallbacks. The
fallback is an empty, non-indexable shell. Configure these static routes and
fallback explicitly on your production host. Do not serve `.prerender/` or
`tests/` publicly.

Metadata includes title, description, robots, canonical support, Open Graph,
Twitter summary and descriptive logo image text. Structured data is only a
`WebSite` matching the actual content, without invented reviews, ratings,
organization details or feature claims. `RouteMetadata` removes home-only tags
on client navigation and replaces them with the destination page's metadata.
Metadata generation
uses escaped configuration and fixed application text, never submitted URLs.

See React's [renderToString documentation](https://react.dev/reference/react-dom/server/renderToString)
and Vite's [SSR/prerender documentation](https://vite.dev/guide/ssr) for the
underlying build-time rendering APIs. The approved `qrcode@1.5.4` dependency
is for on-demand browser QR encoding. `@types/qrcode` and the independent
`jsqr@1.4.0` decoder are development-only dependencies.

### T9.3 verification scope

Component tests mock fetch while exercising the real frontend client: empty and
invalid submissions, pending requests, success, safe failures, rate limits,
invalid response codes, copying/fallback, authenticated headers, QR failures,
download attributes and Blob cleanup. Browser tests mock the inspected backend
contracts and exercise real clipboard/download behavior. They also cover both
themes at 320/768/1440px, keyboard focus, reduced motion, axe rules, production
HTML without JavaScript, configured metadata and saved-theme hydration.
The anonymous QR browser flow exercises the real production encoder, downloads
the SVG, rasterizes it and decodes the actual artifact using the independent
jsQR test decoder. Tests assert exact short-URL equality, no QR API/redirect
request, on-demand encoder loading, mobile/desktop accessibility in both themes,
and safe failure/retry. Unit tests cover byte limits and stale-generation/Blob
cleanup. Backend route regressions use the real JWT/route guards with mocked
persistent lookup and verify unauthenticated, invalid-token, foreign-link and
anonymous-link rejection, plus owner success. They require no live database.
A live backend smoke test requires a running API/database/Redis stack and was
unavailable during this implementation. Chromium is the configured browser;
Firefox/WebKit, physical devices and manual screen-reader checks are not covered.

## API session lifecycle (T9.5)

`src/api/session.ts` provides the typed native-fetch session client for later
authenticated pages. The browser calls `POST /auth/refresh` on startup to
restore an access token from the backend's rotating HttpOnly cookie. Login uses
`POST /auth/login` with exactly `{ email, password }`; logout uses
`POST /auth/logout`. These requests use `credentials: 'include'`, `no-store`,
and a 15-second timeout. The backend controls cookie attributes and CORS; the
frontend sends no custom CSRF field because the backend defines none.

The access token exists only in the client instance and is sent to protected
endpoints as a bearer header. It is never stored in browser storage, put into
a URL, or exposed through `useSession()`. Concurrent refresh calls share one
promise. A protected request retries once after a successful refresh; a second
401 clears the local session. A temporary network failure yields a typed safe
error without displaying backend diagnostics. Explicit logout clears local
state and asks the backend to revoke the refresh cookie.

Refresh returns an access token and a read-only `googleLinkAvailable` flag, so
after reload `useSession()` reports an authenticated session with `user: null`.
The user profile is available in
memory immediately after login. A later account UI must not infer a user
profile from the JWT. Google OAuth's callback also sets the refresh cookie;
returning to the frontend uses the same startup refresh flow. T9.6 adds the
Google action in the auth pages.

Deploy the frontend origin in backend `CORS_ALLOWED_ORIGINS`. Cross-site cookie
deployments require the backend's `COOKIE_SAME_SITE=none` and secure HTTPS
cookie settings; same-site deployments can retain the existing stricter
setting. The browser cannot override the backend's HttpOnly, SameSite, Secure,
or cookie-path rules.

## Authentication pages (T9.6)

`/login` and `/register` are responsive, noindex pages that reuse the shared
theme, brand, form controls, and the supplied WebP backgrounds in
`public/images/`. Form submission stays disabled until JavaScript hydrates,
so a browser without JavaScript cannot send a password through a native GET
submission. Registration sends only `{ email, password }`; confirm password is
checked locally and is never included in the request. Because registration does
not create a session in the backend, the page signs in with the same validated
credentials before navigating to the dashboard.

Google login opens the existing `GET /auth/google` flow in a popup. The backend
callback sends only a success status or safe error code to configured frontend
origins with `postMessage`, then closes the popup. The auth page verifies the
API origin and popup window before refreshing its session. If an OAuth email
conflict occurs, the page explains how to log in with an existing method and
use the password-confirmed Link Google action in the authenticated header. Link
Google sends only `{ password }` to `POST /auth/google/link` with the in-memory
bearer token and opens only a validated Google authorization URL. The backend
remains responsible for checking the password, ownership, and identity mapping;
the header confirms successful linking after the callback.

The authenticated account controls provide Link Google and Log out actions.
Logout calls the existing backend endpoint and clears local session state.

## Authenticated dashboard (T9.7)

`/dashboard` and its Links, Analytics, QR Codes, and Settings routes are guarded
by the in-memory session state. Session restoration shows a bounded loading
state; anonymous sessions are redirected to `/login`. The dashboard uses its
own responsive sidebar and does not render the public header or footer.

The dashboard client calls only the existing owner-scoped link routes. Links
supports creation, pagination, destination/title/expiration editing,
activation, deactivation, and deletion. Analytics selects one owned link and
uses its statistics endpoint. QR Codes retrieves the owner-authorized SVG and
downloads that response without putting a bearer token in a URL. A protected
request still retries once through the T9.5 refresh flow, and persistent 401s
clear the local session while the backend remains the ownership boundary.

## Link management and QR interface (T9.8)

`/dashboard/links` uses the existing owner-scoped link contracts for creation,
bounded pagination, editing, activation, deactivation, deletion, and QR access.
The responsive semantic table becomes stacked rows on narrow screens without
filtering only the current page; the backend currently exposes pagination but
no search query. Destructive actions use confirmation dialogs, and URL and
future-expiration checks provide immediate feedback before server validation.

Copy feedback is temporary and accessible. QR previews are requested with the
in-memory bearer token, rendered from a short-lived Blob URL, and downloaded as
SVG. The Blob URL is revoked when the dialog closes or the component unmounts;
access tokens are never placed in the image or download URL.
