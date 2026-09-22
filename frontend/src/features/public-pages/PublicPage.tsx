import { Link } from 'react-router';
import { PageContainer } from '../../layout/PageContainer';
import { publicPages, type PublicPagePath } from './content';
import './public-pages.css';

function PageVisual({
  kind,
}: {
  kind: (typeof publicPages)[PublicPagePath]['visual'];
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 96 96"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === 'link' && (
        <>
          <path d="M41 54a18 18 0 0 0 26 0l11-11a18 18 0 0 0-26-26l-7 7" />
          <path d="M55 42a18 18 0 0 0-26 0L18 53a18 18 0 0 0 26 26l7-7" />
        </>
      )}
      {kind === 'qr' && (
        <>
          <path d="M10 10h28v28H10zM58 10h28v28H58zM10 58h28v28H10z" />
          <path d="M58 58h10v10H58zM76 58h10v10H76zM58 76h10v10H58zM76 76h10v10H76z" />
        </>
      )}
      {kind === 'analytics' && (
        <>
          <path d="M14 82V14M14 82h70M28 68V49M45 68V29M62 68V39M79 68V20" />
        </>
      )}
      {kind === 'features' && (
        <>
          <rect x="12" y="12" width="30" height="30" rx="5" />
          <rect x="54" y="12" width="30" height="30" rx="5" />
          <rect x="12" y="54" width="30" height="30" rx="5" />
          <rect x="54" y="54" width="30" height="30" rx="5" />
        </>
      )}
    </svg>
  );
}

export function PublicPage({ path }: { path: PublicPagePath }) {
  const page = publicPages[path];
  return (
    <PageContainer className="public-page">
      <section
        className="public-page__hero"
        aria-labelledby="public-page-title"
      >
        <div className="public-page__intro">
          <p className="public-page__eyebrow">{page.eyebrow}</p>
          <h1 id="public-page-title">{page.title}</h1>
          <p>{page.lead}</p>
          <div className="public-page__actions">
            {page.heroActions.map((action) => (
              <Link
                key={action.label}
                className={`button button--${action.style}`}
                to={action.to}
              >
                {action.label}
                {action.style === 'primary' && (
                  <span aria-hidden="true">→</span>
                )}
              </Link>
            ))}
          </div>
        </div>
        <div
          className={`public-page__visual public-page__visual--${page.visual}`}
          aria-hidden="true"
        >
          <span className="public-page__visual-icon">
            <PageVisual kind={page.visual} />
          </span>
          <span className="public-page__visual-marks">
            <i />
            <i />
            <i />
          </span>
          <span className="public-page__visual-caption">
            {page.visualLabel}
          </span>
        </div>
      </section>

      <section
        className="public-page__panel"
        aria-labelledby="public-page-highlights"
      >
        <div className="public-page__section-heading">
          <p className="public-page__eyebrow">What Ushly offers</p>
          <h2 id="public-page-highlights">Built around real link behavior</h2>
        </div>
        <div className="public-page__cards">
          {page.highlights.map((item) => (
            <article className="public-page__card" key={item.title}>
              <span className="public-page__card-icon" aria-hidden="true">
                ✓
              </span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="public-page__steps"
        aria-labelledby="public-page-steps"
      >
        <div className="public-page__section-heading">
          <p className="public-page__eyebrow">In practice</p>
          <h2 id="public-page-steps">How it works</h2>
        </div>
        <ol>
          {page.steps.map((step, index) => (
            <li key={step}>
              <span aria-hidden="true">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="public-page__faq" aria-labelledby="public-page-faq">
        <h2 id="public-page-faq">Frequently asked questions</h2>
        {page.faqs.map((faq) => (
          <details key={faq.question}>
            <summary>{faq.question}</summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </section>

      <aside className="public-page__more" aria-label="Next steps">
        <div>
          <h2>{page.finalCta.title}</h2>
          <p>{page.finalCta.text}</p>
        </div>
        <div className="public-page__actions">
          {page.finalCta.actions.map((action) => (
            <Link
              key={action.label}
              className={`button button--${action.style}`}
              to={action.to}
            >
              {action.label}
              {action.style === 'primary' && <span aria-hidden="true">→</span>}
            </Link>
          ))}
        </div>
      </aside>
    </PageContainer>
  );
}
