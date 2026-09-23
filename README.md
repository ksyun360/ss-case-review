# Social Security Disability Review

This project will help Western District of Texas magistrate judges and law clerks review Social Security disability appeal records and inspect cited evidence.

Current phase: Application implementation. The project owner authorized phase 4 and deferred hosted CI and repository protections until the end. Local quality gates remain mandatory.

Build status: [Local verification results](docs/engineering/build-status.md). Hosted CI and branch protections remain deferred; no hosted passing status applies.

Review the approved [brand and interaction specification](docs/design/brand-and-interaction.md) for the Record Review identity, palette, component dimensions, and desktop/mobile behavior. Start with the [brand board](docs/design/brand-board.svg) or the [case review workspace](docs/design/review-workspace-desktop.svg).

The initial application preview provides responsive home, upload-selection, and saved-case screens. The upload screen lists document names and sizes, accepts additional selections, and removes selected files. The preview does not read document contents, upload records, save cases, or call a model.

Use synthetic documents only. Court sign-in, storage, extraction, and case-review artifacts remain unimplemented. The preview does not support real court records or shared deployment.

With Node.js 24.21.0 and installed dependencies, run `npm run dev` and open <http://127.0.0.1:5175/>. Read the [local preview guide](docs/engineering/local-preview.md) for setup, available routes, and limitations. Read [Contributing](CONTRIBUTING.md) for quality commands and the development workflow.

The static design references contain fictional case information and illustrate later review features.

The development sequence requires approval between architecture, brand/interaction design, engineering foundation, application implementation, and qualification/IT handoff. Development will use feature branches, individual TDD commits, at least 93% coverage, automatic mutation testing, and manual PR merge approval.
