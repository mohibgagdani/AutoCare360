const escapeCell = (value) => {
  if (value === null || value === undefined) return '';
  let str = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

/**
 * @param {{ header: string, value: (row:any) => any }[]} columns
 * @param {any[]} rows
 */
export function toCsv(columns, rows) {
  const head = columns.map((c) => escapeCell(c.header)).join(',');
  const body = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(','));
  // BOM so Excel detects UTF-8 (₹ symbol, accents).
  return `﻿${[head, ...body].join('\r\n')}`;
}
