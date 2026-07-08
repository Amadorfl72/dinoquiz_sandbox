import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { strings } from '../i18n';
import './PrivacyPolicyScreen.css';

export function PrivacyPolicyScreen() {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const { privacyPolicy } = strings;

  return (
    <main className="privacy-policy-screen">
      <Link
        to="/"
        className="privacy-policy-screen__back-button"
        aria-label={privacyPolicy.backButtonLabel}
      >
        <span aria-hidden="true">←</span>
        <span>{privacyPolicy.backButtonLabel}</span>
      </Link>

      <h1 className="privacy-policy-screen__title" tabIndex={-1} ref={headingRef}>
        {privacyPolicy.screenTitle}
      </h1>

      <p className="privacy-policy-screen__updated-at">{privacyPolicy.updatedAt}</p>

      <section
        className="privacy-policy-screen__callout"
        aria-labelledby="privacy-policy-kids-heading"
      >
        <h2 id="privacy-policy-kids-heading">{privacyPolicy.kidsCallout.heading}</h2>
        <p>{privacyPolicy.kidsCallout.body}</p>
      </section>

      {privacyPolicy.sections.map((section) => (
        <section
          key={section.id}
          className="privacy-policy-screen__section"
          aria-labelledby={`privacy-policy-${section.id}-heading`}
        >
          <h2 id={`privacy-policy-${section.id}-heading`}>{section.heading}</h2>
          {section.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </section>
      ))}

      <Link
        to="/"
        className="privacy-policy-screen__back-button privacy-policy-screen__back-button--bottom"
        aria-label={privacyPolicy.backButtonLabel}
      >
        {privacyPolicy.backButtonLabel}
      </Link>
    </main>
  );
}
