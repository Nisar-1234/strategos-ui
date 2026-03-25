"use client";

import { useEffect, useState, useCallback } from "react";
import { Topbar } from "@/components/layout/topbar";
import { cn } from "@/lib/utils";
import { api, mapApiSignal } from "@/lib/api";
import {
  FunnelIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  SignalIcon,
} from "@heroicons/react/24/outline";

const LAYER_TABS = [
  { key: "all", label: "All Layers" },
  { key: "L1", label: "L1 Media" },
  { key: "L2", label: "L2 Social" },
  { key: "L5", label: "L5 Commodity" },
  { key: "L6", label: "L6 Currency" },
  { key: "L7", label: "L7 Equity" },
  { key: "L10", label: "L10 Connect" },
];

type MappedSignal = ReturnType<typeof mapApiSignal>;

export default function SignalMonitorPage() {
  const [signals, setSignals] = useState<MappedSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLayer, setActiveLayer] = useState("all");
  const [alertOnly, setAlertOnly] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const fetchSignals = useCallback(async () => {
    try {
      const params: { layer?: string; alert_only?: boolean; limit?: number } = { limit: 100 };
      if (activeLayer !== "all") params.layer = activeLayer;
      if (alertOnly) params.alert_only = true;

      const [data, countData] = await Promise.all([
        api.signals(params),
        api.signalsCount(),
      ]);

      setSignals(data.map(mapApiSignal));
      setCounts(countData);
    } catch (err) {
      console.error("Signal fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [activeLayer, alertOnly]);

  useEffect(() => {
    setLoading(true);
    fetchSignals();
    const interval = setInterval(fetchSignals, 15000);
    return () => clearInterval(interval);
  }, [fetchSignals]);

  const totalSignals = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <Topbar title="Signal Monitor" subtitle={`${totalSignals} total signals across ${Object.keys(counts).length} layers`} />
      <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-3">
        <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-2 flex-wrap">
          {LAYER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveLayer(tab.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors",
                activeLayer === tab.key
                  ? "bg-navy text-white"
                  : "text-navy hover:bg-surface-100"
              )}
            >
              {tab.label}
              {tab.key !== "all" && counts[tab.key] ? (
                <span className="ml-1 text-[9px] opacity-70">({counts[tab.key]})</span>
              ) : null}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={alertOnly}
                onChange={(e) => setAlertOnly(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300"
              />
              <span className="text-[11px] text-navy flex items-center gap-1">
                <ExclamationTriangleIcon className="w-3.5 h-3.5 text-danger" />
                Alerts Only
              </span>
            </label>
            <button
              onClick={() => { setLoading(true); fetchSignals(); }}
              className="flex items-center gap-1 text-[11px] text-brand hover:text-brand-mid"
            >
              <ArrowPathIcon className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        {loading && signals.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ArrowPathIcon className="w-6 h-6 text-brand animate-spin mx-auto mb-2" />
              <p className="text-[12px] text-muted">Loading signals...</p>
            </div>
          </div>
        ) : signals.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <SignalIcon className="w-6 h-6 text-muted mx-auto mb-2" />
              <p className="text-[12px] text-muted">No signals found for this filter</p>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="text-left px-4 py-2.5 text-[9px] font-bold text-muted uppercase tracking-wider w-16">Layer</th>
                  <th className="text-left px-4 py-2.5 text-[9px] font-bold text-muted uppercase tracking-wider w-28">Source</th>
                  <th className="text-left px-4 py-2.5 text-[9px] font-bold text-muted uppercase tracking-wider">Content</th>
                  <th className="text-left px-4 py-2.5 text-[9px] font-bold text-muted uppercase tracking-wider w-20">Value</th>
                  <th className="text-left px-4 py-2.5 text-[9px] font-bold text-muted uppercase tracking-wider w-16">Alert</th>
                  <th className="text-left px-4 py-2.5 text-[9px] font-bold text-muted uppercase tracking-wider w-14">Age</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface transition-colors">
                    <td className="px-4 py-2.5">
                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-[3px] border", s.badgeClass)}>
                        {s.layer}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] font-medium text-brand">{s.sourceName}</td>
                    <td className="px-4 py-2.5 text-[11px] text-navy max-w-[400px] truncate">{s.content}</td>
                    <td className="px-4 py-2.5 text-[11px] font-mono text-navy">
                      {s.rawValue != null ? (s.rawValue > 100 ? `$${s.rawValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : s.rawValue.toFixed(1)) : "--"}
                    </td>
                    <td className="px-4 py-2.5">
                      {s.alertFlag ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-[3px] bg-danger-50 text-danger border border-danger/30">
                          {s.alertSeverity || "ALERT"}
                        </span>
                      ) : (
                        <span className="text-[9px] text-muted">--</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[10px] text-muted">{s.timeAgo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
