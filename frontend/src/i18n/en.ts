import type { TranslationShape } from './types.ts';

const legalPages = {
  '/privacy': {
    pageTitle: 'Privacy Policy',
    description:
      'How Ushly handles account data, short links, redirect analytics, IP pseudonymization, authentication, and privacy requests.',
    eyebrow: 'Privacy',
    title: 'Privacy Policy',
    lead: 'This policy explains the data used by the current Ushly project and the safeguards built into its link and account features.',
    sections: [
      {
        title: 'Who is responsible',
        paragraphs: [
          'The service operator is {{legalName}}. Privacy and deletion requests should be sent to {{contactEmail}}. These configurable placeholders must be replaced with verified operator details before production launch.',
        ],
      },
      {
        title: 'Accounts and authentication',
        paragraphs: [
          'Local accounts use an email address and a one-way password hash. Access tokens stay in browser memory. A rotating refresh token is stored in a path-scoped HttpOnly cookie and as a cryptographic hash in the database.',
          'If you choose Google sign-in or explicitly link Google, Ushly receives the Google account subject and email needed to identify the account. Ushly does not automatically merge accounts based only on matching email addresses.',
        ],
      },
      {
        title: 'Short links and redirects',
        paragraphs: [
          'Ushly stores the destination URL, generated short code, optional title and expiration, link status, and ownership when a signed-in user creates the link. Anonymous links are not attached to an account.',
          'Destinations are public through their short URLs. Do not place secrets or sensitive query values in a destination you intend to share.',
        ],
      },
      {
        title: 'Click analytics and minimization',
        paragraphs: [
          'When a short link redirects, Ushly records a keyed one-way HMAC of the visitor IP address rather than the clear IP address. It may also store a user-agent value limited to 256 characters and the referrer origin, without its path or query, limited to 256 characters. No geolocation provider is currently enabled.',
          'Click analytics are available only to the authenticated owner of the link. The configured click-retention policy defaults to 90 days. Automated scheduled deletion is still pending operational implementation, so the deployment operator must review and enforce retention before production launch.',
        ],
      },
      {
        title: 'Deletion and privacy requests',
        paragraphs: [
          'Use the configured contact email to request access, correction, or deletion. The production operator must verify the requester, define applicable response procedures, and document any records that must be retained. Ushly does not currently provide a public self-service privacy-request form.',
        ],
      },
      {
        title: 'Future tools',
        paragraphs: [
          'Ushly does not currently load optional third-party audience analytics or advertising tools. If either is introduced later, this policy and the consent controls must be updated before those tools are enabled where consent is required.',
        ],
      },
    ],
  },
  '/cookies': {
    pageTitle: 'Cookie Policy',
    description:
      'How Ushly uses essential authentication cookies and stores optional consent preferences without loading optional tracking tools.',
    eyebrow: 'Cookies',
    title: 'Cookie Policy',
    lead: 'Essential session features work regardless of optional consent. Ushly currently loads no optional analytics or advertising tools.',
    sections: [
      {
        title: 'Essential authentication cookies',
        paragraphs: [
          'After authentication, Ushly uses a rotating refresh-token cookie to restore and end your session. It is HttpOnly, restricted to authentication routes, and Secure in production. Its SameSite behavior and lifetime are configured by the deployment operator.',
          'Google OAuth uses short-lived, HttpOnly state cookies to protect sign-in and explicit account-linking flows. These cookies are required only when that flow is used.',
        ],
      },
      {
        title: 'Consent preference storage',
        paragraphs: [
          'Your Accept all, Reject non-essential, or customized choice is stored in this browser using local storage. This record is not an authentication cookie and does not contain an access token, refresh token, password, or provider data.',
        ],
      },
      {
        title: 'Optional analytics and advertising',
        paragraphs: [
          'No optional audience analytics or advertising provider is implemented, so accepting these categories does not load a tool or create an optional cookie today. The controls record your preference for future use only. Ushly must identify any future provider and update these pages before enabling it.',
        ],
      },
      {
        title: 'Change your choice',
        paragraphs: [
          'Use Cookie settings in the footer at any time. Rejecting optional categories does not disable URL shortening, redirects, account authentication, or the essential session cookie.',
        ],
      },
    ],
  },
  '/terms': {
    pageTitle: 'Terms of Service',
    description:
      'Template terms for using Ushly short links, QR codes, accounts, link controls, and owner-only analytics.',
    eyebrow: 'Legal',
    title: 'Terms of Service',
    lead: 'These template terms describe the current Ushly project and require legal review and verified operator details before production launch.',
    sections: [
      {
        title: 'Service operator and status',
        paragraphs: [
          'The service operator is {{legalName}}, contactable at {{contactEmail}}. These are configurable placeholders, and this document is a project template rather than production-ready legal advice.',
        ],
      },
      {
        title: 'What Ushly provides',
        paragraphs: [
          'Ushly creates short links for HTTP and HTTPS destinations, generates QR images for those short URLs, records privacy-conscious redirect analytics, and lets authenticated owners manage link expiration and active status.',
          'Service availability, permanent storage, and uninterrupted redirects are not guaranteed by this project template.',
        ],
      },
      {
        title: 'Your responsibilities',
        paragraphs: [
          'You are responsible for destinations and content you share, protecting your account credentials, and ensuring you have permission to process or publish the information involved. Do not use Ushly for unlawful, deceptive, abusive, or harmful activity.',
        ],
      },
      {
        title: 'Links, QR codes, and analytics',
        paragraphs: [
          'A QR code contains the public Ushly short URL; it does not independently track scans. Redirect analytics belong to the short link and are restricted to its authenticated owner. Disabled, deleted, or expired links stop redirecting.',
        ],
      },
      {
        title: 'Accounts and termination',
        paragraphs: [
          'The operator may restrict access needed to protect the service or respond to misuse. Account deletion and related data handling must be requested through the configured contact channel until a self-service process is implemented.',
        ],
      },
      {
        title: 'Changes before launch',
        paragraphs: [
          'The production operator must review applicable law, add effective dates and jurisdiction-specific terms, verify contact details, and revise this template when the service or its data practices change.',
        ],
      },
    ],
  },
} as const;

