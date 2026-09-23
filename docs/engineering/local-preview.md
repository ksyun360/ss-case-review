# Local application preview

The initial application slice provides navigation and document selection. The preview supports synthetic fixtures only. Do not expose the development server to a network or select real court records.

## Start the preview

Select Node.js 24.21.0 and npm 11–12 before running these commands from the repository root:

```sh
npm ci
npm run hooks:install
npm exec -- playwright install chromium
npm run dev
```

Open <http://127.0.0.1:5175/>. The development server binds only to the loopback address and rejects an occupied port. Stop the server with Control-C. No environment secrets, database, model endpoint, or court credentials are required for this preview.

For a production-bundle check, run `npm run build` followed by `npm run preview`, then open <http://127.0.0.1:5185/>. The preview server also binds only to loopback. These commands do not deploy the application.

## Available behavior

| Route           | Current behavior                                                                     |
| --------------- | ------------------------------------------------------------------------------------ |
| `/`             | Redirects to `/home`.                                                                |
| `/home`         | Presents the starting actions and an explicit empty recent-case state.               |
| `/upload`       | Lists selected filenames and byte sizes; supports additional selections and removal. |
| `/cases`        | Explains that case storage is not connected.                                         |
| Unknown address | Offers a recovery link to the workspace.                                             |

Select synthetic PDF, DOC, DOCX, XLSX, TIF, or TIFF files through the labeled file chooser. The browser supplies filename and size metadata; the application does not read file contents. Additional selections append to the list. A remove action targets one selected entry even when filenames match. Selecting a removed file again restores that entry. The preview preserves duplicate selections instead of assuming matching filenames identify matching documents.

The browser's format filter provides a chooser hint, not content validation. The preview does not inspect signatures, enforce upload limits, scan files, or determine document roles. The upload button remains disabled and explains the missing processing connection. No network request transfers selected documents. Leaving the upload page or refreshing clears the in-memory selection; the preview does not persist metadata in browser storage.

## Interaction and verification

The interface uses the approved system typography, navy/teal palette, 44-pixel minimum buttons, source-oriented labels, and stacked mobile layout. The header exposes the current route. A keyboard skip link targets the main content. In-app navigation focuses the destination page without moving initial page-load focus.

Run `npm run verify:commit` for the complete local gate. The gate builds the application before launching the Chromium workflow tests. Stop any manually started preview server on port 5185 before running the gate. The development server on port 5175 can remain open. Browser reports appear in `playwright-report/`; failure traces appear in `test-results/`. Git ignores generated reports.

Automated accessibility scans and browser geometry assertions supplement component tests. Automated checks do not establish full accessibility compliance. Screen-reader testing, broader browser/operating-system qualification, high zoom, and the complete court workflow remain pending.

## Remaining application work

Later increments must implement case and document storage, source coordinates and versioning, durable upload, document inspection, OCR/extraction, provider configuration, source-linked review artifacts, correction history, and approved reference lookups. Court authentication, authorization, deployment qualification, performance evaluation, and corpus-based accuracy evaluation must precede real-record use.

The project owner directed completion of Phase 4 after initial Phase 5 qualification preparation. The [source-span validation module](source-spans.md) adds internal checks but does not change the current browser workflow. The preview does not complete Phase 4 or authorize court deployment. Return to Phase 3 at the very end, before pilot handoff, to finish hosted CI and repository protections. Local TDD commits and quality gates remain active. Track outstanding evidence in the [qualification readiness checklist](qualification-readiness.md).
