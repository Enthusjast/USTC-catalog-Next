import { downloadFile } from "./download";
export type CSVValue = string | number | boolean | null | undefined;
export function csvContent(headers: string[], rows: CSVValue[][]) {
  const cell = (value: CSVValue) => {
    let text = value === undefined || value === null ? "" : String(value);
    if (typeof value === "string" && /^[\s\u0000-\u001f]*[=+\-@]/u.test(text))
      text = "'" + text;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return (
    "\uFEFF" +
    [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n") +
    "\r\n"
  );
}
export function downloadCSV(
  filename: string,
  headers: string[],
  rows: CSVValue[][],
) {
  downloadFile(csvContent(headers, rows), filename, "text/csv;charset=utf-8");
}
