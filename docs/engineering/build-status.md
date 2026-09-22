# Build status

The local foundation gate passed on September 22, 2026: formatting, code/style/document lint, type checking, tests, coverage, mutation testing, compilation, secret scanning, dependency auditing, and license inventory checks.

The local foundation passes 30 tests, with 100% line, statement, function, and branch coverage across the current first-party TypeScript source. Mutation testing kills all 97 generated mutants. The dependency audit reports zero known vulnerabilities. These results cover repository safeguards and tooling, not an application.

The active local hooks check staged-snapshot consistency, require feature branches, reject excluded document paths in the index and reachable history, validate commit messages, and restrict remote push destinations. The commit hook runs the complete quality gate. Each behavior test entered a separate verified feature-branch commit.

Hosted build status: Pending repository configuration. The GitHub repository destination remains unspecified. No hosted build badge or branch-protection claim applies yet.

Phase 3 remains incomplete until the project owner supplies the repository destination and the project verifies hosted CI, protected-branch rules, and the review-only override. Review the [remaining repository setup](repository-setup.md) before enabling shared development. No PR, remote push, application implementation, or court-data processing has occurred.

Run `npm run verify:commit` to regenerate local results. Coverage reports appear in `coverage/`; mutation reports appear in `reports/mutation/`. Generated reports remain outside version control. A later GitHub workflow will expose results for the corresponding commit SHA.
