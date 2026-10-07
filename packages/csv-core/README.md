# @csvora/csv-core

Portable, framework-independent CSV domain model, parser, delimiter detector, type inference, and formula risk detector for CSVora.

Zero external dependencies. Runs seamlessly across Browser, Bun, Node.js, Electron, and VS Code.

## Features

- **RFC 4180 Compliant Parser**: Single-pass state machine handling CRLF/LF, quoted fields, commas inside quotes, multiline fields, and escaped double quotes (`""`).
- **Quote-Aware Delimiter Detection**: Automatically detects `,`, `;`, `\t`, or `|` while ignoring delimiters inside quoted cells.
- **Structured Diagnostics**: Non-destructive parsing that preserves malformed rows while reporting structured errors and warnings (`unterminated_quote`, `unexpected_quote`, `too_few_fields`, `too_many_fields`, `duplicate_header`, `empty_header`).
- **Conservative Type Inference**: Infers `string`, `number`, `boolean`, and `date` without aggressive coercion (leading-zero strings remain strings; ambiguous dates remain strings).
- **Formula Injection Guard**: `isPotentialFormula` flags spreadsheet formula injection risks (`=`, `+`, `-`, `@`).

## Usage

```ts
import { parseCsv, detectDelimiter, inferColumnTypes, isPotentialFormula } from "@csvora/csv-core";

// Parse CSV text
const result = parseCsv('name,description\nCSVora,"CSV, but beautiful"');
console.log(result.document.headers); // ["name", "description"]
console.log(result.document.rows[0].fields); // ["CSVora", "CSV, but beautiful"]

// Type inference
const columnTypes = inferColumnTypes(result.document); // ["string", "string"]

// Security check
if (isPotentialFormula("=SUM(A1:B1)")) {
  console.warn("Formula injection risk detected");
}
```
