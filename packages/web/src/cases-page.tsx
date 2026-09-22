export function CasesPage() {
  return (
    <main id="main-content" className="page" tabIndex={-1}>
      <div className="page-intro">
        <p className="eyebrow">CASE REVIEW / SAVED CASES</p>
        <h1>Existing cases</h1>
        <p className="lede">Return to a case workspace and continue reviewing the record.</p>
      </div>
      <section className="empty-state panel" aria-labelledby="empty-cases-heading">
        <span className="empty-symbol" aria-hidden="true">
          —
        </span>
        <h2 id="empty-cases-heading">Case storage is not connected</h2>
        <p>
          This preview does not create or retrieve saved cases. No court records are available in
          this workspace.
        </p>
        <a className="button primary-button" href="/upload">
          Prepare a case record
        </a>
      </section>
    </main>
  );
}
