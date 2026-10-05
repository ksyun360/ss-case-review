import { useState, type ReactNode } from 'react';

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
              title="Medical chronology"
              headers={['Date', 'Provider', 'Reason for visit', 'Prescription', 'Record']}
              rows={medical}
              onOpen={openSource}
            />
          ) : tab === 'Procedural chronology' ? (
            <ChronologyTable
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
          </div>
          <div
            className="pdf-page"
            role="document"
            aria-label={`Fictional PDF preview for ${source}`}
          >
            <p className="pdf-masthead">UNITED STATES DISTRICT COURT · WESTERN DISTRICT OF TEXAS</p>
            <p className="pdf-caption">ELLIS v. COMMISSIONER OF SOCIAL SECURITY</p>
            <p className="pdf-page-number">Page 6 of 84</p>
            <p>Record review excerpt</p>
            <p>
              The administrative law judge considered the claimant’s lumbar degenerative disc
              disease, treatment history, reported activities, and opinion evidence.
            </p>
            <mark>
              The residual functional capacity permits sedentary work with occasional postural
              activities.
            </mark>
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
  return (
    <section className="panel demo-panel" aria-labelledby={`${title}-heading`}>
      <h2 id={`${title}-heading`}>{title}</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {headers.map((header) => (
                <th scope="col" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className={important ? 'important-event' : undefined} key={row.join('-')}>
                {row.map((cell, index) => (
                  <td key={`${cell}-${index}`}>
                    {index === row.length - 1 ? (
                      <SourceLink onOpen={() => onOpen(cell)}>{cell}</SourceLink>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* Stryker restore all */
