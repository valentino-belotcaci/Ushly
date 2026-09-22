import { useEffect, useState } from 'react';
import { ApiClientError } from '../../api/session';
import { getOwnedQr } from './api';
import {
  DashboardEmpty,
  DashboardError,
  DashboardLoading,
} from './DashboardState';
import { DashboardIcon } from './icons';
import { useOwnedLinks } from './useOwnedLinks';

export function QrCodesPage() {
  const links = useOwnedLinks(1, 100);
  const [selected, setSelected] = useState('');
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const selectedId = selected || links.data?.items[0]?.id || '';
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    let next = '';
    void getOwnedQr(selectedId)
      .then((blob) => {
        next = URL.createObjectURL(blob);
        if (active) setSource(next);
        else URL.revokeObjectURL(next);
      })
      .catch((failure) => {
        if (active)
          setError(
            failure instanceof ApiClientError
              ? failure.message
              : 'The QR code could not be loaded.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      if (next) URL.revokeObjectURL(next);
    };
  }, [selectedId]);
  if (links.loading) return <DashboardLoading label="Loading QR codes…" />;
  if (links.error)
    return (
      <DashboardError message={links.error} retry={() => void links.reload()} />
    );
  return (
    <div className="dashboard-page">
      <header className="dashboard-page-header">
        <div>
          <p className="dashboard-eyebrow">Share</p>
          <h1>QR Codes</h1>
          <p>Download the QR code generated for an owned short link.</p>
        </div>
      </header>
      {!links.data?.items.length ? (
        <DashboardEmpty
          title="No QR codes available"
          text="Create an owned link first. Ushly generates its QR code from the public short URL."
        />
      ) : (
        <section className="card qr-workspace">
          <div className="qr-controls">
            <label htmlFor="qr-link">Choose a link</label>
            <select
              id="qr-link"
              className="input"
              value={selectedId}
              onChange={(e) => {
                setLoading(true);
                setError('');
                setSource('');
                setSelected(e.target.value);
              }}
            >
              {links.data.items.map((link) => (
                <option key={link.id} value={link.id}>
                  {link.title ?? link.shortCode}
                </option>
              ))}
            </select>
            <p>
              QR codes encode the Ushly short URL. Analytics are recorded when
              that short URL is opened.
            </p>
            {source && (
              <a
                className="button button--primary"
                href={source}
                download={`ushly-${links.data.items.find((link) => link.id === selectedId)?.shortCode ?? 'qr'}.svg`}
              >
                <DashboardIcon name="download" />
                Download SVG
              </a>
            )}
          </div>
          <div className="qr-preview">
            {loading ? (
              <DashboardLoading label="Generating QR code…" />
            ) : error ? (
              <DashboardError message={error} />
            ) : (
              source && (
                <img
                  src={source}
                  alt={`QR code for /${links.data.items.find((link) => link.id === selectedId)?.shortCode ?? ''}`}
                />
              )
            )}
          </div>
        </section>
      )}
    </div>
  );
}
