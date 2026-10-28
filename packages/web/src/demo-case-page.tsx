import { useMemo, useState, type ReactNode } from 'react';

/* Stryker disable all */

const tabs = ['Summary', 'Medical chronology', 'Procedural chronology', 'Five-step + RFC'] as const;
type Tab = (typeof tabs)[number];

const medical = [
  [
    '2019-04-12',
    'Dr. Maya Chen, primary care',
    'Lumbar pain and reduced range of motion',
    'Cyclobenzaprine',
    'Demo source · page 12',
  ],
  [
    '2020-08-03',
    'Hill Country Imaging',
    'MRI: multilevel degenerative changes',
    'None',
    'Demo source · page 28',
  ],
  [
    '2021-02-19',
    'Dr. Luis Romero, orthopedics',
    'Persistent radicular symptoms; conservative care',
    'Gabapentin',
    'Demo source · page 41',
  ],
];
const procedural = [
  ['2019-11-18', 'Initial application filed', 'Demo source · page 3'],
  ['2020-03-06', 'Initial claim denied', 'Demo source · page 7'],
  ['2021-06-15', 'ALJ hearing held', 'Demo source · page 66'],
  ['2021-09-02', 'ALJ decision issued', 'Demo source · page 2'],
  ['2022-02-11', 'Appeals Council denied review', 'Demo source · page 5'],
];

