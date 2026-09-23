import { useEffect, useState, type FormEvent } from 'react';
import { createSyntheticCase, listSyntheticCases, type CaseSummary } from './case-client.ts';

type CaseView =
  | { kind: 'initial' }
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'ready'; cases: CaseSummary[] };

export function CasesPage() {
  const [view, setView] = useState<CaseView>({ kind: 'initial' });
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [creationError, setCreationError] = useState(false);
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
  const submitDraft = (event: FormEvent<HTMLFormElement>, currentCases: CaseSummary[]) => {
    event.preventDefault();
    setCreating(true);
    setCreationError(false);
    void createSyntheticCase(label.trim()).then(
      (created) => {
        setView({ kind: 'ready', cases: [...currentCases, created] });
        setLabel('');
        setCreating(false);
      },
      () => {
        setCreationError(true);
        setCreating(false);
      },
    );
  };

  return (
    <main id="main-content" className="page" tabIndex={-1}>
      <div className="page-intro">
        <p className="eyebrow">CASE REVIEW / SAVED CASES</p>
        <h1>Existing cases</h1>
        <p className="lede">Browse synthetic case drafts. Record review is not available yet.</p>
      </div>
      {view.kind === 'initial' || view.kind === 'loading' ? (
        <section className="empty-state panel" aria-live="polite">
          <p role="status">Loading saved cases…</p>
        </section>
      ) : view.kind === 'ready' ? (
        <section className="panel" aria-labelledby="saved-cases-heading">
          <h2 id="saved-cases-heading">Saved cases</h2>
          <p>These drafts do not include uploaded documents yet.</p>
          <form className="case-create" onSubmit={(event) => submitDraft(event, view.cases)}>
            <label htmlFor="synthetic-case-label">Synthetic case label</label>
            <div className="case-create-controls">
              <input
                id="synthetic-case-label"
                value={label}
                onChange={(event) => setLabel(event.currentTarget.value)}
                required
                maxLength={120}
              />
              <button className="button primary-button" type="submit" disabled={creating}>
                Create synthetic draft
              </button>
            </div>
            {creationError && (
              <p role="alert">
                Check the saved case list before trying again; the request may have succeeded.
              </p>
            )}
          </form>
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
                    <strong>
                      <a href={`/cases/${item.caseId}`}>{item.label}</a>
                    </strong>
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
