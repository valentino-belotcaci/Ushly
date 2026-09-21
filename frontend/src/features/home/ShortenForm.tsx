import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import {
  createLink,
  getLinkQr,
  validateUrl,
  ApiError,
  type CreatedLink,
} from '../../api/links';

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
  const [copyStatus, setCopyStatus] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [qrBusy, setQrBusy] = useState(false);
  const [qrError, setQrError] = useState('');
  const [downloadStatus, setDownloadStatus] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  const version = useRef(0);
  useEffect(
    () => () => {
      version.current += 1;
    },
    [],
  );
  useEffect(
    () => () => {
      if (qrUrl) URL.revokeObjectURL(qrUrl);
    },
    [qrUrl],
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
    setQrUrl('');
    setQrBusy(false);
    setQrError('');
    setCopyStatus('');
    setDownloadStatus('');
    const attempt = ++version.current;
    try {
      const link = await createLink(url.trim(), accessToken);
      if (attempt === version.current) setResult(link);
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
      if (attempt === version.current) setCopyStatus('Short link copied.');
    } catch {
      if (attempt === version.current)
        setCopyStatus(
          'Copy was unavailable. Select the short link and copy it manually.',
        );
    }
  }
  async function generateQr() {
    if (!result || !accessToken || qrBusy) return;
    setQrBusy(true);
    setQrError('');
    const attempt = version.current;
    try {
      const blob = await getLinkQr(result.id, accessToken);
      if (attempt === version.current) setQrUrl(URL.createObjectURL(blob));
    } catch (failure) {
      if (attempt === version.current)
        setQrError(
          failure instanceof ApiError
            ? failure.message
            : 'Could not generate a QR code. Try again.',
        );
    } finally {
      if (attempt === version.current) setQrBusy(false);
    }
  }
  return (
    <Card
      title="Shorten a URL"
      description="Paste a destination to create your short link."
    >
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
          {busy ? 'Shortening…' : 'Shorten URL'}
        </Button>
        {error && <p role="alert">{error}</p>}
      </form>
      <div role="status" className="shorten-status">
        {busy
          ? 'Creating your short link…'
          : result
            ? 'Your short link is ready.'
            : 'Your shortened URL will appear here.'}
      </div>
      {result && (
        <div className="shorten-result">
          <Input
            label="Your short URL"
            value={result.shortUrl}
            readOnly
            onFocus={(event) => event.target.select()}
          />
          <div className="row">
            <Button variant="secondary" onClick={() => void copy()}>
              Copy short URL
            </Button>
            {accessToken && (
              <Button
                variant="secondary"
                loading={qrBusy}
                onClick={() => void generateQr()}
              >
                {qrBusy ? 'Generating QR…' : 'Generate QR code'}
              </Button>
            )}
          </div>
          <p role="status">{copyStatus}</p>
          {!accessToken && (
            <p className="muted">
              QR codes require an authenticated link owner. Anonymous links
              cannot be claimed later. <Link to="/login">Log in</Link> or{' '}
              <Link to="/register">sign up</Link> when account pages become
              available.
            </p>
          )}
          {qrError && <p role="alert">{qrError}</p>}
          {qrUrl && (
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
        </div>
      )}
    </Card>
  );
}
