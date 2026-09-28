# Phase 5 qualification readiness

Status: Readiness checklist retained while Phase 4 implementation resumes. The application is not ready for court testing, real records, or pilot handoff.

The project owner authorized Phase 5 on September 22, 2026. The authorization advances qualification preparation; the authorization does not complete the missing application features or establish release readiness.

The project owner subsequently directed completion of Phase 4. Keep the preview qualification regressions active while implementing the missing capabilities; run full qualification against the resulting release candidate.

## Final setup reminder

**Return to Phase 3 at the very end, before pilot handoff.** Finish the [hosted repository setup](repository-setup.md) after the application and qualification work produce a release candidate. Verify CI, protected-branch restrictions, required human review with the permitted owner override, and published build status. Do not disable existing local hooks or quality gates while hosted setup remains deferred.

## Evidence available now

The repository contains a local browser preview with home, upload-selection, saved-case, synthetic case-detail, and unknown-address recovery screens. The preview displays selected filenames and sizes, supports additive selection and removal before registration, and permits synthetic original registration only when a developer enables the local route. The case-detail screen lists verified original version IDs and byte counts through a member-scoped API query. The preview provides no original download control, source viewer, extraction worker, model client, or court identity integration.

Phase 4 now includes an internal [source-span validator](source-spans.md). Unit tests check source identity, exact raw-text correspondence, and selection bounds. The module has no storage/API/UI connection and does not establish end-to-end case isolation or record accuracy.

Internal [document-inspection modules](document-inspection.md) now check PDF/TIFF signatures, parse a generated PDF through PDF.js, and extract native text from a three-page synthetic PDF. The checks cover page-count retrieval, fixed loading-failure text, task and page cleanup, ordered text, UTF-16 offsets, and parser geometry for the exercised fixtures. The modules have no upload connection, worker isolation, persisted inspection state, source mapper, or OCR. These checks do not qualify untrusted or court records.

Phase 4 also includes a [private local original-storage adapter](local-original-storage.md), an [internal synthetic original-ingestion service](original-ingestion.md), and a [Gemini development configuration validator](gemini-development.md). An opt-in API route connects synthetic browser registration to the storage and ingestion modules. One native PostgreSQL test now verifies a small synthetic file across Chromium, the local proxy, API, database reference, and private storage. That bounded test does not qualify large records, crash recovery, court authentication, or a deployable upload service; the configuration tests make no provider requests.

The opt-in original-download route checks member-visible metadata before reading private bytes and sends an attachment with no-sniff and no-store headers. An API regression creates another reviewer's real reference and private file, then verifies a 404 response without a storage read. The route does not provide a source viewer or authorize real case records.

The [PostgreSQL metadata repository](case-repository.md) checks case creation, membership-scoped queries, and original-reference constraints using an isolated PostgreSQL test engine. The [native migration suite](postgres-migrations.md) additionally exercises PostgreSQL 18.6 connectivity, schema creation, repeat runs, rollback, two-connection migration locking, incompatible history, and compiled-module SQL discovery. Deployment permissions/TLS, general application concurrency, recovery, and authenticated API access remain unqualified. The browser connects to synthetic case metadata but not to original storage.

The [synthetic case API](case-api.md) validates development identity settings, creates cases with server-owned IDs and membership, and lists or opens cases for the configured reviewer. Fastify checks cover strict inputs, safe failures, request restrictions, body limits, and response caching. A native PostgreSQL workflow additionally checks API persistence and membership revocation. The [development startup](development-server.md) runs migrations and binds a loopback listener. A temporary real-process smoke check confirmed creation and listing across an API restart. The browser connects to this API through a development proxy and can submit synthetic document bytes when the developer enables the opt-in route. The API does not authenticate a court user. The [collaborator update](collaborator-update.md) separates these implemented modules from the remaining Phase 4 workflow.

The [build-status report](build-status.md) records measured local results. Chromium tests exercise desktop and narrow-screen layouts, keyboard navigation, and automated accessibility scans. Component tests and mutation checks cover current source behavior. These checks qualify only the implemented preview behaviors; passing source coverage does not establish record accuracy, case isolation, or processing speed.

Phase 5 adds two preview privacy regressions: selecting/removing a synthetic file produces no observed network request after page loading, and reloading clears the selection. The exercised selection leaves localStorage, sessionStorage, IndexedDB, and Cache Storage empty. These bounded checks do not constitute a security assessment of a future backend or provider integration.

