export const publicPages = {
  '/url-shortener': {
    title: 'Shorten long URLs, share them simply',
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
    title: 'QR codes for the short links you create',
    pageTitle: 'QR Codes',
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
    title: 'Understand clicks on links you own',
    pageTitle: 'Click Analytics',
    description:
      'Learn about Ushly owner-only click totals, time series, referrer origins, and user-agent breakdowns available through the authenticated API.',
    eyebrow: 'Analytics',
    lead: 'Ushly records redirect clicks and provides statistics to authenticated link owners through its API. A dashboard interface is not available yet.',
    visual: 'analytics',
    visualLabel: 'Owner-only click insights.',
    heroActions: [
      { label: 'Get started', to: '/register', style: 'primary' },
      { label: 'Explore features', to: '/features', style: 'secondary' },
    ],
    finalCta: {
      title: 'Create an account to explore link analytics',
      text: 'Register to create owned links, or log in if you already have an account. Click statistics are currently available through the authenticated API.',
      actions: [
        { label: 'Get started free', to: '/register', style: 'primary' },
      ],
    },
    highlights: [
      {
        title: 'Follow activity over time',
        text: 'The owner-only API reports click totals and a time series for a selected period.',
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
      'Create a link using an authenticated API request.',
      'Share the link and let visitors follow it.',
      'Request statistics for a link you own through the authenticated API.',
    ],
    faqs: [
      {
        question: 'Can anyone view a link’s analytics?',
        answer:
          'No. Statistics are available only to the authenticated owner of that link.',
      },
      {
        question: 'Is there an analytics dashboard?',
        answer:
          'Not yet. The current analytics capability is available through the authenticated API.',
      },
    ],
  },
  '/features': {
    title: 'Features for sharing and managing links',
    pageTitle: 'Ushly Features',
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
        text: 'Authenticated owners can request click statistics through the API.',
      },
      {
        title: 'Lifetime controls',
        text: 'Authenticated owners can set expiration dates and deactivate or reactivate their links.',
      },
    ],
    steps: [
      'Create a short URL.',
      'Share it directly or as a QR code.',
      'For owned links, use the API for statistics and status controls.',
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
          'Yes. Authenticated owners can set an expiration date when creating or managing a link through the API. An expired link no longer redirects.',
      },
      {
        question: 'Can I disable and reactivate a link?',
        answer:
          'Yes. Authenticated owners can change their link’s active status through the API. A disabled link does not redirect until reactivated.',
      },
      {
        question: 'Do QR codes include analytics?',
        answer:
          'The QR image does not track scans. It contains an Ushly short URL; clicks on an owned short URL can appear in that link’s analytics.',
      },
    ],
  },
} as const;

export type PublicPagePath = keyof typeof publicPages;

export function isPublicPagePath(path: string): path is PublicPagePath {
  return path in publicPages;
}
