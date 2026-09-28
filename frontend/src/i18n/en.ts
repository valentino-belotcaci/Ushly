import { faqs, features, homeDescription, homeTitle } from '../features/home/content.ts';
import { publicPages } from '../features/public-pages/content.ts';

export const en = {
  locale: 'en',
  languageName: 'English',
  layout: {
    skip: 'Skip to content', home: 'Ushly home', primary: 'Primary', menu: 'Menu', closeMenu: 'Close menu',
    nav: ['URL Shortener', 'QR Codes', 'Analytics', 'Features'], login: 'Log in', getStarted: 'Get started',
    product: 'Product', resources: 'Resources', legal: 'Legal', account: 'Account', contact: 'Contact',
    privacy: 'Privacy Policy', cookies: 'Cookie Policy', terms: 'Terms of Service', cookieSettings: 'Cookie settings',
    footerDescription: 'Short links, QR codes, and owner-only analytics.', copyright: '© 2026 Ushly. All rights reserved.',
    language: 'Language', selectLanguage: 'Select language', lightTheme: 'Use light theme', darkTheme: 'Use dark theme', logout: 'Log out', loggedOut: 'You have logged out.', logoutWarning: 'You are signed out here, but the server could not confirm logout. Please try again when connected.',
  },
  consent: {
    label: 'Cookie consent', closeBanner: 'Close cookie banner', title: 'Your privacy choices', text: 'Ushly uses essential cookies for secure sessions. Optional analytics and advertising tools are not currently loaded. Read our', and: 'and', plus: 'plus the', manage: 'Manage preferences', reject: 'Reject non-essential', accept: 'Accept all', controls: 'Privacy controls', settings: 'Cookie settings', closeSettings: 'Close cookie settings', explanation: 'Essential session cookies always remain available. No optional tool is currently implemented or loaded.', essential: 'Essential', essentialText: 'Authentication and session security', always: 'Always active', analytics: 'Optional analytics', futureProvider: 'Reserved for a future disclosed provider', advertising: 'Advertising', save: 'Save preferences',
  },
  home: {
    title: homeTitle, description: homeDescription, eyebrow: 'A simpler way to share',
    intro: 'Create free short URLs, generate QR codes, and understand how people interact with your links. Ushly provides privacy-conscious click analytics, link management, expiration controls, and secure sharing for individuals and small businesses.',
    createAccount: 'Create free account', featuresTitle: 'Everything you need to manage shared links',
    featuresLead: 'Start with a short link, then use the tools available for sharing and managing it.', features, faqs,
    faqTitle: 'Frequently asked questions', accountTitle: 'Keep your links connected to you',
    accountText: 'Create an account to keep links associated with you and manage them from your dashboard.', signup: 'Sign up', login: 'Log in',
    exampleLabel: 'Illustrative URL example',
  },
  form: {
    title: 'Shorten your URL', lead: 'Paste a destination to create your short link.', noScript: 'Enable JavaScript to shorten URLs. The information on this page is available without it.',
    aria: 'Shorten a URL', destination: 'Destination URL', placeholder: 'https://example.com/your-long-link', hint: 'Use a complete http:// or https:// URL.',
    shortening: 'Shortening…', shorten: 'Shorten link', creating: 'Creating your short link…', ready: 'Your short link is ready.', empty: 'Your shortened URL will appear below.',
    analyticsPrompt: 'Want to get analytics insights?', createAccount: 'Create free account', result: 'Shortening result', original: 'Original destination URL',
    visit: 'Visit URL', copy: 'Copy', copied: 'Copied', copyUnavailable: 'Copy unavailable', qr: 'QR', closeQr: 'Close QR code',
    qrAlt: 'QR code for your shortened URL', qrGenerating: 'Generating your QR code…', qrUnavailable: 'QR preview unavailable.', qrTitle: 'Download your QR code',
    qrDescription: 'Generated in your browser from the public short URL.', download: 'Download QR code (SVG)', downloadReady: 'QR download requested. Check your browser downloads.', retry: 'Try again',
    genericError: 'Something went wrong. Please try again.', qrError: 'Could not generate a QR code. Please try again.',
    required: 'Enter a URL to shorten.', invalid: 'Enter a complete http:// or https:// URL, up to 2,048 characters.',
  },
  public: { pages: publicPages, offers: 'What Ushly offers', built: 'Built around real link behavior', practice: 'In practice', how: 'How it works', faq: 'Frequently asked questions', next: 'Next steps' },
} as const;
