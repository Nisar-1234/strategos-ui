export type ExportFormat = "xlsx" | "pdf" | "pptx" | "csv" | "md" | "txt";
export type { ExportPayload, ExportTable } from "./types";

import type { ExportPayload } from "./types";

function slug(title: string): string {
  return title.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function filename(title: string, ext: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `STRATEGOS_${slug(title)}_${date}${ext}`;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportData(payload: ExportPayload, format: ExportFormat): Promise<void> {
  switch (format) {
    case "xlsx": {
      const { exportXlsx } = await import("./excel");
      download(await exportXlsx(payload), filename(payload.title, ".xlsx"));
      break;
    }
    case "pdf": {
      const { exportPdf } = await import("./pdf");
      download(await exportPdf(payload), filename(payload.title, ".pdf"));
      break;
    }
    case "pptx": {
      const { exportPptx } = await import("./pptx");
      download(await exportPptx(payload), filename(payload.title, ".pptx"));
      break;
    }
    case "csv": {
      const { exportCsv } = await import("./csv");
      download(exportCsv(payload), filename(payload.title, ".csv"));
      break;
    }
    case "md": {
      const { exportMarkdown } = await import("./text");
      download(exportMarkdown(payload), filename(payload.title, ".md"));
      break;
    }
    case "txt": {
      const { exportTxt } = await import("./text");
      download(exportTxt(payload), filename(payload.title, ".txt"));
      break;
    }
  }
}
