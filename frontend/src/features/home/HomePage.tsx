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
        <div className="home-hero__copy">
          <p className="home-eyebrow">A simpler way to share</p>
          <h1 id="home-title">{homeTitle}</h1>
          <UrlExamples />
          <p className="home-intro">
            Create free short URLs, generate QR codes, and understand how people interact with your links. Ushly provides privacy-conscious click analytics, link management, expiration controls, and secure sharing for individuals and small businesses.
          </p>
          <Link
            className="button button--primary home-hero__cta"
            to="/register"
          >
            Create free account
          </Link>
        </div>
        <ShortenForm />
      </section>
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
          Link management and analytics require the authenticated owner.
          Homepage QR generation happens locally in your browser. A short URL is
          public: anyone who has it can follow it. Avoid shortening confidential
          URLs or links that contain access credentials.
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
