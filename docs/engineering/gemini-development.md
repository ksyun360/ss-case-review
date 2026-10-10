# Gemini development configuration

Status: The server-config package validates server-side Gemini Developer API settings, and the server package now contains a bounded text-generation client with normalized provider failures. The browser preview does not load the root `.env`, invoke this validator, or call Gemini. Worker bootstrap, live connectivity checks, and credential validation against Google remain pending.

## Local settings

Keep `GEMINI_API_KEY` in the repository-root `.env`. Git ignores `.env` and `.env.local`; the tracked `.env.example` contains empty credential and model fields. Never replace an existing `.env` by copying the example over the existing file. Add missing nonsecret settings manually when preparing server integration.

| Setting               | Required value                                                    |
| --------------------- | ----------------------------------------------------------------- |
| `APP_ENV`             | `development`                                                     |
| `DATA_CLASSIFICATION` | `synthetic`                                                       |
| `MODEL_PROVIDER`      | `gemini`                                                          |
| `GEMINI_TRANSPORT`    | `developer-api`                                                   |
| `GEMINI_MODEL_ID`     | An explicit, nonblank model ID selected for synthetic evaluation. |
| `GEMINI_API_KEY`      | A nonblank development credential; never commit the value.        |

Do not use a `VITE_` prefix for credentials, import server configuration into the web workspace, or pass secrets to browser code. Keep real keys out of chat, screenshots, fixtures, logs, and shared documentation. Tests supply synthetic values directly and need no real key.

The helper reads only `GEMINI_API_KEY`; the helper never substitutes `GOOGLE_API_KEY`. The future Gemini adapter must pass the selected credential explicitly rather than rely on SDK environment discovery. The helper rejects other provider or transport values. The current helper does not implement Vertex authentication or the separate local-provider path.

## Validator contract

`readGeminiDevelopmentConfig(environment)` accepts a server-owned map of environment-variable names to strings or undefined values. The helper neither reads files nor mutates process state. The future server bootstrap must load approved settings and call the helper before constructing a provider client. The configuration helper makes no network request.

The helper returns either `configured` with a config object or `configuration_error` with a fixed diagnostic code. Configuration errors contain no supplied values. Checks run in this order: provider, runtime environment, data classification, transport, model, and credential.

| Diagnostic code         | Operator action                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `unsupported_provider`  | Select Gemini for this development path; never silently switch providers.                                |
| `development_only`      | Use this helper only for development; court-test and production require separate approved configuration. |
| `synthetic_data_only`   | Use synthetic fixtures only; do not relabel court records as synthetic.                                  |
| `unsupported_transport` | Select the Developer API for this path; Vertex requires another credential contract.                     |
| `missing_model`         | Supply a nonblank model ID.                                                                              |
| `unpinned_model`        | Replace an ID ending in `-latest` with an explicit model ID.                                             |
| `missing_api_key`       | Supply a nonblank `GEMINI_API_KEY` in server-only secret configuration.                                  |

The helper trims surrounding model-ID whitespace. The helper checks credential whitespace only to reject blank credentials and otherwise preserves the supplied credential. The config object exposes the credential through `getApiKey()` for the future server adapter. Standard JSON serialization and default Node diagnostic inspection omit the closed-over credential. This safeguard does not prevent a caller from deliberately logging `getApiKey()` or the original environment map. Never log either value.

`configured` means that settings passed these local checks. The status does not establish credential validity, model availability, quota, paid-service terms, model-version immutability, or court approval. The `-latest` suffix check does not identify every possible service alias. Operators must confirm the selected model and retain evaluation evidence. The synthetic-data setting records operator intent; the setting does not inspect or classify documents.

## Remaining integration

Connect the tested Gemini client to server startup and document processing, add normalized safety refusals and empty-response handling, and validate generated artifacts against source records before display. Keep real court records blocked until court IT approves identity, storage, endpoint, and data handling. Qualification must measure accuracy, completeness, latency, and cost on an approved workload.

Phase 4 remains active. Return to Phase 3 at the very end, before pilot handoff, to finish hosted CI and repository protections. The configuration helper does not change those gates.
