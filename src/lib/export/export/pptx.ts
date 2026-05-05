import type { ExportPayload } from "./types";
import type pptxgen from "pptxgenjs";

export async function exportPptx(payload: ExportPayload): Promise<Blob> {
  const PptxGen = (await import("pptxgenjs")).default;
  const prs = new PptxGen();
  prs.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 inches

  // ── Slide 1: Title ──────────────────────────────────────────────────────────
  const s1 = prs.addSlide();
  s1.background = { color: "0F172A" };

  // Vertical accent bar
  s1.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 0.06, h: 7.5, fill: { color: "1B4FD8" } });

  s1.addText("STRATEGOS INTELLIGENCE PLATFORM", {
    x: 0.4, y: 0.5, w: 12, h: 0.35,
    fontSize: 9, bold: true, color: "4B6BF7",
    charSpacing: 3, fontFace: "Courier New",
  });
  s1.addText(payload.title, {
    x: 0.4, y: 1.3, w: 12, h: 1.5,
    fontSize: 36, bold: true, color: "FFFFFF", fontFace: "Arial",
    breakLine: false,
  });
  if (payload.subtitle) {
    s1.addText(payload.subtitle, {
      x: 0.4, y: 3.0, w: 12, h: 0.5,
      fontSize: 14, color: "94A3B8",
    });
  }
  s1.addText(`Generated: ${payload.generated}`, {
    x: 0.4, y: 6.8, w: 12, h: 0.3,
    fontSize: 9, color: "475569",
  });

  // ── Slide 2: Stats (if present) ──────────────────────────────────────────────
  if (payload.stats && payload.stats.length > 0) {
    const s2 = prs.addSlide();
    s2.background = { color: "FFFFFF" };
    s2.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: "0F172A" } });

    s2.addText("SUMMARY", {
      x: 0.4, y: 0.25, w: 12, h: 0.3,
      fontSize: 8, bold: true, color: "64748B", charSpacing: 3,
    });
    s2.addText(payload.title, {
      x: 0.4, y: 0.55, w: 12, h: 0.7,
      fontSize: 24, bold: true, color: "0F172A",
    });

    const cols = Math.min(4, payload.stats.length);
    const cardW = (12.53 - (cols - 1) * 0.18) / cols;
    const cardH = 1.1;
    const startX = 0.4;
    const startY = 1.6;

    payload.stats.forEach((s, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + 0.18);
      const y = startY + row * (cardH + 0.18);

      s2.addShape(prs.ShapeType.rect, {
        x, y, w: cardW, h: cardH,
        fill: { color: "F1F5F9" },
        line: { color: "E2E8F0", width: 0.75 },
      });
      s2.addText(String(s.label).toUpperCase(), {
        x: x + 0.1, y: y + 0.1, w: cardW - 0.2, h: 0.25,
        fontSize: 7, color: "64748B", charSpacing: 1.5,
      });
      s2.addText(String(s.value), {
        x: x + 0.1, y: y + 0.42, w: cardW - 0.2, h: 0.55,
        fontSize: 26, bold: true, color: "0F172A",
      });
    });
  }

  // ── One slide per table ──────────────────────────────────────────────────────
  for (const table of payload.tables) {
    const s = prs.addSlide();
    s.background = { color: "FFFFFF" };
    s.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: "0F172A" } });

    s.addText(table.title.toUpperCase(), {
      x: 0.4, y: 0.15, w: 12, h: 0.35,
      fontSize: 8, bold: true, color: "64748B", charSpacing: 2,
    });

    if (table.rows.length === 0) {
      s.addText("No data available.", {
        x: 0.4, y: 1.2, w: 12, h: 0.4,
        fontSize: 12, color: "94A3B8", italic: true,
      });
      continue;
    }

    // Cap at 25 rows per slide for readability
    const visibleRows = table.rows.slice(0, 25);
    const truncated = table.rows.length > 25;

    type TableRow = pptxgen.TableRow;
    type TableCellProps = pptxgen.TableCellProps;

    const tableRows: TableRow[] = [
      table.headers.map((h) => ({
        text: h,
        options: {
          bold: true,
          color: "FFFFFF",
          fill: { color: "0F172A" },
          fontSize: 8,
          align: "left",
        } as TableCellProps,
      })),
      ...visibleRows.map((row, ri) =>
        row.map((c) => ({
          text: c == null ? "" : String(c),
          options: {
            fontSize: 8,
            color: "0F172A",
            fill: { color: ri % 2 === 0 ? "FFFFFF" : "F8FAFC" },
            align: "left",
          } as TableCellProps,
        }))
      ),
    ];

    s.addTable(tableRows, {
      x: 0.4, y: 0.58, w: 12.53,
      border: { pt: 0.5, color: "E2E8F0" },
      rowH: 0.26,
      autoPage: true,
      autoPageRepeatHeader: true,
    });

    if (truncated) {
      s.addText(`Showing first 25 of ${table.rows.length} rows. Export as Excel or CSV for full data.`, {
        x: 0.4, y: 7.1, w: 12, h: 0.25,
        fontSize: 7.5, color: "94A3B8", italic: true,
      });
    }
  }

  const buf = await prs.write({ outputType: "arraybuffer" }) as ArrayBuffer;
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
}
