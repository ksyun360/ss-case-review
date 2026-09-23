# Social Security Disability Review

This project will help Western District of Texas magistrate judges and law clerks review Social Security disability appeal records and inspect cited evidence.

Current phase: Phase 4 application implementation remains in progress. The [collaborator update and completion checklist](docs/engineering/collaborator-update.md) summarize working components and remaining features. The [source-span validation contract](docs/engineering/source-spans.md) checks source identity, exact quotations, and text bounds. A [private local original-storage adapter](docs/engineering/local-original-storage.md) preserves file bytes and verifies case-scoped reads. The [PostgreSQL metadata repository](docs/engineering/case-repository.md) adds atomic case creation, membership-filtered queries, and original-file references. [Versioned migrations and native PostgreSQL checks](docs/engineering/postgres-migrations.md) verify schema creation, rollback, and migration locking. The new [synthetic case API](docs/engineering/case-api.md) adds validated case creation and reviewer-scoped listing. Server startup, browser/API integration, extracted-source persistence, and court identity remain pending. The [qualification readiness checklist](docs/engineering/qualification-readiness.md) retains the required evidence and handoff gates.

Final setup reminder: Return to Phase 3 at the very end, before pilot handoff, to finish hosted CI and repository protections. Keep the existing local quality gates active throughout qualification.

Build status: [Local verification results](docs/engineering/build-status.md). Hosted CI and branch protections remain deferred; no hosted passing status applies.

Review the approved [brand and interaction specification](docs/design/brand-and-interaction.md) for the Record Review identity, palette, component dimensions, and desktop/mobile behavior. Start with the [brand board](docs/design/brand-board.svg) or the [case review workspace](docs/design/review-workspace-desktop.svg).

The initial application preview provides responsive home, upload-selection, and saved-case screens. The upload screen lists document names and sizes, accepts additional selections, and removes selected files. The preview does not read document contents, upload records, save cases, or call a model.

The [Gemini development configuration helper](docs/engineering/gemini-development.md) now validates explicit server-side settings for synthetic testing. Keep credentials in the ignored root `.env`; `.env.example` contains placeholders only. The helper does not load environment files or connect the preview to Gemini. Model-client and worker integration remain pending.

Use synthetic documents only. Court sign-in, browser-connected case storage, extraction, and case-review artifacts remain unimplemented. The preview does not support real court records or shared deployment.

With Node.js 24.21.0 and installed dependencies, run `npm run dev` and open <http://127.0.0.1:5175/>. Read the [local preview guide](docs/engineering/local-preview.md) for setup, available routes, and limitations. Read [Contributing](CONTRIBUTING.md) for quality commands and the development workflow.

The static design references contain fictional case information and illustrate later review features.

The development sequence requires approval between architecture, brand/interaction design, engineering foundation, application implementation, and qualification/IT handoff. Development will use feature branches, individual TDD commits, at least 93% coverage, automatic mutation testing, and manual PR merge approval.
