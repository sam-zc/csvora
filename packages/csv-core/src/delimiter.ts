import { SUPPORTED_DELIMITERS, type CsvDelimiter } from "./types";

export { SUPPORTED_DELIMITERS, type CsvDelimiter };

/**
 * Detects the most probable delimiter (',', ';', '\t', or '|') from a CSV text sample.
 *
 * Scans the sample text while respecting RFC 4180 quotation rules, ensuring that
 * delimiter characters appearing inside quoted cells are not miscounted.
 * Evaluates frequency and column-count consistency across sample lines.
 *
 * If no delimiters are detected or the sample is empty, defaults to ','.
 */
export function detectDelimiter(sample: string): CsvDelimiter {
  if (!sample || sample.trim().length === 0) {
    return ",";
  }

  const delimiterStats = new Map<CsvDelimiter, number[]>();
  for (const delim of SUPPORTED_DELIMITERS) {
    delimiterStats.set(delim, []);
  }

  let inQuotes = false;
  let currentLineCounts = new Map<CsvDelimiter, number>();
  for (const delim of SUPPORTED_DELIMITERS) {
    currentLineCounts.set(delim, 0);
  }

  let hasContentOnLine = false;
  let linesProcessed = 0;
  const maxLines = 20;

  for (let i = 0; i < sample.length && linesProcessed < maxLines; i++) {
    const char = sample[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < sample.length && sample[i + 1] === '"') {
          // Escaped quote: skip next char
          i++;
        } else {
          // Closing quote
          inQuotes = false;
        }
      }
      // Any delimiter character inside quotes is ignored
      continue;
    }

    // Outside quotes:
    if (char === '"') {
      inQuotes = true;
      hasContentOnLine = true;
      continue;
    }

    if (char === "\r" || char === "\n") {
      // End of line
      if (char === "\r" && i + 1 < sample.length && sample[i + 1] === "\n") {
        i++; // Skip \n in CRLF
      }

      if (hasContentOnLine) {
        for (const delim of SUPPORTED_DELIMITERS) {
          delimiterStats.get(delim)!.push(currentLineCounts.get(delim)!);
          currentLineCounts.set(delim, 0);
        }
        linesProcessed++;
        hasContentOnLine = false;
      }
      continue;
    }

    hasContentOnLine = true;

    // Check if char is one of the candidate delimiters
    for (const delim of SUPPORTED_DELIMITERS) {
      if (char === delim) {
        currentLineCounts.set(delim, currentLineCounts.get(delim)! + 1);
        break;
      }
    }
  }

  // Record trailing line if not ended with newline
  if (hasContentOnLine) {
    for (const delim of SUPPORTED_DELIMITERS) {
      delimiterStats.get(delim)!.push(currentLineCounts.get(delim)!);
    }
  }

  // Score each candidate delimiter
  let bestDelimiter: CsvDelimiter = ",";
  let highestScore = -1;

  for (const delim of SUPPORTED_DELIMITERS) {
    const counts = delimiterStats.get(delim) ?? [];
    if (counts.length === 0) {
      continue;
    }

    const nonZeroCounts = counts.filter((c) => c > 0);
    if (nonZeroCounts.length === 0) {
      continue;
    }

    const totalCount = counts.reduce((acc, c) => acc + c, 0);
    const firstCount = nonZeroCounts[0] ?? 0;
    const isUniform = nonZeroCounts.every((c) => c === firstCount);

    // Consistency across multiple rows receives significant weight
    let score = totalCount;
    if (isUniform && counts.length > 1 && nonZeroCounts.length === counts.length) {
      score += 1000 * firstCount;
    }

    if (score > highestScore) {
      highestScore = score;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
}
