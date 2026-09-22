import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Dialog } from '../../components/Dialog';
import { Link } from 'react-router';
import {
  createLink,
  validateUrl,
  ApiError,
  type CreatedLink,
} from '../../api/links';

import { generatePublicQr } from './qr';

const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

// A future session provider can supply an in-memory access token; this task creates no session flow.
export function ShortenForm({ accessToken }: { accessToken?: string }) {
  const interactive = useSyncExternalStore(
    subscribeToHydration,
    clientSnapshot,
    serverSnapshot,
  );
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CreatedLink | null>(null);
  const [resultDestination, setResultDestination] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const copyTimer = useRef<number | null>(null);
  const [qrUrl, setQrUrl] = useState('');
  const [qrBusy, setQrBusy] = useState(false);
  const [qrError, setQrError] = useState('');
  const [downloadStatus, setDownloadStatus] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  const version = useRef(0);
  const qrPending = useRef<number | null>(null);
  const qrObjectUrl = useRef('');
  function clearQr() {
    if (qrObjectUrl.current) URL.revokeObjectURL(qrObjectUrl.current);
    qrObjectUrl.current = '';
    setQrUrl('');
  }
  useEffect(
    () => () => {
      version.current += 1;
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
      if (qrObjectUrl.current) URL.revokeObjectURL(qrObjectUrl.current);
      qrObjectUrl.current = '';
    },
    [],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const invalid = validateUrl(url.trim());
    setError(invalid ?? '');
    if (invalid) {
      input.current?.focus();
      return;
    }
    pending.current = true;
    setBusy(true);
    setResult(null);
    setResultDestination('');
    clearQr();
    setQrOpen(false);
    qrPending.current = null;
    setQrBusy(false);
    setQrError('');
    setCopyStatus('');
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    setDownloadStatus('');
    const attempt = ++version.current;
    try {
      const link = await createLink(url.trim(), accessToken);
      if (attempt === version.current) {
        setResultDestination(url.trim());
        setResult(link);
      }
    } catch (failure) {
      if (attempt === version.current)
        setError(
          failure instanceof ApiError
            ? failure.message
            : 'Something went wrong. Please try again.',
        );
    } finally {
      pending.current = false;
      if (attempt === version.current) setBusy(false);
    }
  }
  async function copy() {
    if (!result) return;
    const attempt = version.current;
    try {
      await navigator.clipboard.writeText(result.shortUrl);
      if (attempt === version.current) {
        setCopyStatus('Copied');
        if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
        copyTimer.current = window.setTimeout(() => {
          setCopyStatus('');
          copyTimer.current = null;
        }, 2000);
      }
    } catch {
      if (attempt === version.current) {
        setCopyStatus('Copy unavailable');
      }
    }
  }
  function openQr() {
    setQrOpen(true);
    void generateQr();
  }
  async function generateQr() {
    if (!result || qrPending.current !== null || qrObjectUrl.current) return;
    const attempt = version.current;
    qrPending.current = attempt;
    setQrBusy(true);
    setQrError('');
    try {
      const blob = await generatePublicQr(result.shortUrl);
      if (attempt === version.current) {
        // Record ownership immediately so unmounting before the next render cannot leak this URL.
        qrObjectUrl.current = URL.createObjectURL(blob);
        setQrUrl(qrObjectUrl.current);
      }
    } catch {
      if (attempt === version.current)
        setQrError('Could not generate a QR code. Please try again.');
    } finally {
      if (attempt === version.current) {
        qrPending.current = null;
        setQrBusy(false);
      }
    }
  }

  return (
    <div className="home-shortener">
      <section className="card shorten-card" aria-labelledby="shorten-title">
        <div className="card__header">
          <div className="shorten-heading">
            <svg
              className="shorten-icon"
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
              <path d="M14 11a5 5 0 0 0-7.1 0l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1" />
            </svg>
            <h2 id="shorten-title">Shorten your URL</h2>
          </div>
          <p>Paste a destination to create your short link.</p>
        </div>
        <div className="card__body">
          <noscript>
            <p>
              Enable JavaScript to shorten URLs. The information on this page is
              available without it.
            </p>
          </noscript>
          <form
            onSubmit={submit}
            noValidate
            aria-label="Shorten a URL"
            aria-busy={busy}
          >
            <Input
              ref={input}
              label="Destination URL"
              name="url"
              type="url"
              autoComplete="url"
              required
              maxLength={2048}
              placeholder="https://example.com/your-long-link"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              disabled={busy || !interactive}
              hint="Use a complete http:// or https:// URL."
              {...(error ? { error } : {})}
            />
            <Button type="submit" loading={busy} disabled={!interactive}>
              {busy ? 'Shortening…' : 'Shorten link'}{' '}
              <span aria-hidden="true">→</span>
            </Button>
            {error && <p role="alert">{error}</p>}
          </form>
          <div role="status" className="shorten-status">
            {busy
              ? 'Creating your short link…'
              : result
                ? 'Your short link is ready.'
                : 'Your shortened URL will appear below.'}
          </div>
          <div className="shorten-analytics">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19V5M4 19h16M8 15l4-4 3 2 5-6" />
            </svg>
            <span>Want to get analytics insights?</span>
            <Link to="/register">Create free account</Link>
          </div>
        </div>
      </section>
      {result && (
        <section className="card shorten-result" aria-label="Shortening result">
          <div className="card__body">
            <div className="shorten-result__details">
              <p className="shorten-result__url">{result.shortUrl}</p>
              <p
                className="shorten-destination"
                aria-label={`Original destination URL: ${resultDestination}`}
              >
                <span
                  className="shorten-destination__value"
                  title={resultDestination}
                >
                  {resultDestination}
                </span>
              </p>
            </div>
            <div className="shorten-result__actions">
              <a
                className="button button--primary"
                href={result.shortUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span aria-hidden="true">↗</span>
                Visit URL
              </a>
              <Button onClick={openQr}>
                <span aria-hidden="true">▦</span>
                QR
              </Button>
              <Button onClick={() => void copy()} aria-live="polite">
                <span aria-hidden="true">
                  {copyStatus === 'Copied' ? '✓' : '⧉'}
                </span>
                {copyStatus || 'Copy'}
              </Button>
            </div>
          </div>
        </section>
      )}
      <Dialog
        open={qrOpen && Boolean(result)}
        onClose={() => setQrOpen(false)}
        title="Your QR code"
        description="Generated in your browser from the public short URL."
      >
        <p role="status">
          {qrBusy
            ? 'Generating your QR code…'
            : qrUrl
              ? 'Your QR code is ready.'
              : ''}
        </p>
        {qrError && <p role="alert">{qrError}</p>}
        {qrError && (
          <Button variant="secondary" onClick={() => void generateQr()}>
            Try again
          </Button>
        )}
        {qrUrl && result && (
          <div className="qr-result">
            <img
              src={qrUrl}
              width="192"
              height="192"
              alt="QR code for your shortened URL"
            />
            <a
              className="button button--secondary"
              href={qrUrl}
              download={`ushly-${result.shortCode}.svg`}
              onClick={() =>
                setDownloadStatus(
                  'QR download requested. Check your browser downloads.',
                )
              }
            >
              Download QR code (SVG)
            </a>
            <p role="status">{downloadStatus}</p>
          </div>
        )}
      </Dialog>
    </div>
  );
}
