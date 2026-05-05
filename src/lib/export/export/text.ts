import type { ExportPayload } from "./types";

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function mdTable(headers: string[], rows: (string | number | null)[][]): string {
  const cells = rows.map((r) => r.map((c) => (c == null ? "" : String(c))));
  const widths = headers.map((h, i) =>
    Math.max(h.length, 3, ...cells.map((r) => (r[i] ?? "").length))
  );
  const head = "| " + headers.map((h, i) => pad(h, widths[i])).join(" | ") + " |";
  const divider = "| " + widths.map((w) => "-".repeat(w)).join(" | ") + " |";
  const body = cells.map((r) => "| " + r.map((c, i) => pad(c, widths[i])).join(" | ") + " |");
  return [head, divider, ...body].join("\n");
}

export function exportMarkdown(payload: ExportPayload): Blob {
  const lines: string[] = [];
  lines.push(`# ${payload.title}`);
  lines.push("");
  if (payload.subtitle) { lines.push(`**${payload.subtitle}**`); lines.push(""); }
  lines.push(`*Generated: ${payload.generated}*`);
  lines.push("");
  lines.push("---");
  lines.push("");

  if (payload.stats && payload.stats.length > 0) {
    lines.push("## Summary");
    lines.push("");
    lines.push(mdTable(["Metric", "Value"], payload.stats.map((s) => [s.label, s.value])));
    lines.push("");
  }

  for (const table of payload.tables) {
    lines.push(`## ${table.title}`);
    lines.push("");
    if (table.rows.length === 0) {
      lines.push("*No data available.*");
    } else {
      lines.push(mdTable(table.headers, table.rows));
    }
    lines.push("");
  }

  if (payload.notes) { lines.push("---"); lines.push(""); lines.push(`*${payload.notes}*`); }

  return new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
}

export function exportTxt(payload: ExportPayload): Blob {
  const THICK = "=".repeat(72);
  const THIN = "-".repeat(72);
  const lines: string[] = [];

  lines.push(THICK);
  lines.push(payload.title.toUpperCase());
  if (payload.subtitle) lines.push(payload.subtitle);
  lines.push(`Generated: ${payload.generated}`);
  lines.push(THICK);
  lines.push("");

  if (payload.stats && payload.stats.length > 0) {
    lines.push("SUMMARY STATISTICS");
    lines.push(THIN);
    for (const s of payload.stats) {
      lines.push(`  ${pad(String(s.label) + ":", 32)} ${s.value}`);
    }
    lines.push("");
  }

  for (const table of payload.tables) {
    lines.push(table.title.toUpperCase());
    lines.push(THIN);
    if (table.rows.length === 0) {
      lines.push("  No data available.");
      lines.push("");
      continue;
    }
    const widths = table.headers.map((h, i) =>
      Math.max(h.length, ...table.rows.map((r) => (r[i] == null ? 0 : String(r[i]).length)))
    );
    lines.push("  " + table.headers.map((h, i) => pad(h, widths[i])).join("  "));
    lines.push("  " + widths.map((w) => "-".repeat(w)).join("  "));
    for (const row of table.rows) {
      lines.push("  " + row.map((c, i) => pad(c == null ? "" : String(c), widths[i])).join("  "));
    }
    lines.push("");
  }

  if (payload.notes) { lines.push(THICK); lines.push(payload.notes); }

  return new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
}
