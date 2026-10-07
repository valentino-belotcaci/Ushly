export type DisplayedLinkStatus = 'active' | 'expired' | 'disabled';

export function displayedLinkStatus(link: {
  status: DisplayedLinkStatus;
  expiresAt: string | null;
}): DisplayedLinkStatus {
  if (link.status === 'disabled') return 'disabled';
  if (
    link.status === 'expired' ||
    (link.expiresAt !== null && Date.parse(link.expiresAt) <= Date.now())
  )
    return 'expired';
  return 'active';
}
