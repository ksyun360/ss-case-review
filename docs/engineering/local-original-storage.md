# Private local original storage

Status: The record-storage package provides internal filesystem operations for synthetic development. The browser can send selected synthetic files to the opt-in API route, which invokes this adapter through the ingestion service. A separate [PostgreSQL metadata repository](case-repository.md) stores original references and filters queries by case membership. An [internal ingestion service](original-ingestion.md) connects the two for tested synthetic paths, but crash-safe file/database coordination, authenticated user access, source extraction, upload finalization, and court deployment remain pending.

## Server contract

Import `writeOriginal`, `writeOriginalStream`, and `readOriginal` from `@record-review/record-storage/originals` in server code only. The caller supplies a trusted private storage root, prevalidated case/document-version identifiers, and trusted metadata. Never take the storage root or an authoritative stored reference from a browser request or model response.

`writeOriginal(root, identity, bytes)` copies the supplied byte buffer and identity before asynchronous work begins. The helper returns the case ID, document-version ID, content SHA-256, and byte length after publication and staging cleanup. The helper does not store that reference in a database. The future metadata transaction must preserve the reference and coordinate publication, retry, and recovery.

`writeOriginalStream(root, identity, chunks, maximumBytes)` writes an asynchronous sequence of byte chunks to the same private staging layout. The caller must supply a positive safe-integer byte limit. The helper rejects a stream that exceeds the limit, removes the partial staged file, and leaves the final version unpublished. The helper hashes and counts accepted chunks while writing, flushes and closes the staged file, and rejects replacement of an existing version. The caller still needs an HTTP request limit, backpressure-aware transport, format inspection, database coordination, and recovery before offering uploads.

The separate metadata repository can register and retrieve these reference fields. The internal ingestion service connects the packages for synthetic use and generates a canonical lowercase UUID before publication. Other callers must also preserve exact identifiers across both stores; PostgreSQL normalizes UUID spellings while this adapter hashes raw identifier strings. Obtain authoritative references through trusted, membership-scoped server context before reading bytes.

`readOriginal(root, caseId, reference)` compares the server-supplied case ID with the stored reference before reading a file. A mismatch returns `undefined` without file access. A matching case permits a read, followed by byte-length and SHA-256 checks. An integrity mismatch throws a fixed error without returning the file bytes. The caller must obtain case identity from authorized server context; identifier equality does not authenticate a user or establish case membership.

Filesystem errors propagate to the internal caller. A missing file produces an `ENOENT` failure rather than fabricated bytes or an empty success. Future API handlers must translate exceptions into safe diagnostics, avoid disclosing local paths, and preserve processing gaps. A failed lookup cannot establish that evidence does not exist elsewhere in the case record.

## Layout and publication

The adapter hashes UTF-8 case and document-version identifiers separately. The adapter never uses either raw identifier as a path segment.

```text
<private-root>/
  <sha256(caseId)>/
    <sha256(documentVersionId)>       published original
    .pending-<random>/                temporary write attempt
      <sha256(documentVersionId)>     staged bytes
```

Different cases retain separate copies even when document-version identifiers match. The adapter requests mode `0700` for new directories and `0600` for new files. The adapter does not change existing directory permissions.

Each write creates a private staging directory inside the case directory. The buffer adapter writes the complete snapshot and requests a file-data flush before publication. Node's `writeFile` option `flush: true` invokes file synchronization after a successful write. The stream adapter writes accepted chunks through a file handle and explicitly synchronizes that handle before publication. [Node filesystem documentation](https://nodejs.org/docs/latest-v24.x/api/fs.html#fspromiseswritefilefile-data-options).

A hard link publishes the staged file under the final document-version name. The filesystem rejects an existing destination instead of overwriting the original. Concurrent writes therefore produce one successful publication and one conflict. Repeating a write to an existing version also produces `EEXIST`, including a repeat with identical bytes; the current adapter does not implement idempotent success.

The helper removes only the staging directory created for that attempt. A simulated partial-write failure leaves no published original. Cleanup also runs after a publication conflict. An error can occur after publication, such as a staging-cleanup failure; future retry logic must reconcile filesystem and metadata state before reporting success or allocating another version.

## Required boundaries and remaining work

- Use synthetic fixtures only. The adapter does not inspect data classification or enforce a development identity mode.
- Keep the storage root outside the repository and public web directories. Require a server-owned filesystem hierarchy that untrusted users cannot modify. The current helper does not defend against an attacker who can replace directories with symlinks or alter the filesystem directly.
- Run on a qualified local filesystem with hard-link support. POSIX permission checks currently run on the development host; deployment platforms still require qualification.
- Enforce request limits before calling either helper. The buffer writer copies complete input and reads load complete files. The stream writer enforces its own byte budget, but an HTTP admission boundary, chunk-size policy, and large-document performance qualification remain pending.
- Preserve trusted references separately from stored bytes. The no-overwrite API does not prevent a privileged operator from changing files. Hash checking relies on trusted metadata and does not prove OCR fidelity or evidentiary significance.
- Add directory synchronization, crash recovery, orphan cleanup, retention controls, and coordinated database/object-store recovery. File-data flushing alone does not establish power-loss durability or justify a durable-upload acknowledgment.
- Add membership checks, API schemas, audit records, encryption configuration, format inspection, malware handling, and transactional upload finalization before connecting browser uploads or accepting court records.

The [source-span validator](source-spans.md) remains a separate contract for extracted text. Later workers must derive source units from the preserved original and retain document hash, extraction version, and page/native-unit locators. The exact-text source workspace reads separately persisted text; no current worker derives those sources from this adapter, and no artifact uses the viewer.

## Verification

Run `npm test -- packages/record-storage/tests/originals.test.ts` for the focused suite. Tests create and remove unique, test-owned temporary directories and use synthetic bytes. Tests exercise real filesystem operations; controlled fault injection covers interrupted writes and streams. The suite also checks stream limits and replacement conflicts, permissions, concurrent publication, buffer/identity snapshots, retrieval, cross-case rejection, altered content, length metadata, separate case namespaces, path-like identifiers, and missing files.

Run `npm run verify:commit` for the full gate, including coverage, mutation testing, browser regressions, and repository checks. Phase 4 remains active. Return to Phase 3 at the very end, before pilot handoff, to complete hosted CI and repository protections.
