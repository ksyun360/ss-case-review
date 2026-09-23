import { useEffect, useState } from 'react';
import { listSyntheticCases, type CaseSummary } from './case-client.ts';

type CaseView =
  | { kind: 'initial' }
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'ready'; cases: CaseSummary[] };

export function CasesPage() {
  const [view, setView] = useState<CaseView>({ kind: 'initial' });
  const refresh = () => {
    setView({ kind: 'loading' });
    void listSyntheticCases().then(
      (cases) => setView({ kind: 'ready', cases }),
      () => setView({ kind: 'unavailable' }),
    );
  };
  useEffect(() => {
    if (view.kind === 'initial') refresh();
  });

  return (
    <main id="main-content" className="page" tabIndex={-1}>
      <div className="page-intro">
        <p className="eyebrow">CASE REVIEW / SAVED CASES</p>
        <h1>Existing cases</h1>
        <p className="lede">Return to a case workspace and continue reviewing the record.</p>
      </div>
      {view.kind === 'initial' || view.kind === 'loading' ? (
        <section className="empty-state panel" aria-live="polite">
          <p role="status">Loading saved cases…</p>
        </section>
      ) : view.kind === 'ready' ? (
        <section className="panel" aria-labelledby="saved-cases-heading">
          <h2 id="saved-cases-heading">Saved cases</h2>
          <p>These drafts do not include uploaded documents yet.</p>
          {view.cases.length === 0 ? (
            <div className="empty-state">
              <h3>No saved cases yet</h3>
              <p>The local workspace has no synthetic case drafts.</p>
              <a className="button primary-button" href="/upload">
                Prepare a case record
              </a>
            </div>
          ) : (
            <ul className="file-list" aria-label="Saved cases">
              {view.cases.map((item) => (
                <li className="file-row" key={item.caseId}>
                  <div className="file-details">
                    <strong>{item.label}</strong>
                    <span>Record revision {item.recordRevision}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="empty-state panel" aria-labelledby="empty-cases-heading">
          <span className="empty-symbol" aria-hidden="true">
            —
          </span>
          <h2 id="empty-cases-heading">Case storage is not connected</h2>
          <p>The local case service is {view.kind}. Retry after the service starts.</p>
          <button className="button secondary-button" type="button" onClick={refresh}>
            Retry loading cases
          </button>
          <a className="button primary-button" href="/upload">
            Prepare a case record
          </a>
        </section>
      )}
    </main>
  );
}
