# Repository setup

## Local foundation

The repository uses Node.js 24.21.0, npm workspaces, strict TypeScript, Vitest, StrykerJS, ESLint, Prettier, Stylelint, markdownlint, secret scanning, dependency auditing, and a development-tool license inventory. The current source implements repository safeguards only. The repository contains no application server, browser interface, database, authentication provider, or model endpoint.

Select the pinned runtime, run `npm ci`, then run `npm run hooks:install`. Dependency installation deliberately disables lifecycle scripts. The project-local runtime under `.tools/` supports the initial workstation without changing the system runtime; other developers should select the pinned version through the court-approved runtime installation process.

Run `npm run verify:commit` for the complete quality gate. Stage intended changes before committing. The installed pre-commit hook checks staged-snapshot consistency before and after the gate. Ignored local documents and generated reports do not count as unstaged project changes. Inspect the assertion or Git output when a guard fails; correct the branch, staged paths, message, or push destination before retrying. Never bypass a failed guard.

The commit-message policy maintains these leading verbs: Accepted, Added, Blocked, Configured, Documented, Enforced, Fixed, Implemented, Initialized, Queried, Refactored, Rejected, Updated, and Verified. Use one descriptive sentence on one subject line. The validator rejects common sentence separators and extra message lines; reviewers remain responsible for wording and accurate authorship.

The hooks allow development commits and remote updates on named `feature/` branches only. The local push policy also rejects tag pushes. The repository guards cannot reconstruct a commit's original branch: Git commit objects do not record branch origin. Local hooks can be bypassed, so the project must finish hosted enforcement before shared development.

## Hosted setup still required

The project owner must provide the exact GitHub repository URL. No remote currently exists in the local configuration. The repository's owner, visibility, plan, and available administrative controls determine the hosted setup.

Complete these steps within phase 3:

1. Confirm the destination repository, owner permissions, available ruleset controls, and the designated human reviewer or owner override actor.
2. Agree on the default-branch bootstrap. Reuse already-verified feature-authored history when a default reference is necessary; do not author a bootstrap change on a protected branch. Record owner authorization before changing remote references.
3. Configure CI to enumerate and verify every proposed commit, including intermediate commits in a multi-commit push. Run the complete quality gate against each commit's contents with the matching lockfile and pinned runtime. Reject missing or skipped checks.
4. Keep the mandatory policy checker under a trusted configuration outside the proposed change's control. A proposed workflow edit must not redefine the required policy check or weaken coverage and mutation thresholds. Confirm the actual hosting capability before claiming that this boundary exists.
5. Require PR-only integration and successful checks for `main`, `master`, and `mainline`; prohibit force pushes and branch deletion. Keep the core quality rules separate from the review rule.
6. Require another team member's approval and invalidate stale approvals. Permit only the project owner's explicit review-only override through the available administrative controls. Record the reason on the PR; never waive checks, branch policy, or manual merge approval.
7. Finish all intended commits before opening a PR. Demonstrate the hosted checks and review override in an owner-authorized validation PR. The project owner performs the merge manually.
8. Add a real build badge and commit-addressed verification artifacts after the hosted workflow runs. Publish synthetic test results only; provide no court records or provider credentials to ordinary CI jobs.

The current PR template and CODEOWNERS file express review expectations but do not enforce hosted approvals by themselves. Report unsupported hosting controls before proposing an alternative.

## Next approval boundary

Complete and verify hosted setup before requesting approval for application implementation. Continue to keep private working records outside commits. Future application work will require separate approval and synthetic fixtures throughout development.
