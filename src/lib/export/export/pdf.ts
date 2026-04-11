import type { ExportPayload } from "./types";

const C = {
  navy: "#0F172A" as const,
  brand: "#1B4FD8" as const,
  white: "#FFFFFF" as const,
  muted: "#64748B" as const,
  surface: "#F8FAFC" as const,
  border: "#E2E8F0" as const,
};

export async function exportPdf(payload: ExportPayload): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const addHeader = (pageNum: number) => {
    doc.setFillColor(C.navy);
    doc.rect(0, 0, W, 10, "F");
    doc.setTextColor(C.white);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("STRATEGOS INTELLIGENCE PLATFORM", 8, 6.5);
    doc.setFont("helvetica", "normal");
    doc.text(`${payload.generated}  |  Page ${pageNum}`, W - 8, 6.5, { align: "right" });
  };

  addHeader(1);
  let y = 18;

  // Title block
  doc.setTextColor(C.navy);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(payload.title, 8, y);
  y += 7;

  if (payload.subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(C.muted);
    doc.setFont("helvetica", "normal");
    doc.text(payload.subtitle, 8, y);
    y += 5;
  }

  // Thin rule
  doc.setDrawColor(C.border);
  doc.setLineWidth(0.3);
  doc.line(8, y, W - 8, y);
  y += 5;

  // Stats block — 4-column grid
  if (payload.stats && payload.stats.length > 0) {
    const cols = 4;
    const cardW = (W - 16 - (cols - 1) * 3) / cols;
    const cardH = 14;

    payload.stats.forEach((s, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 8 + col * (cardW + 3);
      const cy = y + row * (cardH + 3);

      doc.setFillColor(C.surface);
      doc.setDrawColor(C.border);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, cy, cardW, cardH, 2, 2, "FD");

      doc.setFontSize(6.5);
      doc.setTextColor(C.muted);
      doc.setFont("helvetica", "normal");
      doc.text(String(s.label).toUpperCase(), x + 3, cy + 5);

      doc.setFontSize(13);
      doc.setTextColor(C.navy);
      doc.setFont("helvetica", "bold");
      doc.text(String(s.value), x + 3, cy + 11);
    });

    const statRows = Math.ceil(payload.stats.length / cols);
    y += statRows * (cardH + 3) + 4;
  }

  let pageNum = 1;

  // Tables
  for (const table of payload.tables) {
    if (y > H - 30) {
      doc.addPage();
      pageNum++;
      addHeader(pageNum);
      y = 16;
    }

    doc.setFontSize(8);
    doc.setTextColor(C.brand);
    doc.setFont("helvetica", "bold");
    doc.text(table.title.toUpperCase(), 8, y);
    y += 3;

    autoTable(doc, {
      head: [table.headers],
      body: table.rows.map((r) => r.map((c) => (c == null ? "" : String(c)))),
      startY: y,
      margin: { left: 8, right: 8 },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: C.navy,
        lineColor: C.border,
        lineWidth: 0.15,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: C.navy,
        textColor: C.white,
        fontStyle: "bold",
        fontSize: 7.5,
      },
      alternateRowStyles: { fillColor: C.surface },
      didDrawPage: () => {
        pageNum++;
        addHeader(pageNum);
      },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
  }

  if (payload.notes) {
    if (y > H - 12) { doc.addPage(); pageNum++; addHeader(pageNum); y = 16; }
    doc.setFontSize(7.5);
    doc.setTextColor(C.muted);
    doc.setFont("helvetica", "italic");
    doc.text(payload.notes, 8, y);
  }

  return doc.output("blob");
}
