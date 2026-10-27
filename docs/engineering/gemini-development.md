# Gemini development configuration

Status: The server-config package validates server-side Gemini Developer API and local OpenAI-compatible endpoint settings, and the server package contains bounded text-generation clients with normalized provider failures. A source-grounded generation service now accepts only a strict JSON claim envelope and validates every returned citation against authorized extracted source units. The PDF processing coordinator and worker invoke that validator before publishing extracted sources when guarded startup receives a configured provider profile, then preserve generated text, persist the validated result with the processing revision, and expose the member-scoped result. The browser preview does not load the root `.env`, invoke this validator, or call a model directly; the browser validates and displays persisted claim result states. Live provider connectivity, credential validation against Google, local gateway qualification, and claim-specific source navigation remain pending.

## Local settings

Keep `GEMINI_API_KEY` in the repository-root `.env`. Git ignores `.env` and `.env.local`; the tracked `.env.example` contains empty credential and model fields. Never replace an existing `.env` by copying the example over the existing file. Add missing nonsecret settings manually when preparing server integration.

| Setting                | Required value                                                    |
| ---------------------- | ----------------------------------------------------------------- |
| `APP_ENV`              | `development`                                                     |
| `DATA_CLASSIFICATION`  | `synthetic`                                                       |
| `MODEL_PROVIDER`       | `gemini` or `local`                                               |
| `GEMINI_TRANSPORT`     | `developer-api`                                                   |
| `GEMINI_MODEL_ID`      | An explicit, nonblank model ID selected for synthetic evaluation. |
| `GEMINI_API_KEY`       | A nonblank development credential; never commit the value.        |
| `LOCAL_MODEL_ENDPOINT` | An HTTP or HTTPS OpenAI-compatible chat-completions endpoint.     |
| `LOCAL_MODEL_ID`       | A nonblank local model identifier.                                |

Do not use a `VITE_` prefix for credentials, import server configuration into the web workspace, or pass secrets to browser code. Keep real keys out of chat, screenshots, fixtures, logs, and shared documentation. Tests supply synthetic values directly and need no real key.

The Gemini helper reads only `GEMINI_API_KEY`; the helper never substitutes `GOOGLE_API_KEY`. The local helper reads `LOCAL_MODEL_ENDPOINT` and `LOCAL_MODEL_ID` without requiring a credential. Server startup creates a claim generator only after the selected development configuration helper returns `configured`, and each generator passes its endpoint or credential explicitly. The helpers reject unsupported provider or transport values. Vertex authentication remains unsupported.

## Validator contract

`readGeminiDevelopmentConfig(environment)` accepts a server-owned map of environment-variable names to strings or undefined values. The helper neither reads files nor mutates process state. The future server bootstrap must load approved settings and call the helper before constructing a provider client. The configuration helper makes no network request.

The helpers return either `configured` with a config object or `configuration_error` with a fixed diagnostic code. Configuration errors contain no supplied values. Gemini checks run in this order: provider, runtime environment, data classification, transport, model, and credential. Local checks run in this order: runtime environment, data classification, endpoint, and model. Guarded startup omits the claim-generator callback when any check fails, so extraction can continue without a model call.

| Diagnostic code          | Operator action                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `unsupported_provider`   | Select Gemini or local for this development path; never silently switch providers.                       |
| `development_only`       | Use this helper only for development; court-test and production require separate approved configuration. |
| `synthetic_data_only`    | Use synthetic fixtures only; do not relabel court records as synthetic.                                  |
| `unsupported_transport`  | Select the Developer API for this path; Vertex requires another credential contract.                     |
| `missing_model`          | Supply a nonblank model ID.                                                                              |
| `unpinned_model`         | Replace an ID ending in `-latest` with an explicit model ID.                                             |
| `missing_api_key`        | Supply a nonblank `GEMINI_API_KEY` in server-only secret configuration.                                  |
| `missing_local_endpoint` | Supply a nonblank local HTTP or HTTPS endpoint.                                                          |
| `invalid_local_endpoint` | Use an HTTP or HTTPS OpenAI-compatible endpoint.                                                         |
| `missing_local_model`    | Supply a nonblank local model ID.                                                                        |

The helper trims surrounding model-ID whitespace. The helper checks credential whitespace only to reject blank credentials and otherwise preserves the supplied credential. The config object exposes the credential through `getApiKey()` for the future server adapter. Standard JSON serialization and default Node diagnostic inspection omit the closed-over credential. This safeguard does not prevent a caller from deliberately logging `getApiKey()` or the original environment map. Never log either value.

`configured` means that settings passed these local checks. The status does not establish credential validity, model availability, quota, paid-service terms, model-version immutability, or court approval. The `-latest` suffix check does not identify every possible service alias. Operators must confirm the selected model and retain evaluation evidence. The synthetic-data setting records operator intent; the setting does not inspect or classify documents.

## Remaining integration

Guarded startup now connects the tested Gemini client to the approved document-processing workflow and supplies a fixed source-grounded review task. The processing coordinator accepts an injected claim generator and passes the case ID plus extracted source units to it before source publication; the worker persists the resulting claims with the published processing revision and exposes only member-scoped data. Unverified claims retain an investigation-safe message and never become verified evidence. The browser validates and displays persisted validated, refused, invalid, empty, and unverified states, and verified claims link to the matching persisted source page and highlight the validated text span when bounds remain safe. Keep real court records blocked until court IT approves identity, storage, endpoint, and data handling. Qualification must measure accuracy, completeness, latency, and cost on an approved workload.

Phase 4 remains active. Return to Phase 3 at the very end, before pilot handoff, to finish hosted CI and repository protections. The configuration helper does not change those gates.