const publicPages = {
  '/url-shortener': {
    title: 'Free URL shortener for simple, shareable links',
    pageTitle: 'Free URL Shortener',
    description:
      'Create a free short URL for an HTTP or HTTPS destination. Copy it, visit it, or make a QR code without an account.',
    eyebrow: 'URL Shortener',
    lead: 'Turn a long web address into a compact public link. Paste a destination on the homepage, then copy the result or open it in a new tab.',
    visual: 'link',
    visualLabel: 'One destination. One short link.',
    heroActions: [
      { label: 'Shorten a URL', to: '/', style: 'primary' },
      { label: 'Explore features', to: '/features', style: 'secondary' },
    ],
    finalCta: {
      title: 'Ready to understand your links?',
      text: 'Create an account to make owned links and use authenticated click analytics. Already have an account? Log in to continue.',
      actions: [
        { label: 'Get started free', to: '/register', style: 'primary' },
      ],
    },
    highlights: [
      {
        title: 'Create without an account',
        text: 'Anonymous visitors can shorten HTTP and HTTPS URLs up to 2,048 characters.',
      },
      {
        title: 'Share the result',
        text: 'Copy the generated short URL or open it with the Visit URL action.',
      },
      {
        title: 'Add a QR code',
        text: 'Create and download an SVG QR code from the same public short URL.',
      },
    ],
    steps: [
      'Paste a complete HTTP or HTTPS URL.',
      'Select Shorten link on the homepage.',
      'Copy, visit, or make a QR code from the result.',
    ],
    faqs: [
      {
        question: 'Can I shorten a URL without signing in?',
        answer:
          'Yes. Anonymous visitors can create a short link on the homepage. It is not automatically claimed if you later register.',
      },
      {
        question: 'What happens when someone opens a short link?',
        answer:
          'Ushly redirects them to the saved destination while the link is active and unexpired.',
      },
    ],
  },
  '/qr-codes': {
    title: 'Free QR code generator for short links',
    pageTitle: 'Free QR Code Generator for Short Links',
    description:
      'Generate and download an SVG QR code for a new Ushly short link in your browser, without an account.',
    eyebrow: 'QR Codes',
    lead: 'After shortening a URL, open QR beside your new link. Ushly creates the code in your browser from the public short URL.',
    visual: 'qr',
    visualLabel: 'A scannable route to your short link.',
    heroActions: [{ label: 'Make a QR code', to: '/', style: 'primary' }],
    finalCta: {
      title: 'Need tracked QR codes with analytics?',
      text: 'Ushly creates QR codes for short links, so you can share them and view click analytics when you use an authenticated account.',
      actions: [
        { label: 'Get started free', to: '/register', style: 'primary' },
      ],
    },
    highlights: [
      {
        title: 'Generated locally',
        text: 'The homepage creates the QR image in your browser without a QR API request.',
      },
      {
        title: 'Download SVG',
        text: 'Save a scalable image from the QR popover after generation finishes.',
      },
      {
        title: 'Same link behavior',
        text: 'The code contains the public short URL; expiration and deactivation still apply.',
      },
    ],
    steps: [
      'Shorten a destination on the homepage.',
      'Select QR beside the resulting short URL.',
      'Download the generated SVG image.',
    ],
    faqs: [
      {
        question: 'What does the QR code contain?',
        answer:
          'It contains the exact public Ushly short URL shown in the shortening result, not the original destination.',
      },
      {
        question: 'Does a QR code keep working after a link is disabled?',
        answer:
          'The image remains scannable, but an expired or disabled short link no longer redirects.',
      },
      {
        question: 'What is a QR code?',
        answer:
          'A QR code is a scannable pattern that can open a URL. Ushly encodes the public short URL inside the image.',
      },
      {
        question: 'Is this QR code generator free?',
        answer:
          'Yes. After creating a short link on the homepage, you can generate and download its QR code without an account.',
      },
    ],
  },
  '/analytics': {
    title: 'Link analytics for your short URLs',
    pageTitle: 'Short Link Analytics',
    description:
      'View click totals, trends, referrer origins, and user-agent statistics for short links you own in the Ushly dashboard.',
    eyebrow: 'Analytics',
    lead: 'Ushly records redirect clicks and shows link analytics only to the authenticated owner in the dashboard.',
    visual: 'analytics',
    visualLabel: 'Owner-only click insights.',
    heroActions: [
      { label: 'Get started', to: '/register', style: 'primary' },
      { label: 'Explore features', to: '/features', style: 'secondary' },
    ],
    finalCta: {
      title: 'Create an account to explore link analytics',
      text: 'Register to create owned links and view their click statistics in the dashboard.',
      actions: [
        { label: 'Get started free', to: '/register', style: 'primary' },
      ],
    },
    highlights: [
      {
        title: 'Follow activity over time',
        text: 'The dashboard reports click totals and a time series for a selected period.',
      },
      {
        title: 'Understand sources',
        text: 'See referrer origins and limited user-agent breakdowns for owned links.',
      },
      {
        title: 'Respect visitor privacy',
        text: 'Click records store a keyed, one-way IP hash rather than a clear IP address.',
      },
    ],
    steps: [
      'Create a link after signing in.',
      'Share the link and let visitors follow it.',
      'Open Analytics in the dashboard and select a link you own.',
    ],
    faqs: [
      {
        question: 'Can anyone view a link’s analytics?',
        answer:
          'No. Statistics are available only to the authenticated owner of that link.',
      },
      {
        question: 'Where can I view short-link analytics?',
        answer:
          'Sign in, open Analytics in the dashboard, and select one of your links to view its click statistics.',
      },
    ],
  },
  '/features': {
    title: 'URL shortener features for sharing and managing links',
    pageTitle: 'URL Shortener Features',
    description:
      'Explore Ushly short links, browser-generated QR codes, owner-only click analytics, and link expiration and status controls.',
    eyebrow: 'Features',
    lead: 'Start with a public short link. Ushly also supports QR sharing, owner-only statistics, and controls for a link’s lifetime.',
    visual: 'features',
    visualLabel: 'A focused set of link tools.',
    heroActions: [
      { label: 'Shorten a link', to: '/', style: 'primary' },
      { label: 'Get started', to: '/register', style: 'secondary' },
    ],
    finalCta: {
      title: 'Get more from the links you share',
      text: 'Sign up to create owned links with management and analytics access, or sign in to continue with your account.',
      actions: [
        { label: 'Get started free', to: '/register', style: 'primary' },
      ],
    },
    highlights: [
      {
        title: 'Free short links',
        text: 'Create and copy a short URL from the homepage without an account.',
      },
      {
        title: 'QR sharing',
        text: 'Generate an SVG QR code in your browser from a new short link.',
      },
      {
        title: 'Owner-only analytics',
        text: 'Authenticated owners can view click statistics in the dashboard.',
      },
      {
        title: 'Lifetime controls',
        text: 'Authenticated owners can set expiration dates and deactivate or reactivate their links.',
      },
    ],
    steps: [
      'Create a short URL.',
      'Share it directly or as a QR code.',
      'Use the dashboard to manage owned links and view their statistics.',
    ],
    faqs: [
      {
        question: 'Which features work without an account?',
        answer:
          'Homepage URL shortening, copying the result, and browser-generated QR downloads work anonymously.',
      },
      {
        question: 'What requires ownership?',
        answer:
          'Link management and click statistics require authentication and are restricted to the link owner.',
      },
      {
        question: 'Can I set an expiration date for a link?',
        answer:
          'Yes. Authenticated owners can set an expiration date when creating or editing a link. An expired link no longer redirects.',
      },
      {
        question: 'Can I disable and reactivate a link?',
        answer:
          'Yes. Authenticated owners can change a link’s active status in the dashboard. A disabled link does not redirect until reactivated.',
      },
      {
        question: 'Do QR codes include analytics?',
        answer:
          'The QR image does not track scans. It contains an Ushly short URL; clicks on an owned short URL can appear in that link’s analytics.',
      },
    ],
  },
} as const;

