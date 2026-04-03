"use client";
// Lazy-loads ExportButton with ssr:false so xlsx/jspdf/pptxgenjs never run server-side.
import dynamic from "next/dynamic";
export type { ExportPayload } from "@/lib/export/types";

export const ExportButton = dynamic(
  () => import("./ExportButton").then((m) => ({ default: m.ExportButton })),
  { ssr: false, loading: () => null }
);
