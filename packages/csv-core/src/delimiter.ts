import { splitCsvLines } from "./normalization";

export type CsvDelimiter = "," | ";" | "\t" | "|";

export const SUPPORTED_DELIMITERS: readonly CsvDelimiter[] = [",", ";", "\t", "|"] as const;

/**
 * Detects the most probable delimiter from a CSV sample text by comparing frequency
 * in the first non-empty line.
 */
export function detectDelimiter(sample: string): CsvDelimiter {
  const lines = splitCsvLines(sample);
  const firstLine = lines.find((line) => line.trim().length > 0) ?? "";

  if (!firstLine) {
    return ",";
  }

  let bestDelimiter: CsvDelimiter = ",";
  let maxCount = 0;

  for (const delimiter of SUPPORTED_DELIMITERS) {
    let count = 0;
    for (let i = 0; i < firstLine.length; i++) {
      if (firstLine[i] === delimiter) {
        count++;
      }
    }
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}
