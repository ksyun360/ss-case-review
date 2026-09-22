# Build status

The local foundation gate passed on September 22, 2026: formatting, code/style/document lint, type checking, tests, coverage, mutation testing, compilation, secret scanning, dependency auditing, and license inventory checks.

The initial repository-policy case passes with 100% measured coverage and 100% mutation coverage (2 mutants killed). The dependency audit reports zero known vulnerabilities. These results cover the initial utility, not an application. Hook enforcement remains under construction.

Hosted build status: Pending repository configuration. The GitHub repository destination remains unspecified. No hosted build badge or branch-protection claim applies yet.

Run `npm run verify:commit` to regenerate local results. Coverage reports appear in `coverage/`; mutation reports appear in `reports/mutation/`. Generated reports remain outside version control. A later GitHub workflow will expose results for the corresponding commit SHA.