Use synthetic fixtures for all current checks. Keep browser traces and reports outside version control. No court or provider credentials are necessary for preview checks. Do not contact court systems or transmit records as part of this preparation.

## Outstanding qualification evidence

| Area                             | Current dependency                                                                                                                                | Required evidence and responsible participant                                                                                                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| End-to-end review                | The browser creates and opens synthetic case metadata; ingestion, source navigation, and review artifacts remain unimplemented.                   | The development team completes the workflow; court reviewers verify the intended review tasks against source documents.                                                                                                            |
| Record accuracy and completeness | No extraction pipeline or authorized labeled corpus exists in this workspace.                                                                     | Court reviewers approve and adjudicate evaluation labels; the development team reports held-out field, quote, citation, and event results against approved targets, including omissions and abstentions.                           |
| Latency and capacity             | No processing worker, queue, or provider connection exists.                                                                                       | The development team measures the completed pipeline on approved hardware and workload sizes, including retries, queue time, failures, concurrency, and resource use. Do not report UI test duration as record-processing latency. |
| Identity and case permissions    | The synthetic API checks membership for lists and case details; court identity remains absent.                                                    | Court IT confirms the identity contract; the development team verifies access denial and cross-case isolation before any real-record pilot.                                                                                        |
| CA and PACER                     | Court IT has not supplied the certificate role or intended PACER integration contract.                                                            | Court IT specifies trust direction, identity mapping when applicable, permitted PACER actions, credentials handling, and the test environment. Keep secrets and certificates outside Git.                                          |
| Provider qualification           | No Gemini connection or operational local adapter exists.                                                                                         | Court IT approves the selected data path; the development team tests configured provider contracts, refusals, partial responses, malformed output, and outages. No operational local-model claim applies.                          |
| Accessibility and compatibility  | Current automated evidence covers Chromium and the implemented preview.                                                                           | The test team records manual keyboard, screen-reader, zoom, target-browser, and target-operating-system results; court reviewers exercise the completed source-review workflow.                                                    |
| Deployment and recovery          | A local file adapter, two migrations, a synthetic attempt journal, and API startup exist; crash reconciliation and backup/restore remain pending. | Court IT and the development team agree on the target platform, then execute installation, upgrade, rollback, and coordinated restore rehearsals with integrity checks. A local startup check cannot establish recoverability.     |
| Hosted enforcement               | Phase 3 hosted setup remains explicitly deferred.                                                                                                 | The project owner and repository administrator complete the final Phase 3 gate and retain commit-addressed CI and review evidence before handoff.                                                                                  |

No row above has a passing full-application qualification result. Record an unavailable result as pending, not as a pass or a zero-error score.

## Evidence collection rules

For each qualification run, record the commit SHA, runtime versions, environment, synthetic or authorized corpus identifier, configuration, evaluator, expected result, measured result, and retained artifact location. Exclude claimant information and credentials from shared reports. Keep development fixtures separate from held-out evaluation records.

Apply approved acceptance targets without silently lowering thresholds. Report numerator and denominator, input format, scan quality, unresolved items, and failure causes where applicable. Require reviewer adjudication for disputed reference labels. Qualify the specific release configuration; changes to extraction, provider configuration, source navigation, or deployment require affected checks to run again.

Do not invent deployment or restore commands before the corresponding services exist. The eventual runbook must identify the release artifact, prerequisites, configuration and secret delivery, startup/readiness checks, logs and alerts, rollback steps, backup/restore procedure, integrity verification, and accountable operators. Court IT must approve the operational procedure after a successful rehearsal.

## Handoff checklist

- [ ] Complete the outstanding application features and identify the candidate commit.
- [ ] Obtain court IT environment, identity, CA, PACER, provider, and data-use decisions.
- [ ] Execute the applicable accuracy, completeness, capacity, security, accessibility, and recovery checks against the candidate.
- [ ] Resolve failed gates and obtain reviewer sign-off; retain evidence and remaining limitations.
- [ ] **Return to Phase 3 as the final setup step** and verify hosted checks, branch protections, review requirements, and build-status publication.
- [ ] Confirm that the final repository state and deployment artifacts match the qualified candidate; rerun affected checks after changes.
- [ ] Obtain court IT readiness confirmation and the project owner's explicit pilot-handoff approval.

No remote setup, PR, merge, deployment, or court handoff occurs solely because this checklist exists.
