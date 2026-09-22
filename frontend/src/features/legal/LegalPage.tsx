import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { PageContainer } from '../../layout/PageContainer';
import { legalContactEmail, legalName } from '../../config/public';
import { legalPages, type LegalPagePath } from './content';
import './legal.css';

function configuredText(text: string) {
  return text
    .replaceAll('{{legalName}}', legalName)
    .replaceAll('{{contactEmail}}', legalContactEmail);
}

export function LegalPage({ path }: { path: LegalPagePath }) {
  const page = legalPages[path];
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const sections = page.sections
      .map((_, index) => document.getElementById(`section-${index + 1}`))
      .filter((section): section is HTMLElement => section !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (first, second) =>
              first.boundingClientRect.top - second.boundingClientRect.top,
          )[0];
        if (!visible) return;
        const index = sections.indexOf(visible.target as HTMLElement);
        if (index >= 0) setActiveSection(index);
      },
      { rootMargin: '-18% 0px -68% 0px', threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [page.sections]);
  return (
    <PageContainer className="legal-page">
      <header className="legal-page__hero">
        <p className="legal-page__eyebrow">{page.eyebrow}</p>
        <h1>{page.title}</h1>
        <p>{page.lead}</p>
        <aside aria-label="Production review notice">
          Project template: review this page and replace its configurable legal
          identity and contact placeholders before production launch.
        </aside>
      </header>
      <hr />
      <div className="legal-page__layout">
        <nav aria-label={`${page.title} sections`}>
          <strong>Contents</strong>
          <ol>
            {page.sections.map((section, index) => (
              <li
                className={index === activeSection ? 'is-active' : undefined}
                key={section.title}
              >
                <a
                  href={`#section-${index + 1}`}
                  aria-current={
                    index === activeSection ? 'location' : undefined
                  }
                  onClick={() => setActiveSection(index)}
                >
                  <span aria-hidden="true">{index + 1}</span>
                  <span>{section.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="legal-page__content">
          {page.sections.map((section, index) => (
            <section id={`section-${index + 1}`} key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{configuredText(paragraph)}</p>
              ))}
            </section>
          ))}
          <div className="legal-page__related" aria-label="Related legal pages">
            <h2>Related information</h2>
            <div>
              {Object.entries(legalPages)
                .filter(([relatedPath]) => relatedPath !== path)
                .map(([relatedPath, relatedPage]) => (
                  <Link key={relatedPath} to={relatedPath}>
                    {relatedPage.pageTitle}
                  </Link>
                ))}
            </div>
          </div>
        </article>
      </div>
    </PageContainer>
  );
}
