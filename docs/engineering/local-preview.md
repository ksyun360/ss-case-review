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

Open <http://127.0.0.1:5175/>. The development server binds only to the loopback address and rejects an occupied port. Stop the server with Control-C. No environment secrets, database, model endpoint, or court credentials are required for document-selection preview. Synthetic draft creation and case navigation need the separate API and development PostgreSQL instance described below.

For a production-bundle check, run `npm run build` followed by `npm run preview`, then open <http://127.0.0.1:5185/>. The preview server also binds only to loopback. These commands do not deploy the application.

The [Gemini development configuration helper](gemini-development.md) remains separate from the preview. Adding a key to the root `.env` does not enable model calls or synthetic uploads. Keep credentials server-side and use synthetic fixtures only.

The [synthetic development API](development-server.md) has a separate `npm run dev:api` command. That command requires a dedicated development PostgreSQL instance and the ignored server-side `.env`. Start that API before creating or opening saved synthetic drafts. The Vite development server proxies same-origin `/api/v1` requests to `127.0.0.1:5176`; browser code does not receive the database password. The production-bundle preview on port 5185 has no API proxy and will show the unavailable/retry state unless a later deployment supplies an approved same-origin route.

## Available behavior

| Route            | Current behavior                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `/`              | Redirects to `/home`.                                                                                                  |
| `/home`          | Presents starting actions and a static synthetic-document prompt.                                                      |
| `/upload`        | Lists selected files and registers synthetic originals when the opt-in local route is available.                       |
| `/cases`         | Lists and creates synthetic draft metadata when the local API runs; shows loading, empty, and retry states.            |
| `/cases/:caseId` | Shows member-scoped case metadata and an explicit no-documents state; handles inaccessible cases and service failures. |
| Unknown address  | Offers a recovery link to the workspace.                                                                               |

Select synthetic PDF, DOC, DOCX, XLSX, TIF, or TIFF files through the labeled file chooser. The browser displays filename and size metadata before registration. Additional selections append to the list. A remove action targets one selected entry even when filenames match. Selecting a removed file again restores that entry. The preview preserves duplicate selections instead of assuming matching filenames identify matching documents. Registration sends the selected file bytes to the opt-in local API route.

The browser's format filter provides a chooser hint, not content validation. The preview does not inspect signatures, enforce upload limits before transfer, scan files, or determine document roles. The registration button requires an available synthetic route, at least one selected file, and a nonblank case label. Registration creates one draft and transfers files sequentially; the API enforces its per-original byte limit. The screen locks the selected files and case label after submission. A failed draft-creation response prompts a saved-case check because the request may have succeeded on the server. A failed file transfer marks the affected file unconfirmed, stops later transfers, and preserves the draft link. The browser still lacks a retry token and interrupted-upload reconciliation. Leaving the upload page or refreshing clears the in-memory selection; the preview does not persist selected-file metadata in browser storage.

## Interaction and verification

The interface uses the approved system typography, navy/teal palette, 44-pixel minimum buttons, source-oriented labels, and stacked mobile layout. The header exposes the current route. A keyboard skip link targets the main content. In-app navigation focuses the destination page without moving initial page-load focus.

Run `npm run verify:commit` for the complete local gate. The gate builds the application before launching the Chromium workflow tests and native PostgreSQL checks. Prepare Docker and the pinned test image through the [migration testing guide](postgres-migrations.md); the browser preview itself still needs no database. Stop any manually started preview server on port 5185 before running the gate. The development server on port 5175 can remain open. Browser reports appear in `playwright-report/`; failure traces appear in `test-results/`. Git ignores generated reports.

Automated accessibility scans and browser geometry assertions supplement component tests. Automated checks do not establish full accessibility compliance. Screen-reader testing, broader browser/operating-system qualification, high zoom, and the complete court workflow remain pending.

## Remaining application work

The browser calls the synthetic case API through the development proxy. The [local original-storage adapter](local-original-storage.md) and document-reference repository sit behind the opt-in API route for synthetic registration. Versioned migrations, native tests, and guarded API startup exist. `npm run dev` still starts only the browser preview. Later increments must complete failure recovery, document metadata, source coordinates and versioning, durable upload finalization, document inspection, OCR/extraction, provider integration, source-linked review artifacts, correction history, and approved reference lookups. Court authentication, authorization, deployment qualification, performance evaluation, and corpus-based accuracy evaluation must precede real-record use. The [collaborator update](collaborator-update.md) provides a shareable status and completion checklist.

The project owner directed completion of Phase 4 after initial Phase 5 qualification preparation. The [source-span validation module](source-spans.md) adds internal checks but does not change the current browser workflow. The preview does not complete Phase 4 or authorize court deployment. Return to Phase 3 at the very end, before pilot handoff, to finish hosted CI and repository protections. Local TDD commits and quality gates remain active. Track outstanding evidence in the [qualification readiness checklist](qualification-readiness.md).
