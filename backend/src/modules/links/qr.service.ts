import QRCode from 'qrcode';
import type { PrismaClient } from '@prisma/client';

import { AppError } from '../../errors/app-error.js';
import { findOwnedLink } from './link.repository.js';

export const MAX_QR_SVG_BYTES = 64 * 1024;//64kb svg

export async function generateOwnedLinkQr(
  prisma: PrismaClient,
  userId: string,
  linkId: string,
  origin: string,
): Promise<string> {//return svg as string
  const link = await findOwnedLink(prisma, userId, linkId);
  if (!link) {
    throw new AppError('link_not_found', 'Link not found', 404);
  }
  //merge shortcode and url.origin, eg: https//ushly.com + /A4f9Gv
  const shortUrl = new URL(`/${link.shortCode}`, `${origin}/`).toString();
  const svg = await QRCode.toString(shortUrl, {
    type: 'svg',
    errorCorrectionLevel: 'M',//make qr still working even if damaged
    margin: 2,//adds whitespace around qrcode
    width: 512,
  });

  //error if the generated svg is larger than 64kb
  if (Buffer.byteLength(svg, 'utf8') > MAX_QR_SVG_BYTES) {
    throw new AppError('qr_output_too_large', 'QR output exceeds the permitted size', 422);
  }

  return svg;
}
