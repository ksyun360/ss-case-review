import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  createSyntheticCase,
  getSyntheticUploadCapability,
  uploadSyntheticOriginal,
} from './case-client.ts';

export function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [transferStatus, setTransferStatus] = useState('Checking synthetic original transfer.');
  const [transferAvailable, setTransferAvailable] = useState(false);
  const [label, setLabel] = useState('');
  const [registrationStarted, setRegistrationStarted] = useState(false);
  const [creationUncertain, setCreationUncertain] = useState(false);
  const [unconfirmedIndex, setUnconfirmedIndex] = useState<number | null>(null);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [savedCaseId, setSavedCaseId] = useState<string | null>(null);
  const capabilityRequested = useRef(false);

  useEffect(() => {
    if (capabilityRequested.current) return;
    capabilityRequested.current = true;
    void getSyntheticUploadCapability().then(
      (enabled) => {
        setTransferAvailable(enabled);
        setTransferStatus(
          enabled
            ? 'Synthetic original transfer is available.'
            : 'Synthetic original transfer is not configured.',
        );
      },
      () => setTransferStatus('Synthetic original transfer status is unavailable.'),
    );
  });

  const registerOriginals = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRegistrationStarted(true);
    void (async () => {
      let created;
      try {
        created = await createSyntheticCase(label.trim());
      } catch {
        setCreationUncertain(true);
        return;
      }
      setSavedCaseId(created.caseId);
      for (const [index, file] of files.entries()) {
        try {
          await uploadSyntheticOriginal(created.caseId, file);
        } catch {
          setUnconfirmedIndex(index);
          return;
        }
        setRegisteredCount((count) => count + 1);
      }
    })();
  };

  return (
    <main id="main-content" className="page upload-page" tabIndex={-1}>
      <div className="page-intro">
        <p className="eyebrow">CASE REVIEW / NEW RECORD</p>
        <h1>Prepare a case record</h1>
        <p className="lede">
          Gather synthetic documents for one case. Review the file list before registering
          originals.
        </p>
      </div>
      <div className="upload-grid">
        <section className="panel selection-panel" aria-labelledby="documents-heading">
          <div className="section-heading">
            <h2 id="documents-heading">Case documents</h2>
            <span className="quiet-badge">Step 1 · Select</span>
          </div>
          <div className="file-picker">
            <span className="card-symbol document-symbol" aria-hidden="true" />
            <label htmlFor="case-files">Choose case documents</label>
            <p id="file-help">PDF, DOC, DOCX, XLSX, TIF, or TIFF. Use synthetic documents only.</p>
            <input
              id="case-files"
              type="file"
              multiple
              disabled={registrationStarted}
              accept=".pdf,.doc,.docx,.xlsx,.tif,.tiff"
              aria-describedby="file-help local-only-note"
              onChange={(event) => {
                const selected = Array.from(event.currentTarget.files as FileList);
                setFiles((previous) => [...previous, ...selected]);
                event.currentTarget.value = '';
              }}
            />
          </div>
          <p id="local-only-note" className="local-note">
            Selection stays on your device until you register the originals. This preview does not
            inspect or process document contents.
          </p>
          <section className="manifest" aria-labelledby="manifest-heading">
            <h3 id="manifest-heading">Selected documents</h3>
            <ul className="file-list" aria-label="Selected documents">
              {files.map((file, index) => (
                <li className="file-row" key={index}>
                  <div className="file-details">
                    <strong>{file.name}</strong>
                    <span>{file.size} bytes</span>
                    <span>
                      {index < registeredCount
                        ? 'Registered'
                        : index === unconfirmedIndex
                          ? 'Unconfirmed'
                          : 'Ready'}
                    </span>
                  </div>
                  <button
                    className="button secondary-button remove-file"
                    type="button"
                    disabled={registrationStarted}
                    aria-label={`Remove ${file.name}`}
                    onClick={() =>
                      setFiles((previous) => previous.filter((_, row) => row !== index))
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <form className="upload-actions" onSubmit={registerOriginals}>
            <p role="status">{transferStatus}</p>
            <label htmlFor="upload-case-label">Synthetic case label</label>
            <input
              id="upload-case-label"
              value={label}
              disabled={registrationStarted}
              onChange={(event) => setLabel(event.currentTarget.value)}
              maxLength={120}
              required
            />
            <button
              className="button primary-button"
              type="submit"
              disabled={
                !transferAvailable || files.length === 0 || !label.trim() || registrationStarted
              }
              aria-describedby="processing-note"
            >
              Register synthetic originals
            </button>
            {files.length > 0 && (
              <>
                <progress
                  aria-label="Original registration progress"
                  aria-valuenow={registeredCount}
                  value={registeredCount}
                  max={files.length}
                />
                <p>
                  {registeredCount} of {files.length} originals registered
                </p>
              </>
            )}
            {savedCaseId && <a href={`/cases/${savedCaseId}`}>Open synthetic case</a>}
            {creationUncertain && (
              <p role="alert">
                Draft creation could not be confirmed. <a href="/cases">Check saved cases</a> before
                trying again.
              </p>
            )}
            {unconfirmedIndex !== null && (
              <p role="alert">
                A file transfer could not be confirmed. The case may contain some originals. Do not
                retry this upload from this page.
              </p>
            )}
            <p id="processing-note">Extraction and review are not available yet.</p>
          </form>
        </section>
        <aside className="panel checklist-panel" aria-labelledby="checklist-heading">
          <p className="eyebrow">BEFORE YOU START</p>
          <h2 id="checklist-heading">A complete record</h2>
          <p>
            Document numbers do not reliably identify the contents. Include the available documents
            for this case.
          </p>
          <ul className="record-checklist">
            <li>Plaintiff’s brief</li>
            <li>Commissioner’s brief</li>
            <li>ALJ decision and hearing transcript</li>
            <li>Medical and administrative evidence</li>
            <li>
              Replies, when available <span className="optional-label">Optional</span>
            </li>
          </ul>
          <div className="checklist-note">
            <strong>Keep the originals.</strong>
            <p>Later processing will preserve document versions and source locations for review.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
