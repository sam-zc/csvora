# Spec: CSV Upload + File Ingestion

**Status:** ready-for-agent
**Package:** `apps/web`

## Problem Statement

CSVora users need an intuitive, accessible, and responsive way to import CSV files in the browser. The platform has a domain model and RFC 4180 parsing engine in `@csvora/csv-core`, but currently lacks an ingestion interface. Users need to be able to drag and drop or browse for CSV files, receive validation feedback (file type, empty file, size limits), parse the files client-side with zero data leaving the browser, view clear metadata and parsing diagnostics, and reset/remove the file as needed.

## Solution

Build a client-side CSV ingestion feature in `apps/web` centered around a canonical `LoadedCsvDocument` session state:

1. Native HTML5 drag-and-drop + file input dropzone with keyboard accessibility and visual drag states.
2. Lightweight client-side validation (non-empty, file extension/MIME tolerance, 25 MB browser ingestion limit).
3. Client-side asynchronous file reading via `file.text()` with UTF-8 decoding.
4. Parsing through `@csvora/csv-core` (`parseCsv`), producing `CsvDocument` and structured diagnostics.
5. Ingestion state model (`idle`, `reading`, `parsing`, `success`, `error`) preventing impossible UI states.
6. Summary view displaying file name, file size, row/column counts, detected delimiter, and expandable parse diagnostics.
7. Reset / remove functionality returning the user to the dropzone.
8. Privacy assurance badge ("Your file stays in your browser.").
9. Strict renderer independence: zero coupling to table rows, DOM tables, or TanStack Table.

## User Stories

1. As a user, I want to drag and drop a CSV file onto the dropzone so that I can quickly ingest my data.
2. As a keyboard-only user, I want to activate the file picker via Enter/Space and focus outlines so that the tool is fully accessible.
3. As a user, I want to see clear feedback when dragging a file over the dropzone so that I know where to drop it.
4. As a user, I want immediate validation if I drop an empty file or unsupported file type so that I understand why ingestion stopped.
5. As a user with a file larger than 25 MB, I want a helpful error explaining the browser size limit and noting future streaming support.
6. As a privacy-conscious user, I want to know that my file is processed locally in my browser without remote network transmission.
7. As a user with standard CSV, semicolon CSV, TSV, or pipe-delimited data, I want automatic delimiter detection and display of the detected delimiter.
8. As a user with malformed CSV containing warnings (e.g., duplicate headers, irregular field counts), I want an expandable diagnostics panel showing warning details without preventing ingestion.
9. As a user with broken CSV containing fatal syntax errors (e.g., unterminated quotes), I want clear error feedback indicating the location of the error.
10. As a user who selected the wrong file, I want to click "Remove" or "Choose another file" to reset the workspace to the initial uploader.
11. As a future developer adding visual renderers (tables, cards, boards), I want the loaded document to remain in canonical `CsvDocument` shape so that renderers can derive their own representations independently.

## Implementation Decisions

- **Feature Directory:** `apps/web/src/features/csv-ingestion/`
  - `types.ts`: `LoadedCsvDocument`, `FileMetadata`, `IngestionState`, `FileValidationError`.
  - `lib/validate-file.ts`: Pure file validation logic (`MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024`, extension/MIME checks).
  - `lib/ingest-file.ts`: Pure async reading + `@csvora/csv-core` parsing producing `LoadedCsvDocument`.
  - `hooks/use-csv-ingestion.ts`: React hook managing ingestion lifecycle state machine.
  - `components/csv-dropzone.tsx`: Drag-and-drop + keyboard accessible file selection dropzone.
  - `components/csv-file-summary.tsx`: Ingested file metadata, delimiter, and status display.
  - `components/csv-diagnostics.tsx`: Compact and expandable parse diagnostics summary.
  - `components/csv-ingestion-workspace.tsx`: Unified feature container coordinating dropzone and summary view.
- **Renderer Independence:** `LoadedCsvDocument` holds only `file` metadata, `@csvora/csv-core` `CsvDocument`, and `diagnostics`. No HTML table rows, column definitions, or TanStack Table concepts are introduced.
- **Dependencies:** 0 new npm dependencies. Native browser File API (`File.prototype.text()`) and HTML5 drag/drop events.

## Testing Decisions

- Unit tests for file validation and file ingestion logic using Bun Test (`apps/web/test/csv-ingestion.test.ts`).
- End-to-end tests using Playwright (`apps/web/e2e/csv-upload.spec.ts`) testing file upload, metadata verification, and reset flow using a test fixture.

## Out of Scope

- Data table preview / virtual table renderer (Task 4).
- Server-side multipart upload or Fastify streaming.
- Exporting CSV / XLSX.
- Zustand global store.
