import { useEffect, useRef, useState } from 'react';
import { getSyntheticUploadCapability } from './case-client.ts';

export function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [transferStatus, setTransferStatus] = useState('Checking synthetic original transfer.');
  const capabilityRequested = useRef(false);

  useEffect(() => {
    if (capabilityRequested.current) return;
    capabilityRequested.current = true;
    void getSyntheticUploadCapability().then(
      (enabled) =>
        setTransferStatus(
          enabled
            ? 'Synthetic original transfer is available.'
            : 'Synthetic original transfer is not configured.',
        ),
      () => setTransferStatus('Synthetic original transfer status is unavailable.'),
    );
  });

  return (
    <main id="main-content" className="page upload-page" tabIndex={-1}>
      <div className="page-intro">
        <p className="eyebrow">CASE REVIEW / NEW RECORD</p>
        <h1>Prepare a case record</h1>
        <p className="lede">
          Gather the documents for one case. Review the file list before any future upload.
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
            Files remain on your device. This preview does not upload, read, or process document
            contents.
          </p>
          <section className="manifest" aria-labelledby="manifest-heading">
            <h3 id="manifest-heading">Selected documents</h3>
            <ul className="file-list" aria-label="Selected documents">
              {files.map((file, index) => (
                <li className="file-row" key={index}>
                  <div className="file-details">
                    <strong>{file.name}</strong>
                    <span>{file.size} bytes</span>
                  </div>
                  <button
                    className="button secondary-button remove-file"
                    type="button"
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
          <div className="upload-actions">
            <p role="status">{transferStatus}</p>
            <button
              className="button primary-button"
              type="button"
              disabled
              aria-describedby="processing-note"
            >
              Upload and process
            </button>
            <p id="processing-note">Upload and processing are not connected yet.</p>
          </div>
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
