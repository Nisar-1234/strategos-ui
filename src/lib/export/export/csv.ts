import type { ExportPayload } from "./types";

function cell(val: string | number | null): string {
  const s = val == null ? "" : String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportCsv(payload: ExportPayload): Blob {
  const parts: string[] = [];

  parts.push(`# ${payload.title}`);
  if (payload.subtitle) parts.push(`# ${payload.subtitle}`);
  parts.push(`# Generated: ${payload.generated}`);
  parts.push("");

  if (payload.stats && payload.stats.length > 0) {
    parts.push("# SUMMARY STATISTICS");
    parts.push("Metric,Value");
    for (const s of payload.stats) parts.push(`${cell(s.label)},${cell(s.value)}`);
    parts.push("");
  }

  for (const table of payload.tables) {
    parts.push(`# ${table.title}`);
    parts.push(table.headers.map(cell).join(","));
    for (const row of table.rows) parts.push(row.map(cell).join(","));
    parts.push("");
  }

  if (payload.notes) parts.push(`# Note: ${payload.notes}`);

  return new Blob([parts.join("\n")], { type: "text/csv;charset=utf-8" });
}
