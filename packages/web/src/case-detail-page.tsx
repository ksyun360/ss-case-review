import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { getSyntheticCase, type CaseSummary } from './case-client.ts';

export function CaseDetailPage() {
  const { caseId } = useParams();
  const [record, setRecord] = useState<CaseSummary | null>();
  useEffect(() => {
    void getSyntheticCase(caseId as string).then((found) => setRecord(found ?? null));
  }, [caseId]);

  return (
    <main id="main-content" className="page" tabIndex={-1}>
      {record === null ? (
        <section className="panel empty-state">
          <h1>Case unavailable</h1>
          <p>This case is not available in your synthetic workspace.</p>
          <a className="button secondary-button" href="/cases">
            Back to saved cases
          </a>
        </section>
      ) : record ? (
        <>
          <div className="page-intro">
            <p className="eyebrow">CASE REVIEW / SYNTHETIC DRAFT</p>
            <h1>{record.label}</h1>
            <p className="lede">Record revision {record.recordRevision}</p>
          </div>
          <section className="panel empty-state">
            <h2>Record not uploaded</h2>
            <p>No documents have been uploaded for this synthetic draft.</p>
            <a className="button secondary-button" href="/cases">
              Back to saved cases
            </a>
          </section>
        </>
      ) : (
        <section className="panel empty-state" aria-live="polite">
          <p role="status">Loading case…</p>
        </section>
      )}
    </main>
  );
}
