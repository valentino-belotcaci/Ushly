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
          <h2>Account details</h2>
          <p>Your identity is managed securely by Ushly.</p>
        </div>
        <dl>
          <div>
            <dt>Email</dt>
            <dd>
              {session.user?.email ??
                'Available after your next password login'}
            </dd>
          </div>
          <div>
            <dt>Google linking</dt>
            <dd>
              {googleLinkAvailable
                ? 'Available'
                : 'Already linked or unavailable'}
            </dd>
          </div>
        </dl>
        <div className="settings-actions">
          <AccountActions
            canLinkGoogle={googleLinkAvailable}
            onAction={() => {}}
          />
        </div>
      </section>
    </div>
  );
}
