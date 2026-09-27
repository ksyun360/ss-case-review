import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import {
  getSyntheticCase,
  listSyntheticOriginals,
  type CaseSummary,
  type SyntheticOriginalReceipt,
} from './case-client.ts';

export function SyntheticOriginalInventory({ caseId }: { caseId: string }) {
  const [originals, setOriginals] = useState<SyntheticOriginalReceipt[] | 'unavailable'>();
  const load = useCallback(() => {
    setOriginals(undefined);
    void listSyntheticOriginals(caseId).then(setOriginals, () => setOriginals('unavailable'));
  }, [caseId]);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="panel empty-state" aria-live="polite">
      <h2>Registered originals</h2>
      {originals === 'unavailable' ? (
        <>
          <p>Original inventory unavailable. The case record has not been confirmed.</p>
          <button className="button secondary-button" type="button" onClick={load}>
            Retry loading originals
          </button>
        </>
      ) : originals === undefined ? (
        <p role="status">Loading registered originals…</p>
      ) : originals.length === 0 ? (
        <p>No registered originals yet.</p>
      ) : (
        <ul>
          {originals.map((original) => (
            <li key={original.documentVersionId}>
              <code>{original.documentVersionId}</code> <span>{original.byteLength} bytes</span>
            </li>
          ))}
        </ul>
      )}
      <p>Sources have not been extracted yet.</p>
      <a className="button secondary-button" href="/cases">
        Back to saved cases
      </a>
    </section>
  );
}

export function CaseDetailPage() {
  const { caseId } = useParams();
  const [record, setRecord] = useState<CaseSummary | null | 'unavailable'>();
  const load = useCallback(() => {
    setRecord(undefined);
    void getSyntheticCase(caseId as string).then(
      (found) => setRecord(found ?? null),
      () => setRecord('unavailable'),
    );
  }, [caseId]);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <main id="main-content" className="page" tabIndex={-1}>
      {record === 'unavailable' ? (
        <section className="panel empty-state">
          <h1>Case service unavailable</h1>
          <p>The local case service could not load this synthetic draft.</p>
          <button className="button secondary-button" type="button" onClick={load}>
            Retry loading case
          </button>
        </section>
      ) : record === null ? (
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
          <SyntheticOriginalInventory caseId={record.caseId} />
        </>
      ) : (
        <section className="panel empty-state" aria-live="polite">
          <p role="status">Loading case…</p>
        </section>
      )}
    </main>
  );
}
