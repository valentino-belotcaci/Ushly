import { useSession } from '../../api/session';
import { AccountActions } from '../auth/AccountActions';
import { translations } from '../../i18n';
import { useLocale } from '../../i18n/locale';

export function SettingsPage() {
  const t = translations(useLocale()).dashboard.settings;
  const session = useSession();
  const googleLinkAvailable =
    session.status === 'authenticated' && session.googleLinkAvailable === true;
  return (
    <div className="dashboard-page">
      <header className="dashboard-page-header">
        <div>
          <p className="dashboard-eyebrow">{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p>{t.lead}</p>
        </div>
      </header>
      <section className="card settings-card">
        <div>
          <h2>{t.methods}</h2>
          <p>{t.methodsLead}</p>
        </div>
        <dl>
          <div>
            <dt>{t.email}</dt>
            <dd>
              {session.user?.email ??
                t.emailFallback}
            </dd>
          </div>
          <div>
            <dt>{t.google}</dt>
            <dd>
              {googleLinkAvailable
                ? t.notLinked
                : t.linked}
            </dd>
          </div>
        </dl>
        {googleLinkAvailable && (
          <div className="settings-actions">
            <AccountActions
              canLinkGoogle
              showLogout={false}
              onAction={() => {}}
            />
          </div>
        )}
      </section>
    </div>
  );
}
