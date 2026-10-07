# Glossary

Canonical domain terminology for the CSVora project.

## Core Concepts

### Raw CSV

Untrusted plain-text CSV data received from files, clipboard, network streams, or user input. Must never be rendered directly as HTML, evaluated as executable code, or trusted without validation.

### Delimiter

The character used to separate fields in a CSV record (e.g. comma `,`, semicolon `;`, tab `\t`, pipe `|`). Handled portably within `@csvora/csv-core`.

### ColumnType

The semantic data type inferred or explicitly assigned to a column: `string`, `number`, `boolean`, or `date`. Defined in `@csvora/schemas`.

### ColumnDefinition

Metadata defining a single table column, consisting of an identifier (`id`), display name (`name`), and semantic `type`.

### TableConfig

The framework-independent configuration representing the schema and presentation parameters of a table. Resides in `@csvora/schemas` and is manipulated in `@csvora/table-engine`.

### CellValue

The typed or untyped value residing at the intersection of a row and a column.

### CsvRow

An ordered collection of string cell values representing a single record in a CsvDocument.

### CsvDocument

The parsed, framework-independent tabular representation of a CSV file containing headers, ordered CsvRows, delimiter metadata, and dimensions.

### CsvDiagnostic

A structured diagnostic record (warning or error) produced during CSV parsing to report syntax anomalies, field count mismatches, or header irregularities without aborting data preservation.

### LoadedCsvDocument

The client session wrapper encapsulating a successfully ingested CSV file's metadata (filename, byte size, last modified), the parsed `CsvDocument`, and any parse diagnostics prior to rendering.

### Presentation Rule

A display formatting rule (such as decimal precision, currency symbols, date format strings, alignment, or conditional styling) applied to cell values without mutating the underlying data.

### Formula Injection Risk

A raw cell value starting with formula-trigger characters (such as `=`, `+`, `-`, or `@`) that spreadsheet software may execute when opened.

### Sanitized Export

A CSV or XLSX document generated from styled and formatted data where formula injection characters (e.g., leading `=`, `+`, `-`, `@`) have been safely neutralized.

---

## Package Boundary Rules

- **`@csvora/csv-core`**: Owns CSV parsing abstractions, line normalization, and delimiter detection. Pure, portable TypeScript. Zero dependencies on React, Fastify, DOM, or database engines.
- **`@csvora/table-engine`**: Owns table configuration manipulation and cell formatting logic. Pure, portable TypeScript. Framework-independent.
- **`@csvora/schemas`**: Owns shared runtime contracts using Zod. Single source of truth for validated types (`TableConfig`, `HealthResponse`).
- **`@csvora/ui`**: Owns reusable React presentation components built with shadcn/ui and Tailwind CSS. Strictly presentation; never holds CSV parsing or backend logic.
- **`apps/web`**: Browser frontend application built with Next.js App Router.
- **`apps/api`**: Standalone backend HTTP service built with Fastify on the Bun runtime.
