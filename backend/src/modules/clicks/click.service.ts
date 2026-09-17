import type { PrismaClient } from '@prisma/client';

import { pseudonymizeIp } from '../../utils/ip-pseudonymization.js';
import { createClick } from './click.repository.js';

const MAX_USER_AGENT_LENGTH = 256;
const MAX_REFERRER_LENGTH = 256;

let trackingFailures = 0;//if click fails, we wanna know how many times failed

export function getClickTrackingMetrics() {
  return { trackingFailures };
}

//receive http referrer header
function normalizeReferrer(value: string | undefined): string | null {
  if (!value) //if there is no referrer, store null
    return null;

  try {
    //orgin allows us to extract, protocol, domain name and port number
    //with slice, we then truncate links that are too long
    return new URL(value).origin.slice(0, MAX_REFERRER_LENGTH);
  } catch {
    return null;
  }
}

export async function recordRedirectClick(
  prisma: PrismaClient,
  input: {
    linkId: string;
    ipAddress: string;
    userAgent: string | undefined;
    referrer: string | undefined;
    ipHashSecret: string;
  },
): Promise<void> {
  try {
    await createClick(prisma, {
      linkId: input.linkId,
      ipHash: pseudonymizeIp(input.ipAddress, input.ipHashSecret),
      userAgent: input.userAgent?.slice(0, MAX_USER_AGENT_LENGTH) ?? null,
      referrer: normalizeReferrer(input.referrer),
    });
  } catch {
    trackingFailures += 1;
    throw new Error('Click tracking failed');
  }
}
