export const primaryLinks = [
  { label: 'URL Shortener', to: '/url-shortener' },
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
    links: [{ label: 'Contact', to: '/contact' }],
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
