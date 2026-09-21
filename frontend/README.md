# Ushly frontend foundation

T9.1 provides React, routing, themes, and shared interface components. It does
not call the backend or implement product pages, navigation, authentication,
link management, or analytics.

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
route is a small foundation placeholder; unknown routes have a basic fallback.
`BrowserRouter` requires a deployment fallback to `index.html` for client-side
routes. No proxy or backend API configuration is needed for this task.

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
  app/App.tsx              Route definitions and foundation placeholder
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

The foundation has `noindex, nofollow` metadata. Public-page SEO metadata and
a real canonical deployment URL belong to the later public-page tasks.

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
| `ThemeToggle`                | Named button that switches themes through the provider.                                                                                                                                                                        |
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
