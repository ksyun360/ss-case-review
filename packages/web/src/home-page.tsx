export function HomePage() {
  return (
    <main id="main-content" className="page home-page" tabIndex={-1}>
      <div className="page-intro">
        <p className="eyebrow">CASE REVIEW / WORKSPACE</p>
        <h1>Your case workspace</h1>
        <p className="lede">
          A clear starting point for reviewing the record, following citations, and organizing the
          issues raised by each party.
        </p>
      </div>
      <section className="start-grid" aria-label="Start reviewing">
        <article className="start-card primary-card">
          <span className="card-symbol document-symbol" aria-hidden="true" />
          <p className="eyebrow">START A NEW CASE</p>
          <h2>Bring the record together</h2>
          <p>Select the briefs, administrative decision, and supporting documents for one case.</p>
          <a className="button primary-button" href="/upload">
            Upload case record <span aria-hidden="true">↗</span>
          </a>
          <p className="card-note">PDF, DOC, DOCX, XLSX, TIF, and TIFF</p>
        </article>
        <article className="start-card">
          <span className="card-symbol folder-symbol" aria-hidden="true" />
          <p className="eyebrow">RETURN TO A CASE</p>
          <h2>Continue your review</h2>
          <p>Open an existing workspace to return to the record and your source-linked review.</p>
          <a className="button secondary-button" href="/cases">
            Open existing case <span aria-hidden="true">→</span>
          </a>
          <p className="card-note">Saved synthetic case metadata appears on the next page.</p>
        </article>
      </section>
      <section className="recent-section" aria-labelledby="recent-heading">
        <div className="section-heading">
          <h2 id="recent-heading">Recent cases</h2>
          <span className="quiet-badge">Local preview</span>
        </div>
        <div className="empty-state">
          <span className="empty-symbol" aria-hidden="true">
            —
          </span>
          <h3>Prepare synthetic documents</h3>
          <p>
            Select synthetic documents locally. A configured development API can register originals
            and process supported PDFs. Browse drafts from the Saved cases page.
          </p>
          <a className="text-link" href="/upload">
            Prepare a case record <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>
      <aside className="review-principle">
        <span className="principle-label">SOURCE-FIRST REVIEW</span>
        <p>
          The planned workspace will connect each extracted detail to the record. Judicial findings
          and decisions remain with the reviewer.
        </p>
      </aside>
    </main>
  );
}
