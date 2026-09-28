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
import { translations } from '../../i18n';
import { useLocale } from '../../i18n/locale';

export function QrCodesPage() {
  const t = translations(useLocale()).dashboard.qr;
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
              : t.loadError,
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      if (next) URL.revokeObjectURL(next);
    };
  }, [selectedId, t.loadError]);
  if (links.loading)
    return <DashboardLoading label={t.loading} variant="list" />;
  if (links.error)
    return (
      <DashboardError message={links.error} retry={() => void links.reload()} />
    );
  return (
    <div className="dashboard-page">
      <header className="dashboard-page-header">
        <div>
          <p className="dashboard-eyebrow">{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p>{t.lead}</p>
        </div>
      </header>
      {!links.data?.items.length ? (
        <DashboardEmpty
          title={t.empty}
          text={t.emptyText}
        />
      ) : (
        <section className="card qr-workspace">
          <div className="qr-controls">
            <label htmlFor="qr-link">{t.choose}</label>
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
              {t.explanation}
            </p>
            {source && (
              <a
                className="button button--primary"
                href={source}
                download={`ushly-${links.data.items.find((link) => link.id === selectedId)?.shortCode ?? 'qr'}.svg`}
              >
                <DashboardIcon name="download" />
                {t.download}
              </a>
            )}
          </div>
          <div className="qr-preview">
            {loading ? (
              <DashboardLoading label={t.generating} variant="cards" />
            ) : error ? (
              <DashboardError message={error} />
            ) : (
              source && (
                <img
                  src={source}
                  alt={`${t.alt} /${links.data.items.find((link) => link.id === selectedId)?.shortCode ?? ''}`}
                />
              )
            )}
          </div>
        </section>
      )}
    </div>
  );
}
