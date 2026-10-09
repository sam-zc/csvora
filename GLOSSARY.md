# Glossary

Canonical domain terminology for the CSVora project.

## Core Concepts

### Raw CSV

Untrusted plain-text CSV data received from files, clipboard, network streams, or user input. Must never be rendered directly as HTML, evaluated as executable code, or trusted without validation.

### Delimiter

The character used to separate fields in a CSV record (e.g. comma `,`, semicolon `;`, tab `\t`, pipe `|`). Handled portably within `@csvora/csv-core`.

### ColumnType

The semantic data type inferred or explicitly assigned to a column: `string`, `number`, `boolean`, or `date`. Defined in `@csvora/schemas`.

### Inferred Column Type

The semantic data type (`string`, `number`, `boolean`, or `date`) automatically deduced from a column's raw cell contents by `@csvora/csv-core` without mutating underlying CSV data.

### Type Override

An explicit user-specified presentation type assigned to a column in `@csvora/table-engine` that supersedes the inferred column type without altering raw cell data.

### Effective Column Type

The resolved presentation data type for a column, yielding the user's type override when present, or defaulting to the inferred column type.

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

### Conditional Rule

A value-based visual criterion defined on a column that evaluates raw cell values against an operator and target comparison to produce a semantic visual intent, completely decoupled from CSS classes or physical colors.

### Semantic Intent

A bounded, presentation-neutral visual categorization (`success`, `warning`, `danger`, `info`, `muted`) produced by rule evaluation that guides how active renderers visually accent data cells.

### Rule Precedence

The deterministic evaluation priority governing multiple conditional rules on a column, where rules are evaluated in array order and the first matching rule dictates the resulting semantic intent.

### Rule Evaluation

The pure, deterministic computation that compares raw cell data against a conditional rule using the column's effective semantic type, yielding a match or non-match without altering source data or formatted display strings.

### PresentationConfig

The portable, framework-independent presentation model specifying how a `CsvDocument` should be presented by the active renderer (such as visible columns, column order, and alignment) without mutating raw CSV data.

### Renderer

A distinct visual presentation strategy (e.g., table preview, airport departures board) responsible for rendering a `CsvDocument` according to a `PresentationConfig`.

### RendererId

A canonical identifier denoting the active visual renderer (`'table'` or `'departures'`).

### Renderer Definition

Metadata registered in `@csvora/table-engine` describing a supported visual presentation strategy, comprising a canonical `RendererId`, display label, and human-facing description.

### Departures Mapping

The field association model in `DeparturesConfig` mapping semantic flight board roles (`time`, `flight`, `destination`, `gate`, `status`) to stable presentation column IDs without altering source CSV headers or row cells.

### Formula Injection Risk

A raw cell value starting with formula-trigger characters (such as `=`, `+`, `-`, or `@`) that spreadsheet software may execute when opened.

### Sanitized Export

A CSV or XLSX document generated from styled and formatted data where formula injection characters (e.g., leading `=`, `+`, `-`, `@`) have been safely neutralized.

### Column Visibility

The boolean presentation state controlling whether a column is displayed in the active renderer or concealed from view, preserved independently of the underlying CsvDocument.

### Presentation Order

The sequence in which columns are displayed in the active visual renderer, completely decoupled from the original physical column order in the CsvDocument.

### Column Width

A numeric, bounded presentation dimension (in logical pixels) specifying the preferred horizontal space allocated to a column in tabular renderers, defaulting to automatic content-based sizing when unspecified.

### Layout Reset

A presentation operation that restores source column order, reveals all hidden columns, and clears custom widths back to automatic defaults while preserving semantic type and alignment overrides.

### Renderer-Specific Config

Presentation configuration properties that govern layout or behaviors specific to a particular visual renderer (such as departures role mappings or column widths in tabular views) rather than generic semantic column data, retained across renderer switching.

### Editor Workspace

The high-level visual design studio environment comprising the quiet top bar, persistent column inspector sidebar, and the design canvas hosting the active visual renderer.

### Selected Column

The transient, client-side UI selection state (`selectedColumnId`) identifying the column actively being inspected or styled in the workspace, strictly decoupled from serializable presentation models.

### Design Canvas

The warm off-white, textured workspace surface (`--canvas-bg`, `--canvas-dot`) that provides generous spatial padding and visual grounding for active data renderers.

### Export Pipeline

The portable architectural layer responsible for serializing CsvDocuments into portable formats (CSV, Markdown, JSON) across web, desktop, and CLI interfaces without coupling to React or browser DOM APIs.

### Raw Export

An export operation that faithfully serializes original CsvDocument values in their source column and row order, preserving all columns (including hidden ones), empty headers, duplicate headers, and unmapped extra fields.

### Formatted Export

An export operation that respects active presentation semantics: exporting only visible columns in presentation order, applying semantic cell formatting rules, and formatting values for human consumption.

### Formula Safety Policy

An explicit security configuration (`"escape"` or `"preserve"`) governing spreadsheet formula neutralization during export. Under the `"escape"` policy, cells starting with formula-trigger characters (`=`, `+`, `-`, `@`) are safely prefixed with a single quote `'` to prevent spreadsheet formula injection.

---

## Package Boundary Rules

- **`@csvora/csv-core`**: Owns CSV parsing abstractions, line normalization, delimiter detection, and RFC 4180 CSV serialization. Pure, portable TypeScript. Zero dependencies on React, Fastify, DOM, or database engines.
- **`@csvora/table-engine`**: Owns table configuration manipulation and cell formatting logic. Pure, portable TypeScript. Framework-independent.
- **`@csvora/schemas`**: Owns shared runtime contracts using Zod. Single source of truth for validated types (`TableConfig`, `HealthResponse`).
- **`@csvora/export`**: Owns portable format exports (raw CSV, formatted CSV, Markdown, JSON), file naming helpers, and export safety policies. Pure, portable TypeScript. Zero dependencies on React, Next.js, Fastify, DOM, or browser download APIs.
- **`@csvora/ui`**: Owns reusable React presentation components built with shadcn/ui and Tailwind CSS. Strictly presentation; never holds CSV parsing or backend logic.
- **`apps/web`**: Browser frontend application built with Next.js App Router.
- **`apps/api`**: Standalone backend HTTP service built with Fastify on the Bun runtime.
