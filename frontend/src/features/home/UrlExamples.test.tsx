import { render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { UrlExamples } from './UrlExamples';

it('keeps translated pages safe by isolating the animated text in stable elements', () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );

  const { container } = render(<UrlExamples label="Example URL" />);
  const animated = container.querySelector('.url-example-typed');

  expect(animated).toHaveAttribute('translate', 'no');
  expect(animated).toHaveClass('notranslate');
  expect(animated?.querySelector('.url-example-value')).toBeInTheDocument();
  expect(animated?.querySelector('.url-example-cursor')).toBeInTheDocument();
  expect(
    Array.from(animated?.childNodes ?? []).every(
      (node) => node.nodeType === Node.ELEMENT_NODE,
    ),
  ).toBe(true);
});
