# Spec: CSV Domain Model and Parsing Layer

**Status:** ready-for-agent
**Package:** `@csvora/csv-core`

## Problem Statement

CSVora needs a robust, portable, framework-independent CSV parsing and domain model foundation. Currently, `@csvora/csv-core` only contains placeholder line-splitting and a naive delimiter detector. To support web uploads, future table preview, backend streaming, and CLI/Electron clients, CSVora requires an RFC 4180-compatible parser, structured parse diagnostics, conservative type inference, and formula-injection detection.

## Solution

Implement an RFC 4180-compliant, single-pass CSV state machine parser with:

1. Portable domain types (`CsvDocument`, `CsvRow`, `CsvDiagnostic`, `CsvParseResult`, `CsvParseOptions`).
2. Robust support for delimiters, CRLF/LF line endings, quoted fields, escaped quotes (`""`), and multiline fields.
3. Quote-aware delimiter detection for `,`, `;`, `\t`, `|`.
4. Structured parse diagnostics (unterminated quotes, unexpected quotes, inconsistent field counts, duplicate/empty headers).
5. Conservative, non-destructive column type inference (`string`, `number`, `boolean`, `date`).
6. Spreadsheet formula-injection detection (`isPotentialFormula`).

## User Stories

1. As a user importing standard CSV files, I want comma-delimited data with CRLF or LF line endings parsed cleanly so that my tables load accurately.
2. As a user with descriptive cell text containing commas, I want quoted commas preserved as field content so that columns do not shift.
3. As a user with quoted text containing quotes, I want escaped double-quotes (`""`) unescaped to `"` so that original quotes remain intact.
4. As a user with multiline cell text, I want newlines inside quotes preserved within a single row so that multiline notes do not create broken extra rows.
5. As a European user, I want semicolon-delimited CSVs automatically detected or configurable so that localized exports open seamlessly.
6. As a user pasting TSV or pipe-delimited data, I want tab and pipe delimiters supported so that alternate tabular formats work out of the box.
7. As a user opening malformed CSV files with unterminated quotes, I want clear structured error diagnostics indicating row and column numbers without crashing the application.
8. As a user with rows having more or fewer fields than the header, I want all raw values preserved and diagnostic warnings issued rather than silent truncation.
9. As a user with duplicate or empty column headers, I want all data columns retained and diagnostic warnings reported so that data is never lost.
10. As a table preview component, I want conservative type inference for columns (`string`, `number`, `boolean`, `date`) so that cell formatters can apply reasonable defaults without corrupting identifiers with leading zeros.
11. As a security-conscious user, I want formula-risk detection (`=`, `+`, `-`, `@`) so that spreadsheet injection vulnerabilities can be flagged before export.
12. As an international user, I want full Unicode support (CJK, Indic, emojis) across all fields and headers without encoding corruption.
13. As a developer building future streaming ingestion, I want a decoupled state machine architecture that can process chunked input without rewriting domain logic.

## Implementation Decisions

- **Domain Types:**
  - `CsvColumnType`: `"string" | "number" | "boolean" | "date"` matching `@csvora/schemas`.
  - `CsvRow`: `{ readonly index: number; readonly lineNumber: number; readonly fields: readonly string[] }`.
  - `CsvDocument`: `{ readonly headers: readonly string[]; readonly rows: readonly CsvRow[]; readonly delimiter: string; readonly rowCount: number; readonly columnCount: number }`.
  - `CsvDiagnostic`: `{ readonly severity: "error" | "warning"; readonly code: CsvDiagnosticCode; readonly message: string; readonly line?: number; readonly column?: number }`.
  - `CsvParseResult`: `{ readonly success: boolean; readonly document: CsvDocument; readonly diagnostics: readonly CsvDiagnostic[] }`.
- **Parsing Architecture:**
  - Single-pass state machine scanner tracking state (`start_of_field`, `unquoted_field`, `quoted_field`, `after_quote`).
  - Slices input strings directly to avoid quadratic concatenation allocations.
  - Normalizes line breaks inside quotes to standard LF (`\n`).
  - Preserves trailing empty fields (`1,2,` -> `["1", "2", ""]`).
- **Delimiter Detection:**
  - Scans sample lines outside quoted fields to count candidate delimiters (`,`, `;`, `\t`, `|`).
  - Selects the delimiter with consistent row field counts and highest non-zero frequency.
- **Type Inference:**
  - Conservative rules: leading zero numbers (e.g. `00123`) remain `string`.
  - Ambiguous dates remain `string`. Only strict ISO-8601 (`YYYY-MM-DD` / `YYYY-MM-DDTHH:mm:ss`) infer as `date`.
  - Strict booleans (`true`/`false`, case-insensitive).
  - Mixed or all-empty columns default to `string`.
- **Formula Injection:**
  - `isPotentialFormula(value: string): boolean` flags values beginning with `=`, `+`, `-`, `@` (including after whitespace).
- **Zero Dependencies:**
  - Native TypeScript implementation; no external CSV libraries or DOM/Node dependencies.

## Testing Decisions

- Test purely against public exports of `@csvora/csv-core`.
- Test all 26 required behaviors + moderate-size multi-thousand-row performance check.
- Use Bun Test (`bun:test`).

## Out of Scope

- UI components, upload forms, table rendering, drag-and-drop.
- Node.js / Web Streams API wiring (state machine is designed to be streaming-friendly, but streams are not wired here).
- CSV export / formula escaping (export sanitization belongs to a future export package).
- Excel XLS/XLSX parsing or locale-specific date parsing.