const homeTitle = 'Free URL Shortener with QR Codes and Analytics';
const homeDescription =
  'Shorten long URLs for free with Ushly. Copy a shareable link, generate a QR code without an account, and learn about owner-only analytics and link expiration.';
const features = [
  {
    kind: 'shorten',
    title: 'Free URL shortening',
    text: 'Turn an HTTP or HTTPS destination into a compact link you can share.',
    benefits: [
      'No account needed to create a link',
      'Copy the result in one step',
      'Public short links redirect to your destination',
    ],
  },
  {
    kind: 'qr',
    title: 'QR code generation',
    text: 'Create a QR code from your public short URL directly in your browser.',
    benefits: [
      'Available after shortening',
      'Download as SVG',
      'No account needed on the homepage',
    ],
  },
  {
    kind: 'analytics',
    title: 'Privacy-conscious click analytics',
    text: 'The owner dashboard provides click statistics while storing a keyed hash of visitor IP addresses.',
    benefits: [
      'Click totals and time series',
      'Referrer and user-agent breakdowns',
      'No clear IP addresses in click records',
    ],
  },
  {
    kind: 'lifetime',
    title: 'Link expiration and status control',
    text: 'Authenticated owners can set an expiration date or deactivate and reactivate a link through the API.',
    benefits: [
      'Optional future expiration date',
      'Deactivate or reactivate owned links',
      'Expired and disabled links stop redirecting',
    ],
  },
] as const;
const faqs = [
  {
    question: 'How does URL shortening work?',
    answer:
      'Ushly saves your destination and creates a short code. Opening the short link redirects visitors to that destination. This form accepts HTTP and HTTPS URLs up to 2,048 characters.',
  },
  {
    question: 'Can I create and download a QR code?',
    answer:
      'Yes. Shorten a URL, select QR, then download its SVG image. Generation happens in your browser and needs no account. Scanning the code follows the short link, so expiration and disabling still apply.',
  },
  {
    question: 'What analytics are available?',
    answer:
      'The dashboard provides authenticated owners with click totals, time series, referrer origins and user-agent breakdowns. Analytics are never public.',
  },
  {
    question: 'Can a short link expire?',
    answer:
      'Yes. The API accepts a future expiration date. An expired link stops redirecting. This homepage creates links without a scheduled expiration.',
  },
  {
    question: 'What happens when a link is disabled?',
    answer:
      'A disabled link stops redirecting. Authenticated owners can disable or reactivate their links through the API. Expiration still applies to reactivated links.',
  },
  {
    question: 'What is the difference between anonymous and authenticated use?',
    answer:
      'Anonymous visitors can create and copy links and generate their QR codes locally. Authenticated API requests associate new links with their owner for management and analytics. Anonymous links are not automatically claimed when you later sign up. Account pages are not available yet.',
  },
  {
    question: 'Are short links private or safe for confidential URLs?',
    answer:
      'No. Anyone with a short URL can follow it. Avoid shortening confidential destinations or URLs containing access credentials. Ushly accepts only HTTP and HTTPS destinations.',
  },
  {
    question: 'How are click records handled?',
    answer:
      'Click records store a keyed, one-way hash of the visitor’s IP address rather than the clear IP. They also include a click time, referrer origin and limited user-agent string. This is pseudonymous analytics, not anonymous tracking.',
  },
];

