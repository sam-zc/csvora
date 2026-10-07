const FORMULA_TRIGGERS: readonly string[] = ["=", "+", "-", "@"];

/**
 * Checks whether a raw cell value poses a potential spreadsheet formula injection risk
 * (CSV injection / formula injection) if opened in Microsoft Excel, Google Sheets, or LibreOffice.
 *
 * Formula triggers include leading '=', '+', '-', or '@'.
 * Leading whitespace is trimmed prior to inspection because spreadsheet applications
 * routinely strip leading spaces and execute the subsequent formula expression.
 *
 * Does NOT mutate the value.
 */
export function isPotentialFormula(value: string): boolean {
  if (!value) {
    return false;
  }
  const trimmed = value.trimStart();
  if (trimmed.length === 0) {
    return false;
  }
  const first = trimmed[0];
  if (!first) {
    return false;
  }
  return FORMULA_TRIGGERS.includes(first);
}
