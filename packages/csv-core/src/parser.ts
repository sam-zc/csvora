import { detectDelimiter } from "./delimiter";
import type { CsvDiagnostic, CsvDocument, CsvParseOptions, CsvParseResult, CsvRow } from "./types";

const enum ParserState {
  START_FIELD = 0,
  UNQUOTED = 1,
  QUOTED = 2,
  AFTER_QUOTE = 3,
}

interface RawParsedRow {
  readonly lineNumber: number;
  readonly fields: string[];
}

/**
 * Parses a CSV string into a structured CsvDocument with RFC 4180 compliance.
 *
 * Supports:
 * - Configurable delimiter (comma, semicolon, tab, pipe, or auto-detected)
 * - CRLF and LF line endings
 * - Quoted fields, escaped quotes (""), and multiline fields
 * - Preserves trailing empty fields and empty cells
 * - Structured diagnostics for malformed syntax (unterminated quotes, extra quotes, field mismatches)
 * - Non-destructive data preservation
 */
export function parseCsv(input: string, options?: CsvParseOptions): CsvParseResult {
  const delimiter = options?.delimiter ?? detectDelimiter(input);
  const hasHeader = options?.header ?? true;
  const skipEmptyLines = options?.skipEmptyLines ?? true;
  const trimWhitespace = options?.trimWhitespace ?? false;

  const diagnostics: CsvDiagnostic[] = [];
  const rawRows: RawParsedRow[] = [];

  let currentRowFields: string[] = [];
  let currentRowStartLine = 1;
  let currentLine = 1;
  let currentCol = 1;

  let state: ParserState = ParserState.START_FIELD;
  let fieldStart = 0;
  let quoteStartLine = 1;
  let quoteStartCol = 1;
  let quoteContentStart = 0;
  let quoteContentEnd = 0;
  let hasEscapes = false;
  let afterQuoteGarbageStart = -1;

  const len = input.length;
  let i = 0;

  function emitCurrentField(): void {
    if (state === ParserState.UNQUOTED) {
      let val = input.slice(fieldStart, i);
      if (trimWhitespace) {
        val = val.trim();
      }
      currentRowFields.push(val);
    } else if (state === ParserState.QUOTED) {
      // Unterminated quote reached at EOF
      let val = input.slice(quoteContentStart, i);
      if (hasEscapes) {
        val = val.replaceAll('""', '"');
      }
      val = val.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      currentRowFields.push(val);
    } else if (state === ParserState.AFTER_QUOTE) {
      let val = input.slice(quoteContentStart, quoteContentEnd);
      if (hasEscapes) {
        val = val.replaceAll('""', '"');
      }
      val = val.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      if (afterQuoteGarbageStart !== -1) {
        let extra = input.slice(afterQuoteGarbageStart, i);
        if (trimWhitespace) {
          extra = extra.trimEnd();
        }
        val += extra;
      }
      currentRowFields.push(val);
    } else {
      // START_FIELD -> empty field
      currentRowFields.push("");
    }
  }

  function commitRow(): void {
    if (skipEmptyLines) {
      const firstField = currentRowFields[0];
      const isEmpty =
        currentRowFields.length === 0 ||
        (currentRowFields.length === 1 && (firstField === undefined || firstField.trim().length === 0));
      if (isEmpty) {
        currentRowFields = [];
        return;
      }
    } else {
      if (currentRowFields.length === 0) {
        currentRowFields.push("");
      }
    }

    rawRows.push({
      lineNumber: currentRowStartLine,
      fields: currentRowFields,
    });
    currentRowFields = [];
  }

  while (i < len) {
    if (state === ParserState.START_FIELD && trimWhitespace) {
      while (i < len && (input[i] === " " || input[i] === "\t")) {
        i++;
        currentCol++;
      }
      if (i >= len) {
        break;
      }
    }

    const char = input[i];

    switch (state) {
      case ParserState.START_FIELD: {
        hasEscapes = false;
        afterQuoteGarbageStart = -1;

        if (char === '"') {
          state = ParserState.QUOTED;
          quoteStartLine = currentLine;
          quoteStartCol = currentCol;
          quoteContentStart = i + 1;
          i++;
          currentCol++;
        } else if (char === delimiter) {
          // Empty field
          currentRowFields.push("");
          i++;
          currentCol++;
        } else if (char === "\r" || char === "\n") {
          // Empty line or trailing newline
          if (char === "\r" && i + 1 < len && input[i + 1] === "\n") {
            i++;
          }
          if (currentRowFields.length > 0) {
            // Field before newline was empty
            currentRowFields.push("");
          }
          commitRow();
          currentLine++;
          currentCol = 1;
          i++;
          currentRowStartLine = currentLine;
        } else {
          state = ParserState.UNQUOTED;
          fieldStart = i;
          i++;
          currentCol++;
        }
        break;
      }

      case ParserState.UNQUOTED: {
        if (char === delimiter) {
          emitCurrentField();
          state = ParserState.START_FIELD;
          i++;
          currentCol++;
        } else if (char === "\r" || char === "\n") {
          emitCurrentField();
          if (char === "\r" && i + 1 < len && input[i + 1] === "\n") {
            i++;
          }
          commitRow();
          state = ParserState.START_FIELD;
          currentLine++;
          currentCol = 1;
          i++;
          currentRowStartLine = currentLine;
        } else if (char === '"') {
          diagnostics.push({
            severity: "warning",
            code: "unexpected_quote",
            message: `Unexpected quote inside unquoted field at line ${currentLine}, column ${currentCol}`,
            line: currentLine,
            column: currentCol,
          });
          i++;
          currentCol++;
        } else {
          i++;
          currentCol++;
        }
        break;
      }

      case ParserState.QUOTED: {
        if (char === '"') {
          if (i + 1 < len && input[i + 1] === '"') {
            // Escaped quote: ""
            hasEscapes = true;
            i += 2;
            currentCol += 2;
          } else {
            // Closing quote
            quoteContentEnd = i;
            state = ParserState.AFTER_QUOTE;
            i++;
            currentCol++;
          }
        } else if (char === "\r" || char === "\n") {
          // Newline inside quoted field
          if (char === "\r" && i + 1 < len && input[i + 1] === "\n") {
            i += 2;
          } else {
            i++;
          }
          currentLine++;
          currentCol = 1;
        } else {
          i++;
          currentCol++;
        }
        break;
      }

      case ParserState.AFTER_QUOTE: {
        if (trimWhitespace && (char === " " || char === "\t")) {
          i++;
          currentCol++;
          break;
        }

        if (char === delimiter) {
          emitCurrentField();
          state = ParserState.START_FIELD;
          i++;
          currentCol++;
        } else if (char === "\r" || char === "\n") {
          emitCurrentField();
          if (char === "\r" && i + 1 < len && input[i + 1] === "\n") {
            i++;
          }
          commitRow();
          state = ParserState.START_FIELD;
          currentLine++;
          currentCol = 1;
          i++;
          currentRowStartLine = currentLine;
        } else {
          if (afterQuoteGarbageStart === -1) {
            afterQuoteGarbageStart = i;
            diagnostics.push({
              severity: "warning",
              code: "unexpected_quote",
              message: `Unexpected character after closing quote at line ${currentLine}, column ${currentCol}`,
              line: currentLine,
              column: currentCol,
            });
          }
          i++;
          currentCol++;
        }
        break;
      }
    }
  }

  // Handle EOF based on end state
  if (state === ParserState.QUOTED) {
    diagnostics.push({
      severity: "error",
      code: "unterminated_quote",
      message: `Unterminated quoted field starting at line ${quoteStartLine}, column ${quoteStartCol}`,
      line: quoteStartLine,
      column: quoteStartCol,
    });
    emitCurrentField();
    commitRow();
  } else if (state === ParserState.UNQUOTED || state === ParserState.AFTER_QUOTE) {
    emitCurrentField();
    commitRow();
  } else if (state === ParserState.START_FIELD && currentRowFields.length > 0) {
    // Delimiter appeared right before EOF (e.g., "1,2,")
    currentRowFields.push("");
    commitRow();
  }

  // Construct document and evaluate headers / field counts
  if (rawRows.length === 0) {
    return {
      success: !diagnostics.some((d) => d.severity === "error"),
      document: {
        headers: [],
        rows: [],
        delimiter,
        rowCount: 0,
        columnCount: 0,
      },
      diagnostics,
    };
  }

  let headers: readonly string[] = [];
  const dataRows: CsvRow[] = [];
  let expectedColumnCount = 0;
  let startDataIndex = 0;

  const firstRawRow = rawRows[0];
  if (!firstRawRow) {
    return {
      success: !diagnostics.some((d) => d.severity === "error"),
      document: {
        headers: [],
        rows: [],
        delimiter,
        rowCount: 0,
        columnCount: 0,
      },
      diagnostics,
    };
  }

  if (hasHeader) {
    headers = firstRawRow.fields;
    expectedColumnCount = headers.length;
    startDataIndex = 1;

    // Check for duplicate or empty headers
    const seenHeaders = new Set<string>();
    for (let c = 0; c < headers.length; c++) {
      const headerName = headers[c] ?? "";
      if (seenHeaders.has(headerName)) {
        diagnostics.push({
          severity: "warning",
          code: "duplicate_header",
          message: `Duplicate header "${headerName}" at column ${c + 1}`,
          line: firstRawRow.lineNumber,
          column: c + 1,
        });
      } else {
        seenHeaders.add(headerName);
      }

      if (headerName.trim().length === 0) {
        diagnostics.push({
          severity: "warning",
          code: "empty_header",
          message: `Empty header at column ${c + 1}`,
          line: firstRawRow.lineNumber,
          column: c + 1,
        });
      }
    }
  } else {
    expectedColumnCount = firstRawRow.fields.length;
  }

  for (let rIndex = startDataIndex; rIndex < rawRows.length; rIndex++) {
    const rawRow = rawRows[rIndex];
    if (!rawRow) {
      continue;
    }
    const dataIndex = hasHeader ? rIndex - 1 : rIndex;
    const actualCount = rawRow.fields.length;

    if (actualCount < expectedColumnCount) {
      diagnostics.push({
        severity: "warning",
        code: "too_few_fields",
        message: `Row ${dataIndex + 1} has ${actualCount} fields; expected ${expectedColumnCount}`,
        line: rawRow.lineNumber,
      });
    } else if (actualCount > expectedColumnCount) {
      diagnostics.push({
        severity: "warning",
        code: "too_many_fields",
        message: `Row ${dataIndex + 1} has ${actualCount} fields; expected ${expectedColumnCount}`,
        line: rawRow.lineNumber,
      });
    }

    dataRows.push({
      index: dataIndex,
      lineNumber: rawRow.lineNumber,
      fields: rawRow.fields,
    });
  }

  const success = !diagnostics.some((d) => d.severity === "error");

  return {
    success,
    document: {
      headers,
      rows: dataRows,
      delimiter,
      rowCount: dataRows.length,
      columnCount: expectedColumnCount,
    },
    diagnostics,
  };
}

/**
 * Converts a CsvRow into a key-value record mapped by header names.
 * If header names are missing or empty, generates fallback column_N keys.
 */
export function rowToRecord(row: CsvRow, headers: readonly string[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const key = headers[i] || `column_${i + 1}`;
    record[key] = row.fields[i] ?? "";
  }
  return record;
}

/**
 * Converts all rows in a CsvDocument into key-value records mapped by headers.
 */
export function rowsToRecords(document: CsvDocument): readonly Record<string, string>[] {
  return document.rows.map((row) => rowToRecord(row, document.headers));
}
