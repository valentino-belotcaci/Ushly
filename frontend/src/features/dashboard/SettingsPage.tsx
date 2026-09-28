import { useSession } from '../../api/session';
import { AccountActions } from '../auth/AccountActions';

export function SettingsPage() {
  const session = useSession();
  const googleLinkAvailable =
    session.status === 'authenticated' && session.googleLinkAvailable === true;
  return (
    <div className="dashboard-page">
      <header className="dashboard-page-header">
        <div>
          <p className="dashboard-eyebrow">Account</p>
          <h1>Settings</h1>
          <p>Review your account and available sign-in methods.</p>
        </div>
      </header>
      <section className="card settings-card">
        <div>
          <h2>Authentication methods</h2>
          <p>Review the methods connected to your Ushly account.</p>
        </div>
        <dl>
          <div>
            <dt>Account email</dt>
            <dd>
              {session.user?.email ??
                'Available after your next password login'}
            </dd>
          </div>
          <div>
            <dt>Google account</dt>
            <dd>
              {googleLinkAvailable
                ? 'Not linked'
                : 'Google account linked'}
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
