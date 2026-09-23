# Contributing

Use Node.js 24.21.0 and npm 11–12. The repository pins the runtime in `.node-version` and `.nvmrc`. Run `npm ci` after selecting that runtime. The initial toolchain uses npm 12.0.2.

Dependency installation disables lifecycle scripts. This policy avoids implicit native builds and keeps installation steps reviewable. Run `npm run hooks:install` after `npm ci` to activate the repository hooks explicitly. Never enable every dependency's install script to work around an individual package issue. Select the pinned Node.js runtime before using Git from a terminal or editor; the hooks use the active runtime.

## Development sequence

Architecture and visual design have approval. The project owner directed a return to Phase 4 implementation after initial Phase 5 readiness preparation. Complete the missing application features before full qualification. Return to Phase 3 at the very end, before pilot handoff, to finish hosted foundation setup. Keep the existing local TDD, coverage, mutation, and hook requirements active throughout this work.

Author changes on a `feature/` branch. Never author development commits on `main`, `master`, or `mainline`. The project owner performs final PR integration manually.

For each behavior, add one test, observe the expected failure, implement the smallest passing change, update relevant documentation, run `npm run verify:commit`, and commit before adding another test. If existing code already passes the new test, commit that test separately before continuing. Keep one independently specified test case per commit, including parameterized examples. Record red/green evidence in local development records and retain verification reports outside version control.

Use one-sentence commit subjects beginning with a past-tense verb, such as “Added,” “Implemented,” “Updated,” “Fixed,” or “Refactored.” Use the developer's configured Git identity. Do not add generated attribution trailers.

Stage all intended nonignored files before committing. The pre-commit hook rejects unstaged tracked changes and untracked files, runs the full quality gate, and checks the staged snapshot again. Run only one commit operation at a time and avoid editing files while the gate runs. The commit-message hook requires a single subject line, a configured past-tense verb, and a description; the hook rejects extra lines and common multiple-sentence separators. Reviewers must still check the subject's meaning.

The pre-push hook permits destinations under `refs/heads/feature/` only and rechecks private-file exclusion from the index and reachable history. The hook rejects direct protected-branch pushes even when the current branch is a feature branch. Tags and other remote namespaces require a separately approved policy change. Do not bypass hooks. Local hooks remain bypassable through Git configuration; hosted rulesets must supply the enforcement boundary before collaboration.

## Quality commands

| Command                      | Purpose                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| `npm run format:check`       | Check formatting.                                                                      |
| `npm run lint`               | Check TypeScript/JavaScript, CSS, and Markdown.                                        |
| `npm run typecheck`          | Check strict TypeScript contracts.                                                     |
| `npm test`                   | Run the current automated tests.                                                       |
| `npm run test:coverage`      | Check line, statement, function, and branch coverage.                                  |
| `npm run test:mutation`      | Run the complete configured mutation scope.                                            |
| `npm run build`              | Compile workspace packages and bundle the browser application.                         |
| `npm run test:browser`       | Run Chromium workflows and automated accessibility scans.                              |
| `npm run test:postgres`      | Run native PostgreSQL migration checks in a temporary Docker container after building. |
| `npm run dev:api`            | Start the synthetic loopback case API with an ignored environment file.                |
| `npm run dev`                | Start the loopback-only development preview on port 5175.                              |
| `npm run check:secrets`      | Scan eligible source files for credentials.                                            |
| `npm run check:dependencies` | Reject high or critical dependency advisories.                                         |
| `npm run check:licenses`     | Check dependency license declarations against the tooling inventory.                   |
| `npm run verify:commit`      | Run the complete current commit gate.                                                  |

Coverage must reach 93% for each metric and each first-party source file. The current mutation gate requires 100% across repository safeguards and application TypeScript/TSX. The approved general application threshold remains 95%, with 100% for critical source-acceptance and authorization rules; the current implementation retains the stricter gate. Do not reduce thresholds or exclude production logic to make a commit pass.

The repository-policy package contains local safeguards. The web workspace provides responsive navigation, local file selection, and synthetic draft creation, listing, and member-only detail through the [development server](docs/engineering/development-server.md). The API connects to a dedicated synthetic PostgreSQL instance and runs migrations before listening. Durable upload, extraction, and model clients remain unimplemented. Browser checks run against the production bundle within every commit gate and intercept case-metadata responses. Run `npm exec -- playwright install chromium` after dependency installation to prepare the pinned browser. The browser checks require a free loopback port 5185 and permission to launch Chromium.

The record-domain package provides deterministic source-span validation. Read the [source-span contract](docs/engineering/source-spans.md) before integrating storage, API, or extraction code. Keep external-input validation and user/case authorization at the server boundary; never substitute client-supplied text for a trusted source unit.

The record-storage package adds [private local original storage](docs/engineering/local-original-storage.md). Filesystem tests use synthetic bytes and test-owned temporary directories. The adapter does not authorize users, persist case metadata, or acknowledge crash-durable uploads. Keep the package out of browser imports and do not point tests at existing records or shared storage.

The case-repository package adds [PostgreSQL metadata operations](docs/engineering/case-repository.md) and [versioned migrations](docs/engineering/postgres-migrations.md). Fast tests execute the migration SQL in a test-owned PGlite instance. Native checks create an isolated PostgreSQL 18.6 container and exercise the real driver and migration library. Neither suite loads developer credentials or connects to an existing database. Keep the package server-side and supply authenticated reviewer context. Deployment roles/TLS, general concurrency, and storage/API integration still require qualification. Stryker covers TypeScript mutations, not SQL files or third-party migration internals; retain explicit negative SQL tests.

The complete commit gate now requires a running local Docker engine, socket access, and the Docker CLI on PATH. Pull the digest-pinned image through the [native test setup](docs/engineering/postgres-migrations.md#run-isolated-native-tests). The gate builds packages before running the native suite and fails when Docker or the image is unavailable. The native tests stop only test-owned containers; keep existing databases and persistent volumes outside the harness. Add future schema changes as new migrations rather than editing applied SQL.

The server-config package provides a pure [Gemini development configuration validator](docs/engineering/gemini-development.md). Tests use synthetic credentials; do not read a developer's `.env` or make paid provider requests during ordinary verification. Keep the package out of browser imports. Provider-client integration remains pending.

The license gate tracks the installed development-tool inventory, including transitive packages. The inventory includes attribution licenses, MPL-2.0, Artistic-2.0, and the WTFPL declaration from `@azu/style-format`. A passing scan identifies declarations; the scan does not grant legal approval or discharge distribution obligations. Court IT must approve distribution and notices before deployment. License names containing “Python” describe JavaScript dependencies' license declarations, not Python runtime dependencies.

## Local records and sensitive data

Respect every ignored local-document rule. Never force-add private planning records. Keep case records, credentials, PEM certificates, private keys, generated reports, and local runtime files out of version control. Check staged paths before committing and proposed history before opening a PR.

Run tests with synthetic fixtures. Shared documentation should explain product behavior, configuration, and verification without reproducing private working records.

## Pull requests

Finish all planned commits and verification before opening a PR. Require another team member's review, or record the project owner's explicit review-only override. An override cannot waive quality checks, branch policy, or manual merge approval. The PR template and hosted enforcement configuration form part of the foundation work.

Update relevant documentation at the end of each development session. Write in active voice and identify the actor clearly.
