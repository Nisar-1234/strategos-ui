"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowDownTrayIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { exportData, type ExportFormat, type ExportPayload } from "@/lib/export";

interface ExportButtonProps {
  payload: ExportPayload;
  className?: string;
}

const FORMATS: { format: ExportFormat; label: string; ext: string }[] = [
  { format: "xlsx", label: "Excel Workbook",  ext: ".xlsx" },
  { format: "pdf",  label: "PDF Report",      ext: ".pdf"  },
  { format: "pptx", label: "PowerPoint",      ext: ".pptx" },
  { format: "csv",  label: "CSV Data",        ext: ".csv"  },
  { format: "md",   label: "Markdown",        ext: ".md"   },
  { format: "txt",  label: "Plain Text",      ext: ".txt"  },
];

export function ExportButton({ payload, className }: ExportButtonProps) {
  const [open, setOpen]       = useState(false);
  const [busy, setBusy]       = useState<ExportFormat | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handle = async (format: ExportFormat) => {
    setBusy(format);
    setOpen(false);
    setError(null);
    try {
      await exportData(payload, format);
    } catch (err) {
      setError(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div ref={ref} className={`relative inline-block${className ? ` ${className}` : ""}`}>
      <button
        onClick={() => { setError(null); setOpen((v) => !v); }}
        disabled={!!busy}
        className="flex items-center gap-1.5 bg-green-600 text-white rounded-lg px-3.5 py-1.5 text-[11px] font-medium hover:bg-green-700 transition-colors disabled:opacity-60 select-none"
      >
        <ArrowDownTrayIcon className="w-3.5 h-3.5 shrink-0" />
        {busy ? "Exporting..." : "Export"}
        <ChevronDownIcon className={`w-3 h-3 ml-0.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 z-50 bg-white border border-border rounded-lg overflow-hidden w-[170px]">
          {FORMATS.map(({ format, label, ext }) => (
            <button
              key={format}
              onClick={() => handle(format)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-[11px] text-navy hover:bg-surface transition-colors border-b border-border last:border-b-0"
            >
              <span className="font-medium">{label}</span>
              <span className="text-[10px] text-muted font-mono">{ext}</span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="absolute right-0 mt-1 z-50 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[10px] text-red-700 w-[220px]">
          {error}
        </div>
      )}
    </div>
  );
}
