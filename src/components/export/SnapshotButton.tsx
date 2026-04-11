"use client";

import { useState, useCallback } from "react";
import { CameraIcon } from "@heroicons/react/24/outline";

interface SnapshotButtonProps {
  /** CSS selector for the element to capture. Defaults to the page scroll root. */
  targetSelector?: string;
  filename?: string;
  className?: string;
}

export function SnapshotButton({ targetSelector, filename, className }: SnapshotButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const { toPng } = await import("html-to-image");
      const el = targetSelector
        ? (document.querySelector(targetSelector) as HTMLElement | null)
        : (document.getElementById("__next") ?? document.body);
      if (!el) throw new Error("Target element not found");

      const dataUrl = await toPng(el, {
        cacheBust: true,
        backgroundColor: "#F8FAFC",
        pixelRatio: 2,
        // Skip elements that cause cors issues
        filter: (node) => {
          if (node instanceof HTMLElement) {
            return !node.classList.contains("no-snapshot");
          }
          return true;
        },
      });

      const date = new Date().toISOString().slice(0, 10);
      const name = filename ?? `STRATEGOS_snapshot_${date}.png`;
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Snapshot failed");
      setTimeout(() => setError(null), 4000);
    } finally {
      setBusy(false);
    }
  }, [targetSelector, filename]);

  return (
    <div className="relative inline-block">
      <button
        onClick={capture}
        disabled={busy}
        title="Capture page snapshot"
        className={`flex items-center gap-1.5 bg-slate-700 text-white rounded-lg px-3.5 py-1.5 text-[11px] font-medium hover:bg-slate-800 transition-colors disabled:opacity-60 select-none${className ? ` ${className}` : ""}`}
      >
        <CameraIcon className="w-3.5 h-3.5 shrink-0" />
        {busy ? "Capturing..." : "Snapshot"}
      </button>
      {error && (
        <div className="absolute right-0 mt-1 z-50 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[10px] text-red-700 w-[200px] whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
}
