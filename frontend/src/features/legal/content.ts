export const legalPages = {
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

export type LegalPagePath = keyof typeof legalPages;

export function isLegalPagePath(path: string): path is LegalPagePath {
  return path in legalPages;
}
