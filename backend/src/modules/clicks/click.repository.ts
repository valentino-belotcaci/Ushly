import type { PrismaClient } from '@prisma/client';

type CreateClickInput = {
  linkId: string;
  ipHash: string;
  referrer: string | null; //used to know where the user came from, if they clicked a link on another website
  userAgent: string | null; //used to show statistics about the user's device, browser, and operating system
};

export async function createClick(
  prisma: PrismaClient,
  input: CreateClickInput,
): Promise<void> {
  await prisma.click.create({
    data: {
      linkId: input.linkId,
      ipHash: input.ipHash,
      referrer: input.referrer,
      userAgent: input.userAgent,
      countryCode: null,
    },
  });
}
