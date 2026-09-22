export const homeTitle = 'Free URL Shortener with QR Codes and Analytics';
export const homeDescription =
  'Shorten long URLs for free with Ushly. Copy a shareable link, generate a QR code without an account, and learn about owner-only analytics and link expiration.';
export const features = [
  {
    title: 'Short links, less clutter',
    text: 'Turn an HTTP or HTTPS destination into a compact link. You can create and copy a link without an account.',
  },
  {
    title: 'QR codes, ready to share',
    text: 'Generate and download an SVG QR code in your browser, without an account. It contains the same public short URL you can copy.',
  },
  {
    title: 'Understand your clicks',
    text: 'The owner-only API reports click totals, time series, referrer origins and user-agent breakdowns. The analytics interface is not available yet.',
  },
  {
    title: 'Control a link’s lifetime',
    text: 'The API supports expiration dates and lets authenticated owners disable their links. Expired and disabled links stop redirecting.',
  },
];
export const faqs = [
  {
    question: 'How does URL shortening work?',
    answer:
      'Ushly saves your destination and creates a short code. Opening the short link redirects visitors to that destination. This form accepts HTTP and HTTPS URLs up to 2,048 characters.',
  },
  {
    question: 'Can I create and download a QR code?',
    answer:
      'Yes. Shorten a URL, select Generate QR code, then download its SVG image. Generation happens in your browser and needs no account. Scanning the code follows the short link, so expiration and disabling still apply.',
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
];
