import { Link } from 'react-router';
import { PageContainer } from '../../layout/PageContainer';
import { ShortenForm } from './ShortenForm';
import { UrlExamples } from './UrlExamples';
import './home.css';
import { translations } from '../../i18n';
import { useLocale, useLocalizedRoute } from '../../i18n/locale';

function FeatureIcon({ kind }: { kind: 'shorten' | 'qr' | 'analytics' | 'lifetime' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === 'shorten' && (
        <>
          <path d="M10 13a5 5 0 0 0 7.1 0l2-2A5 5 0 0 0 12 4l-1 1" />
          <path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20l1-1" />
        </>
      )}
      {kind === 'qr' && (
        <>
          <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z" />
          <path d="M14 14h2v2h-2zM19 14h2v2h-2zM14 19h2v2h-2zM19 19h2v2h-2z" />
        </>
      )}
      {kind === 'analytics' && (
        <>
          <path d="M4 20V4M4 20h16M8 16v-5M12 16V7M16 16v-8M20 16v-4" />
        </>
      )}
      {kind === 'lifetime' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      )}
    </svg>
  );
}

export function HomePage() {
  const locale = useLocale();
  const route = useLocalizedRoute();
  const t = translations(locale).home;
  return (
    <PageContainer className="homepage">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero__copy">
          <p className="home-eyebrow">{t.eyebrow}</p>
          <h1 id="home-title">{t.title}</h1>
          <UrlExamples label={t.exampleLabel} />
          <p className="home-intro">{t.intro}</p>
          <Link
            className="button button--primary home-hero__cta"
            to={route('/register')}
          >
            {t.createAccount}
          </Link>
        </div>
        <ShortenForm />
      </section>
      <section className="home-features" aria-labelledby="features-title">
        <div className="home-section-heading">
          <h2 id="features-title">
            {t.featuresTitle}
          </h2>
          <p>{t.featuresLead}</p>
        </div>
        <div className="home-feature-grid">
          {t.features.map((feature) => (
            <article
              key={feature.kind}
              className={`home-feature-card home-feature-card--${feature.kind}`}
            >
              <div className="home-feature-card__visual" aria-hidden="true">
                <span className="home-feature-card__icon">
                  <FeatureIcon kind={feature.kind} />
                </span>
                <span className="home-feature-card__marks">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
              <div className="home-feature-card__content">
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
                <ul>
                  {feature.benefits.map((benefit) => (
                    <li key={benefit}>
                      <span aria-hidden="true">✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="home-faq" aria-labelledby="faq-title">
        <h2 id="faq-title">{t.faqTitle}</h2>
        {t.faqs.map((faq) => (
          <details key={faq.question}>
            <summary>{faq.question}</summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </section>
      <section className="home-account" aria-labelledby="account-title">
        <div>
          <h2 id="account-title">{t.accountTitle}</h2>
          <p className="muted">{t.accountText}</p>
        </div>
        <div className="row">
          <Link className="button button--primary" to={route('/register')}>
            {t.signup}
          </Link>
          <Link className="button button--secondary" to={route('/login')}>
            {t.login}
          </Link>
        </div>
      </section>
    </PageContainer>
  );
}
