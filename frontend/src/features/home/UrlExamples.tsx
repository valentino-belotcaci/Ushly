import { useEffect, useState } from 'react';

const firstExample = 'https://example.com/articles/how-to-plan-a-weekend-trip';
const examples = [
  firstExample,
  'https://shop.example.com/products/linen-travel-backpack',
  'https://events.example.org/conferences/design-summit-2026',
  'https://docs.example.net/guides/getting-started-with-apis',
  'https://photos.example.com/albums/summer-in-the-mountains',
];

export function UrlExamples() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'pause' | 'clearing'>('typing');

  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const example = examples[index] ?? firstExample;
    let delay = 75;
    if (phase === 'typing' && length >= example.length) delay = 1500;
    if (phase === 'clearing') delay = 450;
    const timer = window.setTimeout(() => {
      if (phase === 'typing') {
        if (length < example.length) setLength(length + 1);
        else setPhase('pause');
      } else if (phase === 'pause') {
        setPhase('clearing');
      } else {
        setLength(0);
        setIndex((current) => (current + 1) % examples.length);
        setPhase('typing');
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [index, length, phase, reducedMotion]);

  return (
    <div className="url-examples" aria-label="Illustrative URL example">
      <span className="url-example-static">{firstExample}</span>
      <span className="url-example-typed" aria-hidden="true">
        {(examples[index] ?? firstExample).slice(0, length)}
        {phase === 'typing' && <span className="url-example-cursor">_</span>}
      </span>
    </div>
  );
}
