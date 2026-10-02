import { beforeEach, expect, it, vi } from 'vitest';
import { generatePublicQr, MAX_QR_SVG_BYTES } from './qr';
const encoder = vi.hoisted(() => vi.fn());
vi.mock('qrcode', () => ({ default: { toString: encoder } }));
vi.mock('../../config/public', () => ({ apiOrigin: 'https://api.example' }));
beforeEach(() =>
  encoder
    .mockReset()
    .mockResolvedValue('<svg xmlns="http://www.w3.org/2000/svg"/>'),
);
it('encodes the exact short URL with fixed, readable SVG options', async () => {
  const blob = await generatePublicQr('https://api.example/aB3x7Qz');
  expect(encoder).toHaveBeenCalledExactlyOnceWith(
    'https://api.example/aB3x7Qz',
    {
      type: 'svg',
      width: 512,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000ff', light: '#ffffffff' },
    },
  );
  expect(blob.type).toBe('image/svg+xml');
  expect(blob.size).toBeGreaterThan(0);
});
it.each([
  'javascript:alert(1)',
  'https://other.example/abc',
  'https://user:password@api.example/abc',
  'https://api.example/abc?token=secret',
  'https://api.example/abc#secret',
  'https://api.example/long/path',
  'https://api.example/%61bc',
  'https://api.example/../abc',
  'https://api.example/' + 'a'.repeat(33),
  'https://api.example/' + 'a'.repeat(2048),
])(
  'rejects unsafe or unbounded input before invoking the encoder: %s',
  async (input) => {
    await expect(generatePublicQr(input)).rejects.toThrow();
    expect(encoder).not.toHaveBeenCalled();
  },
);
it.each([
  '',
  'a'.repeat(MAX_QR_SVG_BYTES + 1),
  'é'.repeat(MAX_QR_SVG_BYTES / 2 + 1),
])('rejects empty or oversized byte output (%#)', async (svg) => {
  encoder.mockResolvedValueOnce(svg);
  await expect(generatePublicQr('https://api.example/abc')).rejects.toThrow(
    'QR output',
  );
});