function buildDemoPdf(): string {
  const encoder = new TextEncoder();
  const chunks: string[] = ['%PDF-1.4\n'];
  const offsets = [0];
  const addObject = (body: string) => {
    offsets.push(encoder.encode(chunks.join('')).byteLength);
    chunks.push(`${offsets.length - 1} 0 obj\n${body}\nendobj\n`);
  };
  const pageTexts = [
    [
      'WESTERN DISTRICT OF TEXAS',
      'ELLIS v. COMMISSIONER OF SOCIAL SECURITY',
      'ALJ DECISION',
      'The claimant alleges disability beginning January 14, 2019.',
      'The decision finds severe lumbar degenerative disc disease.',
      'The residual functional capacity permits sedentary work.',
    ],
    [
      'MEDICAL EVIDENCE',
      '2019-04-12  Dr. Maya Chen  Lumbar pain and reduced range of motion.',
      '2020-08-03  Hill Country Imaging  MRI: multilevel degenerative changes.',
      '2021-02-19  Dr. Luis Romero  Persistent radicular symptoms.',
      'The treatment record includes conservative care and medication changes.',
    ],
    [
      'PLAINTIFF BRIEF',
      'Plaintiff argues that the longitudinal treatment record supports greater limits.',
      'COMMISSIONER BRIEF',
      'The Commissioner argues that the ALJ addressed objective findings and activities.',
      'HEARING TRANSCRIPT',
      'The vocational expert identified sedentary occupations under the hypothetical.',
    ],
  ];
  addObject('<< /Type /Catalog /Pages 2 0 R >>');
  addObject('<< /Type /Pages /Kids [3 0 R 5 0 R 7 0 R] /Count 3 >>');
  for (let index = 0; index < pageTexts.length; index += 1) {
    const pageId = 3 + index * 2;
    const contentsId = pageId + 1;
    const lines = pageTexts[index]?.map((line) => `(${line}) Tj 0 -30 Td`).join('\n');
    const stream = `BT\n/F1 12 Tf\n72 720 Td\n${lines}\nET`;
    addObject(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 9 0 R >> >> /Contents ${contentsId} 0 R >>`,
    );
    addObject(`<< /Length ${encoder.encode(stream).byteLength} >>\nstream\n${stream}\nendstream`);
  }
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const xref = encoder.encode(chunks.join('')).byteLength;
  chunks.push(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  for (const offset of offsets.slice(1))
    chunks.push(`${String(offset).padStart(10, '0')} 00000 n \n`);
  chunks.push(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return chunks.join('');
}

const DEMO_PDF_DATA_URL = `data:application/pdf,${encodeURIComponent(buildDemoPdf())}`;

type DemoSourceExcerpt = Readonly<{
  page: number;
  totalPages: number;
  context: string;
  highlight: string;
}>;

function sourceExcerpt(label: string): DemoSourceExcerpt {
  if (label.startsWith('Plaintiff brief'))
    return {
      page: 9,
      totalPages: 18,
      context:
        'Plaintiff argues that the treatment record supports greater limitations than the ALJ included in the RFC.',
      highlight: 'The ALJ failed to explain why the longitudinal treatment record was discounted.',
    };
  if (label.startsWith('Commissioner brief'))
    return {
      page: 14,
      totalPages: 21,
      context:
        'The Commissioner responds that the ALJ addressed the objective findings and the claimant’s reported activities.',
      highlight: 'The ALJ reasonably evaluated the longitudinal record and identified other work.',
    };
  if (label.startsWith('Hearing transcript'))
    return {
      page: 72,
      totalPages: 86,
      context:
        'The vocational expert answered the ALJ’s hypothetical based on the stated residual functional capacity.',
      highlight: 'Three sedentary occupations remain available under the hypothetical limitations.',
    };
  if (label.startsWith('Demo source'))
    return {
      page: Number.parseInt(label.slice(label.lastIndexOf('page ') + 5), 10),
      totalPages: 84,
      context:
        'The medical and procedural record supplies the source detail used by the review workspace.',
      highlight: 'The record entry is shown beside the source location for verification.',
    };
  return {
    page: 6,
    totalPages: 84,
    context:
      'The administrative law judge considered the claimant’s lumbar degenerative disc disease, treatment history, reported activities, and opinion evidence.',
    highlight:
      'The residual functional capacity permits sedentary work with occasional postural activities.',
  };
}

function SourceLink({ children, onOpen }: { children: ReactNode; onOpen?: () => void }) {
  return (
    <button className="source-link demo-source-link" type="button" onClick={onOpen}>
      {children}
    </button>
  );
}

export function DemoCasePage() {
  const [tab, setTab] = useState<Tab>('Summary');
  const [source, setSource] = useState('ALJ decision · page 6');
  const excerpt = sourceExcerpt(source);
  const openSource = (label: string) => setSource(label);
  return (
    <main id="main-content" className="page demo-case-page" tabIndex={-1}>
      <div className="page-intro">
        <p className="eyebrow">DEMO CASE / FICTIONAL SYNTHETIC RECORD</p>
        <h1>Jordan Ellis — lumbar impairment appeal</h1>
        <p className="lede">
          A guided demonstration case. Every fact below is fictional and source-labeled.
        </p>
      </div>
      <div className="demo-workspace">
        <div className="demo-content">
          <nav className="case-tabs" aria-label="Demo case views">
            {tabs.map((item) => (
              <button
                className="case-tab"
                key={item}
                type="button"
                aria-selected={tab === item}
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            ))}
          </nav>
          {tab === 'Summary' ? (
            <section className="panel demo-panel" aria-labelledby="demo-summary-heading">
              <h2 id="demo-summary-heading">Case summary</h2>
              <div className="demo-profile" aria-labelledby="demo-profile-heading">
                <h3 id="demo-profile-heading">Case profile</h3>
                <dl>
                  <div>
                    <dt>Alleged onset date</dt>
                    <dd>January 14, 2019</dd>
                  </div>
                  <div>
                    <dt>Date last insured</dt>
                    <dd>December 31, 2024</dd>
                  </div>
                  <div>
                    <dt>Claim type</dt>
                    <dd>Title II disability insurance benefits</dd>
                  </div>
                  <div>
                    <dt>Representation</dt>
                    <dd>Jordan Ellis, represented by Morgan Patel</dd>
                  </div>
                  <div>
                    <dt>Current posture</dt>
                    <dd>Appeals Council denial reviewed on civil complaint</dd>
                  </div>
                </dl>
              </div>
              <p>
                <strong>Issue:</strong> Whether the Commissioner applied the RFC assessment and
                vocational evidence consistently with the record.
              </p>
              <div className="demo-grid">
                <article>
                  <h3>Plaintiff’s position</h3>
                  <p>The ALJ discounted limits supported by treating examinations and the MRI.</p>
                  <SourceLink onOpen={() => openSource('Plaintiff brief · page 9')}>
                    Open Plaintiff’s brief · page 9
                  </SourceLink>
                </article>
                <article>
                  <h3>Commissioner’s position</h3>
                  <p>
                    The ALJ reasonably weighed the longitudinal record and identified other work.
                  </p>
                  <SourceLink onOpen={() => openSource('Commissioner brief · page 14')}>
                    Open Commissioner’s brief · page 14
                  </SourceLink>
                </article>
                <article>
                  <h3>ALJ decision</h3>
                  <p>
                    The decision found severe lumbar degenerative disc disease but retained
                    sedentary work capacity.
                  </p>
                  <SourceLink onOpen={() => openSource('ALJ decision · page 6')}>
                    Open ALJ decision · page 6
                  </SourceLink>
                </article>
              </div>
              <p className="demo-notice">
                Source links are demonstration controls. The production workflow will open the
                original page and highlight verified text.
              </p>
            </section>
          ) : tab === 'Medical chronology' ? (
            <ChronologyTable
              key="medical"
              title="Medical chronology"
              headers={['Date', 'Provider', 'Reason for visit', 'Prescription', 'Record']}
              rows={medical}
              onOpen={openSource}
            />
          ) : tab === 'Procedural chronology' ? (
            <ChronologyTable
              key="procedural"
              title="Procedural chronology"
              headers={['Date', 'Event', 'Record']}
              rows={procedural}
              important
              onOpen={openSource}
            />
          ) : (
            <section className="panel demo-panel" aria-labelledby="five-step-heading">
              <h2 id="five-step-heading">Five-step review and RFC</h2>
              {[
                [
                  'Step 1 · Substantial gainful activity',
                  'The ALJ found no disqualifying earnings after the alleged onset date.',
                  'ALJ decision · page 4',
                ],
                [
                  'Step 2 · Severe impairment',
                  'The parties agree the record supports severe lumbar degenerative disc disease.',
                  'Plaintiff’s brief · page 7',
                ],
                [
                  'Step 3 · Listing',
                  'The ALJ found that the impairment did not meet or equal a listed impairment.',
                  'ALJ decision · page 5',
                ],
                [
                  'RFC · Residual functional capacity',
                  'The ALJ limited the claimant to sedentary work with occasional postural activities.',
                  'ALJ decision · page 6',
                ],
                [
                  'Steps 4–5 · Past and other work',
                  'The vocational expert identified three sedentary occupations available under the RFC.',
                  'Hearing transcript · page 72',
                ],
              ].map(([heading, text, source]) => (
                <article className="review-step" key={heading}>
                  <h3>{heading}</h3>
                  <p>{text}</p>
                  <SourceLink onOpen={() => openSource(source as string)}>
                    Verify quote · {source}
                  </SourceLink>
                </article>
              ))}
            </section>
          )}
          <ReferenceDesk />
        </div>
        <aside className="demo-source-viewer" aria-label="Source document viewer">
          <div className="demo-viewer-header">
            <div>
              <p className="eyebrow">SOURCE DOCUMENT</p>
              <h2>{source}</h2>
            </div>
            <button
              className="source-link"
              type="button"
              onClick={() => setSource('ALJ decision · page 6')}
            >
              Reset
            </button>
            <button
              className="source-link"
              type="button"
              onClick={() => window.open(DEMO_PDF_DATA_URL, '_blank', 'noopener,noreferrer')}
            >
              Open PDF in new tab
            </button>
          </div>
          <div
            className="pdf-page"
            role="document"
            aria-label={`Fictional PDF preview for ${source}`}
          >
            <p className="pdf-masthead">UNITED STATES DISTRICT COURT · WESTERN DISTRICT OF TEXAS</p>
            <p className="pdf-caption">ELLIS v. COMMISSIONER OF SOCIAL SECURITY</p>
            <p className="pdf-page-number">
              Page {excerpt.page} of {excerpt.totalPages}
            </p>
            <p>Record review excerpt</p>
            <p>{excerpt.context}</p>
            <mark>{excerpt.highlight}</mark>
            <p>
              This highlighted text represents the verified citation location. The production viewer
              will open the uploaded PDF page and preserve the source reference.
            </p>
          </div>
          <p className="demo-notice">Fictional PDF preview · no real claimant information</p>
        </aside>
      </div>
    </main>
  );
}

function ReferenceDesk() {
  return (
    <section className="panel demo-panel reference-desk" aria-labelledby="reference-desk-heading">
      <h2 id="reference-desk-heading">Reference desk</h2>
      <p>
        Curated public references help explain terms. Reference material is not case evidence and
        does not add an argument to the review.
      </p>
      <ul>
        <li>
          <a
            className="reference-link"
            href="https://www.ecfr.gov/current/title-20/part-404/subpart-P/section-404.1545"
            target="_blank"
            rel="noreferrer"
          >
            Residual functional capacity · 20 CFR § 404.1545
          </a>
        </li>
        <li>
          <a
            className="reference-link"
            href="https://www.ssa.gov/oact/cola/sga.html"
            target="_blank"
            rel="noreferrer"
          >
            Substantial gainful activity · SSA reference
          </a>
        </li>
        <li>
          <a
            className="reference-link"
            href="https://medlineplus.gov/genetics/condition/intervertebral-disc-disease/"
            target="_blank"
            rel="noreferrer"
          >
            Intervertebral disc disease · MedlinePlus
          </a>
        </li>
      </ul>
    </section>
  );
}

function ChronologyTable({
  title,
  headers,
  rows,
  important = false,
  onOpen,
}: {
  title: string;
  headers: string[];
  rows: string[][];
  important?: boolean;
  onOpen: (label: string) => void;
}) {
  const [filter, setFilter] = useState('');
  const [correctionFor, setCorrectionFor] = useState<string>();
  const [correction, setCorrection] = useState('');
  const [savedCorrections, setSavedCorrections] = useState<Record<string, string>>({});
  const [emphasizedRows, setEmphasizedRows] = useState<Set<string>>(
    () => new Set(important ? rows.map((row) => row[0] ?? 'unknown-entry') : []),
  );
  const [eventGroups, setEventGroups] = useState<Record<string, string>>({});
  const filteredRows = useMemo(() => {
    const normalized = filter.trim().toLocaleLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) => row.join(' ').toLocaleLowerCase().includes(normalized));
  }, [filter, rows]);
  return (
    <section className="panel demo-panel" aria-labelledby={`${title}-heading`}>
      <h2 id={`${title}-heading`}>{title}</h2>
      <label className="chronology-filter" htmlFor={`${title}-filter`}>
        Filter {title.toLocaleLowerCase()}
        <input
          id={`${title}-filter`}
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </label>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {headers.map((header) => (
                <th scope="col" key={header}>
                  {header}
                </th>
              ))}
              <th scope="col">Review action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const rowKey = row[0] ?? 'unknown-entry';
              return (
                <tr
                  className={`${important && emphasizedRows.has(rowKey) ? 'important-event' : ''} ${
                    eventGroups[rowKey] ? `event-group-${eventGroups[rowKey]}` : ''
                  }`.trim()}
                  key={row.join('-')}
                >
                  {row.map((cell, index) => (
                    <td key={`${cell}-${index}`}>
                      {index === row.length - 1 ? (
                        <SourceLink onOpen={() => onOpen(cell)}>{cell}</SourceLink>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                  <td>
                    {important ? (
                      <div className="presentation-controls">
                        <button
                          className="source-link"
                          type="button"
                          onClick={() =>
                            setEmphasizedRows((current) => {
                              const next = new Set(current);
                              if (next.has(rowKey)) next.delete(rowKey);
                              else next.add(rowKey);
                              return next;
                            })
                          }
                        >
                          Toggle milestone emphasis for {rowKey}
                        </button>
                        <label htmlFor={`${title}-${rowKey}-group`}>Event group for {rowKey}</label>
                        <select
                          id={`${title}-${rowKey}-group`}
                          value={eventGroups[rowKey] ?? ''}
                          onChange={(event) =>
                            setEventGroups((current) => ({
                              ...current,
                              [rowKey]: event.target.value,
                            }))
                          }
                        >
                          <option value="">No group</option>
                          <option value="application">Application</option>
                          <option value="medical">Medical</option>
                          <option value="appeals">Appeals</option>
                        </select>
                      </div>
                    ) : null}
                    <button
                      className="source-link"
                      type="button"
                      onClick={() => {
                        setCorrectionFor(rowKey);
                        setCorrection(savedCorrections[rowKey] ?? '');
                      }}
                    >
                      Suggest correction for {row[0]}
                    </button>
                    {correctionFor === rowKey ? (
                      <div className="correction-form">
                        <label htmlFor={`${title}-${rowKey}-correction`}>
                          Correction suggestion
                        </label>
                        <textarea
                          id={`${title}-${rowKey}-correction`}
                          value={correction}
                          onChange={(event) => setCorrection(event.target.value)}
                          rows={2}
                        />
                        <button
                          className="button secondary-button"
                          type="button"
                          onClick={() => {
                            const trimmed = correction.trim();
                            if (!trimmed) return;
                            setSavedCorrections((current) => ({ ...current, [rowKey]: trimmed }));
                            setCorrectionFor(undefined);
                          }}
                          disabled={!correction.trim()}
                        >
                          Save correction suggestion
                        </button>
                      </div>
                    ) : null}
                    {savedCorrections[rowKey] ? (
                      <p className="correction-note" role="status">
                        Correction suggestion recorded locally for review.{' '}
                        <span>{savedCorrections[rowKey]}</span>
                      </p>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filteredRows.length === 0 ? <p role="status">No matching chronology entries.</p> : null}
    </section>
  );
}

/* Stryker restore all */
