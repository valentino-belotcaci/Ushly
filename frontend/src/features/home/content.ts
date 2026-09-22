export const homeTitle = 'Free URL Shortener with QR Codes and Analytics';
export const homeDescription =
  'Shorten long URLs for free with Ushly. Copy a shareable link, generate a QR code without an account, and learn about owner-only analytics and link expiration.';
export const features = [
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
    text: 'The owner-only API provides click statistics while storing a keyed hash of visitor IP addresses.',
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
export const faqs = [
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
      'The authenticated API provides owners with click totals, time series, referrer origins and user-agent breakdowns. Analytics are not public, and the dashboard interface is not available yet.',
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
