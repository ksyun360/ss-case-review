# Build status

The local application-preview gate passed on September 22, 2026: formatting, code/style/document lint, type checking, tests, coverage, mutation testing, production bundling, Chromium workflows, automated accessibility scans, secret scanning, dependency auditing, and license inventory checks.

The current suite passes 46 unit/integration tests and 5 Chromium workflow tests. Coverage reaches 100% for lines, statements, functions, and branches across the current first-party TypeScript/TSX source. Mutation testing kills all 131 generated mutants. The dependency audit reports zero known vulnerabilities.

The browser checks cover the desktop workspace, keyboard skip link, a 320-pixel home-to-upload workflow, a populated mobile document list with a long filename, and automated accessibility scans for the home, upload, and saved-case screens. Manual image inspection also checked the 1440-pixel home and 390-pixel upload layouts. These checks do not establish complete accessibility compliance or qualify unimplemented case processing.

The active local hooks check staged-snapshot consistency, require feature branches, reject excluded document paths in the index and reachable history, validate commit messages, and restrict remote push destinations. The commit hook runs the complete quality gate. Each behavior test entered a separate verified feature-branch commit.

Hosted build status: Pending repository configuration. The GitHub repository destination remains unspecified. No hosted build badge or branch-protection claim applies yet.

The project owner authorized application implementation and deferred the remaining hosted setup until the end. Review the [remaining repository setup](repository-setup.md) before enabling shared development. No PR, remote push, or court-data processing has occurred. The preview remains local-only; authentication, persistent storage, extraction, model integration, and source-linked case artifacts remain pending. Phase 4 continues after this initial interface slice.

Run `npm run verify:commit` to regenerate local results. Coverage reports appear in `coverage/`; mutation reports appear in `reports/mutation/`; browser reports appear in `playwright-report/`. Generated reports remain outside version control. A later GitHub workflow will expose results for the corresponding commit SHA. The [local preview guide](local-preview.md) explains setup and current limitations.
