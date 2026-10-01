import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import {
  getSyntheticTextSource,
  getSyntheticCase,
  listSyntheticOriginals,
  listSyntheticTextSources,
  type CaseSummary,
  type SyntheticOriginalReceipt,
  type SyntheticTextSource,
  type SyntheticTextSourceReference,
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
      <p>Automatic source extraction is not connected yet.</p>
      <a className="button secondary-button" href="/cases">
        Back to saved cases
      </a>
    </section>
  );
}

export function SyntheticSourceWorkspace({ caseId }: { caseId: string }) {
  const [references, setReferences] = useState<SyntheticTextSourceReference[] | 'unavailable'>();
  const [selected, setSelected] = useState<SyntheticTextSourceReference>();
  const [source, setSource] = useState<SyntheticTextSource | 'unavailable' | 'missing'>();
  const loadInventory = useCallback(() => {
    setReferences(undefined);
    setSelected(undefined);
    void listSyntheticTextSources(caseId).then(setReferences, () => setReferences('unavailable'));
  }, [caseId]);
  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const openSource = useCallback(
    (reference: SyntheticTextSourceReference) => {
      setSelected(reference);
      setSource(undefined);
      void getSyntheticTextSource(caseId, reference.sourceUnitId).then(
        (found) => setSource(found ?? 'missing'),
        () => setSource('unavailable'),
      );
    },
    [caseId],
  );

  return (
    <section className="panel source-workspace" aria-live="polite">
      <h2>Record sources</h2>
      {references === 'unavailable' ? (
        <>
          <p>Source inventory unavailable.</p>
          <button className="button secondary-button" type="button" onClick={loadInventory}>
            Retry loading sources
          </button>
        </>
      ) : references === undefined ? (
        <p role="status">Loading record sources…</p>
      ) : references.length === 0 ? (
        <p>No extracted sources are available yet.</p>
      ) : (
        <ul className="source-list">
          {references.map((reference) => (
            <li key={reference.sourceUnitId}>
              <button className="source-link" type="button" onClick={() => openSource(reference)}>
                Open document {reference.documentVersionId.slice(-4)}, page {reference.pageNumber}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected ? (
        <div className="source-reader">
          {source === 'unavailable' ? (
            <>
              <p>Source text unavailable.</p>
              <button
                className="button secondary-button"
                type="button"
                onClick={() => openSource(selected)}
              >
                Retry opening source
              </button>
            </>
          ) : source === 'missing' ? (
            <p>The selected source is no longer available.</p>
          ) : source === undefined ? (
            <p role="status">Loading source page {selected.pageNumber}…</p>
          ) : (
            <article>
              <h3>
                Document {source.documentVersionId.slice(-4)}, page {source.pageNumber}
              </h3>
              <p>Extraction {source.extractionVersion}</p>
              <p className="source-hash">SHA-256 {source.documentSha256}</p>
              <pre>{source.rawText}</pre>
            </article>
          )}
        </div>
      ) : null}
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
          <SyntheticSourceWorkspace caseId={record.caseId} />
        </>
      ) : (
        <section className="panel empty-state" aria-live="polite">
          <p role="status">Loading case…</p>
        </section>
      )}
    </main>
  );
}
