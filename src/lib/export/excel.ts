import type { ExportPayload } from "./types";

function colWidth(header: string, rows: (string | number | null)[][], colIdx: number): number {
  const maxData = Math.max(...rows.map((r) => (r[colIdx] == null ? 0 : String(r[colIdx]).length)));
  return Math.min(50, Math.max(header.length, maxData) + 2);
}

export async function exportXlsx(payload: ExportPayload): Promise<Blob> {
  const XLSX = await import("xlsx");

  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryRows: (string | number | null)[][] = [
    [payload.title],
    [payload.subtitle ?? ""],
    [`Generated: ${payload.generated}`],
    [],
  ];
  if (payload.stats && payload.stats.length > 0) {
    summaryRows.push(["Metric", "Value"]);
    for (const s of payload.stats) summaryRows.push([s.label, s.value]);
  }
  if (payload.notes) { summaryRows.push([]); summaryRows.push([payload.notes]); }

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  summaryWs["!cols"] = [{ wch: 34 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  // One sheet per data table
  for (const table of payload.tables) {
    const data = [
      table.headers,
      ...table.rows.map((r) => r.map((c) => c ?? "")),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = table.headers.map((h, i) => ({ wch: colWidth(h, table.rows, i) }));
    // Freeze top row
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };
    const sheetName = table.title.replace(/[/\\?*[\]]/g, "").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx", compression: true });
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
