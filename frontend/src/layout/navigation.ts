// These destinations reserve routes only; their product features come in later tasks.
export const primaryLinks = [
  { label: 'URL Shortener', to: '/' },
  { label: 'QR Codes', to: '/qr-codes' },
  { label: 'Analytics', to: '/analytics' },
  { label: 'Features', to: '/features' },
];
export const accountLinks = [
  { label: 'Log in', to: '/login' },
  { label: 'Get started', to: '/register' },
];
export const footerGroups = [
  { label: 'Product', links: primaryLinks },
  {
    label: 'Resources',
    links: [
      { label: 'Help', to: '/help' },
      { label: 'FAQ', to: '/faq' },
      { label: 'About', to: '/about' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    label: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Cookie Policy', to: '/cookies' },
      { label: 'Terms of Service', to: '/terms' },
    ],
  },
  { label: 'Account', links: accountLinks },
];
