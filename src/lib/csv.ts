/** Characters that make a spreadsheet treat a cell as a formula. */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

/**
 * Encodes one cell. Text that could be read as a formula gets a leading apostrophe so a
 * value typed into the public form cannot run anything when the export is opened in Excel.
 */
function encodeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);

  const safe = FORMULA_TRIGGER.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Builds a CSV document. The leading byte-order mark makes Excel read it as UTF-8. */
export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  return `﻿${rows.map((row) => row.map(encodeCell).join(",")).join("\r\n")}\r\n`;
}
