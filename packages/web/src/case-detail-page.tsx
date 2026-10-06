import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import {
  getSyntheticDocumentProcessing,
  getSyntheticOriginal,
  getSyntheticTextSource,
  getSyntheticCase,
  listSyntheticOriginals,
  listSyntheticTextSources,
  verifySyntheticTextSpan,
  type CaseSummary,
  type SyntheticDocumentProcessing,
  type SyntheticOriginalReceipt,
  type SyntheticTextSource,
  type SyntheticTextSourceReference,
} from './case-client.ts';

const PROCESSING_LABELS = {
  queued: 'Waiting to process',
  processing: 'Extracting record text',
  published: 'Source extraction complete',
  failed: 'Extraction could not complete',
} as const;
const PROCESSING_POLL_MILLISECONDS = 2_000;

export function splitVerifiedSourceText(
  rawText: string,
  span: { start: number; end: number },
): readonly [string, string, string] {
  return [
    rawText.slice(0, span.start),
    rawText.slice(span.start, span.end),
    rawText.slice(span.end),
  ];
}

export function SyntheticProcessingStatus({
  caseId,
  documentVersionId,
}: {
  caseId: string;
  documentVersionId: string;
}) {
  const [processing, setProcessing] = useState<
    SyntheticDocumentProcessing | null | 'unavailable'
  >();
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setProcessing(undefined);
    const load = () => {
      void getSyntheticDocumentProcessing(caseId, documentVersionId).then(
        (found) => {
          if (!active) return;
          setProcessing(found ?? null);
          if (found?.state === 'queued' || found?.state === 'processing')
            timer = setTimeout(load, PROCESSING_POLL_MILLISECONDS);
        },
        () => {
          if (active) setProcessing('unavailable');
        },
      );
    };
    load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [caseId, documentVersionId]);

  return (
    <span className="processing-status">
      {processing === undefined
        ? 'Loading processing status…'
        : processing === null
          ? 'No processing record found'
          : processing === 'unavailable'
            ? 'Processing status unavailable'
            : PROCESSING_LABELS[processing.state]}
    </span>
  );
}

export function SyntheticOriginalInventory({ caseId }: { caseId: string }) {
  const [inventory, setInventory] = useState<
    | Readonly<{ caseId: string; status: 'available'; originals: SyntheticOriginalReceipt[] }>
    | Readonly<{ caseId: string; status: 'unavailable' }>
  >();
  const [openingDocumentVersionId, setOpeningDocumentVersionId] = useState<string>();
  const [openError, setOpenError] = useState(false);
  const load = useCallback(() => {
    setInventory(undefined);
    void listSyntheticOriginals(caseId).then(
      (originals) => setInventory({ caseId, status: 'available', originals }),
      () => setInventory({ caseId, status: 'unavailable' }),
    );
  }, [caseId]);
  useEffect(() => {
    load();
  }, [load]);
  const current = inventory?.caseId === caseId ? inventory : undefined;
  const originals = current?.status === 'available' ? current.originals : undefined;
  const openOriginal = async (documentVersionId: string) => {
    setOpeningDocumentVersionId(documentVersionId);
    setOpenError(false);
    try {
      const blob = await getSyntheticOriginal(caseId, documentVersionId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setOpenError(true);
    } finally {
      setOpeningDocumentVersionId(undefined);
    }
  };

  return (
    <section className="panel empty-state" aria-live="polite">
      <h2>Registered originals</h2>
      {current?.status === 'unavailable' ? (
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
        <ul className="original-list">
          {originals.map((original) => (
            <li key={original.documentVersionId}>
              <code>{original.documentVersionId}</code> <span>{original.byteLength} bytes</span>
              <button
                className="source-link"
                type="button"
                onClick={() => void openOriginal(original.documentVersionId)}
                disabled={openingDocumentVersionId === original.documentVersionId}
              >
                {openingDocumentVersionId === original.documentVersionId
                  ? 'Opening original…'
                  : 'Open original document'}
              </button>
              <SyntheticProcessingStatus
                caseId={caseId}
                documentVersionId={original.documentVersionId}
              />
            </li>
          ))}
        </ul>
      )}
      {openError ? <p role="alert">Original document unavailable.</p> : null}
      <p>Processing status comes from the case-scoped background queue.</p>
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
  const [quote, setQuote] = useState<string>();
  const [verifiedSpan, setVerifiedSpan] = useState<
    { start: number; end: number; quote: string } | 'unavailable' | undefined
  >();
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
      setQuote('');
      setVerifiedSpan(undefined);
      void getSyntheticTextSource(caseId, reference.sourceUnitId).then(
        (found) => setSource(found ?? 'missing'),
        () => setSource('unavailable'),
      );
    },
    [caseId],
  );

  const verifyQuote = useCallback(() => {
    const verifiedSource = source as SyntheticTextSource;
    const verifiedReference = selected as SyntheticTextSourceReference;
    const citation = quote as string;
    const start = verifiedSource.rawText.indexOf(citation);
    if (start < 0) {
      setVerifiedSpan('unavailable');
      return;
    }
    void verifySyntheticTextSpan(caseId, verifiedReference.sourceUnitId, {
      recordRevision: verifiedSource.recordRevision,
      documentVersionId: verifiedSource.documentVersionId,
      documentSha256: verifiedSource.documentSha256,
      extractionVersion: verifiedSource.extractionVersion,
      sourceUnitId: verifiedSource.sourceUnitId,
      start,
      end: start + citation.length,
      quote: citation,
    }).then(
      (span) => setVerifiedSpan({ start: span.start, end: span.end, quote: span.quote }),
      () => setVerifiedSpan('unavailable'),
    );
  }, [caseId, quote, selected, source]);

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
              <label className="source-quote-label" htmlFor="source-quote">
                Verify a quotation against this page
              </label>
              <textarea
                id="source-quote"
                value={quote}
                onChange={(event) => {
                  setQuote(event.target.value);
                  setVerifiedSpan(undefined);
                }}
                rows={3}
              />
              <button
                className="button secondary-button"
                type="button"
                onClick={verifyQuote}
                disabled={!quote}
              >
                Verify and highlight
              </button>
              {verifiedSpan === 'unavailable' ? (
                <p role="alert">The citation could not be verified against this page.</p>
              ) : verifiedSpan ? (
                <p role="status">Citation verified against the persisted source text.</p>
              ) : null}
              <pre>
                {verifiedSpan && verifiedSpan !== 'unavailable' ? (
                  <>
                    {(() => {
                      const [before, highlighted, after] = splitVerifiedSourceText(
                        source.rawText,
                        verifiedSpan,
                      );
                      return (
                        <>
                          {before}
                          <mark>{highlighted}</mark>
                          {after}
                        </>
                      );
                    })()}
                  </>
                ) : (
                  source.rawText
                )}
              </pre>
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