export const en = {
  locale: 'en',
  languageName: 'English',
  layout: {
    skip: 'Skip to content',
    home: 'Ushly home',
    primary: 'Primary',
    menu: 'Menu',
    closeMenu: 'Close menu',
    nav: ['URL Shortener', 'QR Codes', 'Analytics', 'Features'],
    login: 'Log in',
    getStarted: 'Get started',
    product: 'Product',
    resources: 'Resources',
    legal: 'Legal',
    account: 'Account',
    privacy: 'Privacy Policy',
    cookies: 'Cookie Policy',
    terms: 'Terms of Service',
    cookieSettings: 'Cookie settings',
    footerDescription: 'Short links, QR codes, and owner-only analytics.',
    copyright: '© 2026 Ushly. All rights reserved.',
    language: 'Language',
    selectLanguage: 'Select language',
    lightTheme: 'Use light theme',
    darkTheme: 'Use dark theme',
    logout: 'Log out',
    loggedOut: 'You have logged out.',
    logoutWarning:
      'You are signed out here, but the server could not confirm logout. Please try again when connected.',
  },
  common: {
    loading: 'Loading',
    retry: 'Try again',
    previous: 'Previous',
    next: 'Next',
    pagination: 'Pagination',
    page: 'Page',
    of: 'of',
    results: 'results',
    cancel: 'Cancel',
    confirm: 'Confirm',
    closeDialog: 'Close dialog',
    notifications: 'Notifications',
    dismissNotification: 'Dismiss notification',
    unknownError: 'Something went wrong. Please try again.',
    noClicks: 'No clicks',
    never: 'Never',
    anonymous: 'Anonymous',
    account: 'Account',
    authenticatedUser: 'Authenticated user',
    active: 'Active',
    disabled: 'Disabled',
    expired: 'Expired',
    enabled: 'Enabled',
    enable: 'Enable',
    disable: 'Disable',
    edit: 'Edit',
    delete: 'Delete',
    copy: 'Copy',
    copied: 'Copied',
    visit: 'Visit',
    download: 'Download',
    actions: 'Actions',
    status: 'Status',
    expiration: 'Expiration',
    link: 'Link',
    owner: 'Owner',
    created: 'Created',
    rowsPerPage: 'Rows per page',
    untitledLink: 'Untitled link',
    unavailable: 'Page unavailable',
    unavailableText:
      'This page is not available yet. Ushly’s public pages and account features are coming in later updates.',
    returnUshly: 'Return to Ushly',
    componentLibrary: 'Explore the component library',
  },
  auth: {
    welcome: 'Welcome to Ushly',
    loginTitle: 'Log in to Ushly',
    registerTitle: 'Create an account',
    loginIntro: 'Access your account to continue managing your links.',
    registerIntro:
      'Create an account to manage your links and access their click analytics.',
    signedIn: 'You’re signed in.',
    sessionReady: 'Your session is ready.',
    openDashboard: 'Open dashboard',
    continueGoogle: 'Continue with Google',
    googlePending:
      'Complete sign-in in the Google window. This page will update automatically.',
    cancelGoogle: 'Cancel Google sign-in',
    or: 'or',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    createAccount: 'Create account',
    login: 'Log in',
    already: 'Already have an account?',
    new: 'New to Ushly?',
    legalPrefix: 'By creating an account, you agree to our',
    and: 'and',
    javascript:
      'Enable JavaScript to submit credentials securely without putting them in the page URL.',
    validEmail: 'Enter a valid email address.',
    passwordLength: 'Use a password between 8 and 128 characters.',
    enterPassword: 'Enter your password.',
    passwordMismatch: 'Passwords do not match.',
    accountReady: 'Your account is ready.',
    googleNotConfigured:
      'Google sign-in is not configured yet. Please try again later.',
    popupBlocked: 'Allow the Google sign-in window, then try again.',
    googleClosed:
      'Google sign-in was closed before it finished. Please try again.',
    googleTimeout: 'Google sign-in timed out. Please try again.',
    googleFailed: 'Google sign-in could not be completed. Please try again.',
    linkGoogle: 'Link Google account',
    linkTitle: 'Link Google to your account',
    linkDescription:
      'For password accounts, confirm your current password before connecting a Google identity. Your accounts are never merged based only on email.',
    currentPassword: 'Current password',
    verifyLink: 'Verify and link Google',
    cancelLink: 'Cancel Google linking',
    linkSuccess: 'Google account linked successfully.',
    linkClosed:
      'Google linking was closed before it finished. Please try again.',
    linkTimeout: 'Google linking timed out. Please try again.',
    linkConflict:
      'This Google identity is already connected to another account. No accounts were merged.',
    linkFailed: 'Google linking could not be completed. Please try again.',
    linkConfirmFailed:
      'Google linking could not be confirmed. Please log in and try again.',
    linkNotConfigured:
      'Google linking is not configured yet. Please try again later.',
    linkPassword: 'Enter your account password to link Google.',
    linkPopup: 'Allow the Google linking window, then try again.',
    linkStartFailed: 'Could not start Google linking. Please try again.',
    linkPending:
      'Complete linking in the Google window. This page will update automatically.',
    conflict:
      'This Google identity may belong to an existing account. Log in with your existing method, then open Dashboard Settings, choose Link Google account, and verify your password. Accounts are never merged based only on email.',
  },
  dashboard: {
    skip: 'Skip to dashboard content',
    label: 'Dashboard',
    navigation: 'Dashboard navigation',
    restoring: 'Restoring your session…',
    closeMenu: 'Close dashboard menu',
    close: 'Close',
    menu: 'Menu',
    nav: ['Overview', 'Links', 'Analytics', 'QR Codes', 'Settings'],
    admin: 'Admin',
    account: 'Account',
    authenticatedUser: 'Authenticated user',
    loadingWorkspace: 'Loading your workspace…',
    loadError: 'We couldn’t load this view.',
    tryAgain: 'Try again',
    workspace: 'Workspace',
    overview: 'Overview',
    overviewLead: 'Manage your Ushly links, QR codes, and click insights.',
    createLink: 'Create a link',
    linkSummary: 'Link summary',
    totalLinks: 'Total links',
    activePage: 'Active on this page',
    qrReady: 'QR ready',
    recentLinks: 'Recent links',
    latestLinks: 'Your latest owned links.',
    viewAll: 'View all',
    noLinks: 'No links yet',
    noLinksText:
      'Create your first shortened link to start building your workspace.',
    links: {
      eyebrow: 'Manage',
      pageTitle: 'Links',
      lead: 'Create and manage the short links owned by your account.',
      createTitle: 'Create a short link',
      createLead: 'Only HTTP and HTTPS destinations are supported.',
      destination: 'Destination URL',
      titleOptional: 'Title (optional)',
      title: 'Title',
      titlePlaceholder: 'Campaign link',
      expiresOptional: 'Expires at (optional)',
      expires: 'Expires at',
      shorten: 'Shorten link',
      loading: 'Loading your links…',
      empty: 'No owned links',
      emptyText:
        'Create your first link above. Links created while signed in will appear here.',
      yours: 'Your links',
      showing: 'Showing',
      caption: 'Short links owned by your account',
      urlRequired: 'Enter a destination URL.',
      urlLong: 'The destination URL is too long.',
      urlProtocol: 'Use an HTTP or HTTPS URL.',
      urlComplete: 'Enter a complete URL, including https://.',
      futureExpiration: 'Choose a future expiration date and time.',
      updateError: 'The link could not be updated. Please try again.',
      created: 'Link created successfully.',
      updated: 'Link updated successfully.',
      deactivated: 'Link deactivated.',
      enabled: 'Link enabled.',
      deleted: 'Link deleted.',
      copyUnavailable:
        'Copy is unavailable. Select the short URL and copy it manually.',
      shortCopied: 'Short URL copied',
      copyShort: 'Copy short URL',
      visitShort: 'Visit short URL',
      qrAction: 'Preview and download QR code',
      editLink: 'Edit link',
      disableLink: 'Disable link',
      enableLink: 'Enable link',
      deleteLink: 'Delete link',
      editDescription:
        'Update this owned link. Expiration must be in the future.',
      deleteQuestion: 'Delete link?',
      disableQuestion: 'Disable link?',
      deleteDescription:
        'This permanently removes the link and its owner access. This action cannot be undone.',
      disableDescription:
        'The public short URL will stop redirecting until you enable it again.',
      downloadQr: 'Download QR code',
      loadingQr: 'Loading QR code…',
      saveChanges: 'Save changes',
      qrDescription: 'This QR code contains',
      qrAlt: 'QR code for',
      downloadSvg: 'Download SVG',
    },
    analytics: {
      eyebrow: 'Insights',
      title: 'Analytics',
      lead: 'Review owner-only click activity for one link at a time.',
      loading: 'Loading analytics…',
      loadingClicks: 'Loading click analytics…',
      loadError: 'Analytics could not be loaded.',
      empty: 'No analytics yet',
      emptyText:
        'Create an owned link first. Click analytics will appear here after visits are recorded.',
      link: 'Link',
      from: 'From (UTC)',
      to: 'To (UTC)',
      granularity: 'Granularity',
      hour: 'Hour',
      day: 'Day',
      week: 'Week',
      apply: 'Apply range',
      refresh: 'Refresh',
      invalidRange: 'Choose a UTC start time earlier than the end time.',
      rangeLong: 'The statistics range cannot exceed 90 days.',
      total: 'Total clicks',
      first: 'First click · UTC',
      last: 'Last click · UTC',
      series: 'Clicks over time',
      noPeriod: 'No clicks in this period',
      noPeriodText: 'Visits will appear here after the short URL is opened.',
      referrers: 'Referrers',
      referrerLead: 'Top recorded referrer origins.',
      noReferrers: 'No referrer data in this period.',
      agents: 'User agents',
      agentsLead: 'Top recorded browser user-agent values.',
      noAgents: 'No user-agent data in this period.',
      direct: 'Direct',
      summary: 'Analytics summary',
      allUtc: 'All statistics use UTC. Range:',
      rangeTo: 'to',
      buckets: 'buckets · UTC',
      clicks: 'clicks',
      newestPrefix: 'Showing the newest',
      newestMiddle: 'of',
      newestSuffix: 'links. Use Links to manage the full dataset.',
      largePrefix: 'Large dataset: showing the first',
      largeMiddle: 'of',
      largeSuffix: 'buckets. Choose day or week for a complete compact view.',
    },
    qr: {
      eyebrow: 'Share',
      title: 'QR Codes',
      lead: 'Download the QR code generated for an owned short link.',
      loading: 'Loading QR codes…',
      loadError: 'The QR code could not be loaded.',
      empty: 'No QR codes available',
      emptyText:
        'Create an owned link first. Ushly generates its QR code from the public short URL.',
      choose: 'Choose a link',
      explanation:
        'QR codes encode the Ushly short URL. Analytics are recorded when that short URL is opened.',
      download: 'Download SVG',
      generating: 'Generating QR code…',
      alt: 'QR code for',
    },
    settings: {
      eyebrow: 'Account',
      title: 'Settings',
      lead: 'Review the authentication methods connected to your Ushly account.',
      methods: 'Authentication methods',
      methodsLead: 'Review the methods connected to your Ushly account.',
      email: 'Account email',
      emailFallback: 'Available after your next password login',
      google: 'Google account',
      linked: 'Google account linked',
      notLinked: 'Not linked',
      link: 'Link Google account',
    },
  },
  admin: {
    eyebrow: 'Administration',
    label: 'Administration',
    global: 'Global statistics',
    users: 'Users',
    links: 'Links',
    globalLead: 'Review aggregate click activity across the service.',
    usersLead: 'Filter accounts and control whether they can authenticate.',
    linksLead:
      'Filter links across the service and control redirect availability.',
    restricted: 'Restricted workspace controls.',
    required: 'Administrator access required',
    unauthorized: 'Your account is not authorized to view these controls.',
    returnOverview: 'Return to overview',
    checking: 'Checking administrator access…',
    loadError: 'The administrative data could not be loaded.',
    loadingGlobal: 'Loading global statistics…',
    summary: 'Global statistics summary',
    daily: 'Daily clicks',
    globalTotals: 'Global totals · UTC',
    noClicks: 'No clicks in this period',
    noClicksText:
      'Global activity will appear here after redirects are recorded.',
    userFilters: 'User filters',
    searchEmail: 'Search by email',
    role: 'Role',
    allRoles: 'All roles',
    administrator: 'Admin',
    user: 'User',
    allStatuses: 'All statuses',
    loadingUsers: 'Loading users…',
    noUsers: 'No users found',
    noUsersText: 'No accounts match the selected filters.',
    enableUser: 'Enable user',
    disableUser: 'Disable user',
    userToggleDescription:
      'This changes whether the account can authenticate. The backend remains the authorization boundary.',
    userResults: 'Administrative user results',
    action: 'Action',
    linkFilters: 'Link filters',
    searchLinks: 'Search links or owner email',
    searchPlaceholder: 'URL, short code, or owner email',
    ownerId: 'Owner ID',
    loadingLinks: 'Loading links…',
    noLinks: 'No links found',
    noLinksText: 'No links match the selected filters.',
    enableLink: 'Enable link',
    disableLink: 'Disable link',
    linkToggleDescription:
      'This changes whether the public short URL redirects. Ownership checks remain on the backend.',
    linkResults: 'Administrative link results',
    expires: 'Expires',
    userDisabled:
      'User disabled. The server recorded the administrative action.',
    userEnabled: 'User enabled. The server recorded the administrative action.',
    linkDisabled:
      'Link disabled. The server recorded the administrative action.',
    linkEnabled: 'Link enabled. The server recorded the administrative action.',
    resultsPages: 'Admin results pages',
    from: 'From (UTC)',
    to: 'To (UTC)',
    apply: 'Apply range',
    invalidRange: 'Choose a UTC start time earlier than the end time.',
    rangeLong: 'The statistics range cannot exceed 90 days.',
    allUtc: 'All administrative statistics use UTC.',
    totalClicks: 'Total clicks',
    firstClick: 'First click · UTC',
    lastClick: 'Last click · UTC',
  },
  consent: {
    label: 'Cookie consent',
    closeBanner: 'Close cookie banner',
    title: 'Your privacy choices',
    text: 'Ushly uses essential cookies for secure sessions. Optional analytics and advertising tools are not currently loaded. Read our',
    and: 'and',
    plus: 'plus the',
    manage: 'Manage preferences',
    reject: 'Reject non-essential',
    accept: 'Accept all',
    controls: 'Privacy controls',
    settings: 'Cookie settings',
    closeSettings: 'Close cookie settings',
    explanation:
      'Essential session cookies always remain available. No optional tool is currently implemented or loaded.',
    essential: 'Essential',
    essentialText: 'Authentication and session security',
    always: 'Always active',
    analytics: 'Optional analytics',
    futureProvider: 'Reserved for a future disclosed provider',
    advertising: 'Advertising',
    save: 'Save preferences',
  },
  home: {
    title: homeTitle,
    description: homeDescription,
    eyebrow: 'A simpler way to share',
    intro:
      'Create free short URLs, generate QR codes, and understand how people interact with your links. Ushly provides privacy-conscious click analytics, link management, expiration controls, and secure sharing for individuals and small businesses.',
    createAccount: 'Create free account',
    featuresTitle: 'Everything you need to manage shared links',
    featuresLead:
      'Start with a short link, then use the tools available for sharing and managing it.',
    features,
    faqs,
    faqTitle: 'Frequently asked questions',
    accountTitle: 'Keep your links connected to you',
    accountText:
      'Create an account to keep links associated with you and manage them from your dashboard.',
    signup: 'Sign up',
    login: 'Log in',
    exampleLabel: 'Illustrative URL example',
  },
  form: {
    title: 'Shorten your URL',
    lead: 'Paste a destination to create your short link.',
    noScript:
      'Enable JavaScript to shorten URLs. The information on this page is available without it.',
    aria: 'Shorten a URL',
    destination: 'Destination URL',
    placeholder: 'https://example.com/your-long-link',
    hint: 'Use a complete http:// or https:// URL.',
    shortening: 'Shortening…',
    shorten: 'Shorten link',
    creating: 'Creating your short link…',
    ready: 'Your short link is ready.',
    empty: 'Your shortened URL will appear below.',
    analyticsPrompt: 'Want to get analytics insights?',
    createAccount: 'Create free account',
    result: 'Shortening result',
    original: 'Original destination URL',
    visit: 'Visit URL',
    copy: 'Copy',
    copied: 'Copied',
    copyUnavailable: 'Copy unavailable',
    qr: 'QR',
    closeQr: 'Close QR code',
    qrAlt: 'QR code for your shortened URL',
    qrGenerating: 'Generating your QR code…',
    qrUnavailable: 'QR preview unavailable.',
    qrTitle: 'Download your QR code',
    qrDescription: 'Generated in your browser from the public short URL.',
    download: 'Download QR code (SVG)',
    downloadReady: 'QR download requested. Check your browser downloads.',
    retry: 'Try again',
    genericError: 'Something went wrong. Please try again.',
    qrError: 'Could not generate a QR code. Please try again.',
    required: 'Enter a URL to shorten.',
    invalid:
      'Enter a complete http:// or https:// URL, up to 2,048 characters.',
  },
  legal: {
    pages: legalPages,
    ui: {
      notice: 'Production review notice',
      noticeText:
        'Project template: review this page and replace its configurable legal identity and contact placeholders before production launch.',
      contents: 'Contents',
      sections: 'sections',
      related: 'Related legal pages',
      relatedTitle: 'Related information',
    },
  },
  public: {
    pages: publicPages,
    offers: 'What Ushly offers',
    built: 'Built around real link behavior',
    practice: 'In practice',
    how: 'How it works',
    faq: 'Frequently asked questions',
    next: 'Next steps',
  },
} as const;

export type EnglishTranslation = TranslationShape<typeof en>;
