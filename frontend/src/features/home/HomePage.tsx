import { Link } from 'react-router';
import { PageContainer } from '../../layout/PageContainer';
import { Card } from '../../components/Card';
import { ShortenForm } from './ShortenForm';
import { UrlExamples } from './UrlExamples';
import { faqs, features, homeTitle } from './content';
import './home.css';

export function HomePage() {
  return (
    <PageContainer className="homepage">
      <section className="home-hero" aria-labelledby="home-title">
        <p className="home-eyebrow">A simpler way to share</p>
        <h1 id="home-title">{homeTitle}</h1>
        <UrlExamples />
        <p className="home-intro">
          Ushly turns long web addresses into short, shareable links. Create a
          link without an account, then copy it wherever you need it.
        </p>
      </section>
      <ShortenForm />
      <section
        className="home-features"
        aria-label="Implemented Ushly features"
      >
        {features.map((feature) => (
          <Card key={feature.title} title={feature.title}>
            <p className="muted">{feature.text}</p>
          </Card>
        ))}
      </section>
      <section className="home-privacy" aria-labelledby="privacy-title">
        <h2 id="privacy-title">Thoughtful about privacy</h2>
        <p>
          Click records store a keyed, one-way hash of the visitor’s IP address
          rather than the clear IP. They also include the click time, a referrer
          origin and a limited user-agent string. This is pseudonymous
          analytics, not anonymous tracking.
        </p>
        <p>
          Management, QR generation and analytics require the authenticated
          owner. A short URL is public: anyone who has it can follow it. Avoid
          shortening confidential URLs or links that contain access credentials.
        </p>
      </section>
      <section className="home-faq" aria-labelledby="faq-title">
        <h2 id="faq-title">Frequently asked questions</h2>
        {faqs.map((faq) => (
          <details key={faq.question}>
            <summary>{faq.question}</summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </section>
      <section className="home-account" aria-labelledby="account-title">
        <div>
          <h2 id="account-title">Keep your links connected to you</h2>
          <p className="muted">
            Account pages are coming soon. Anonymous shortening is available
            now.
          </p>
        </div>
        <div className="row">
          <Link className="button button--primary" to="/register">
            Sign up
          </Link>
          <Link className="button button--secondary" to="/login">
            Log in
          </Link>
        </div>
      </section>
    </PageContainer>
  );
}
