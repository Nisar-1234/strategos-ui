"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { MagnifyingGlassIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { api, mapApiSignal, type ApiSignal } from "@/lib/api";
import { useApiData } from "@/hooks/use-api-data";
import { ExportButton } from "@/components/export/ExportButtonClient";
import type { ExportPayload } from "@/lib/export/types";
import { SnapshotButton } from "@/components/export/SnapshotButton";

/* All data comes from the live API — no mock fallback */

type Sentiment = "Positive" | "Alert" | "Neutral";

function deriveSentiment(s: ApiSignal): Sentiment {
  if (s.alert_flag) return "Alert";
  if (s.normalized_score !== undefined && s.normalized_score > 0.2) return "Positive";
  return "Neutral";
}

const sentimentConfig: Record<Sentiment, { badge: string; arrow: "up" | "down" | "neutral" }> = {
  Positive: { badge: "bg-green-50 text-green-700 border border-green-200", arrow: "up" },
  Alert: { badge: "bg-red-50 text-red-600 border border-red-200", arrow: "down" },
  Neutral: { badge: "bg-gray-100 text-gray-600 border border-gray-200", arrow: "neutral" },
};

const LAYER_ICON_COLORS: Record<string, string> = {
  L1: "bg-red-500", L2: "bg-indigo-500", L3: "bg-teal-500", L4: "bg-sky-500",
  L5: "bg-amber-500", L6: "bg-purple-500", L7: "bg-emerald-500", L8: "bg-blue-500",
  L9: "bg-orange-500", L10: "bg-red-600",
};

const defaultKeywords = ["ceasefire", "escalation", "sanctions", "NATO", "military", "diplomatic"];

/* ───── Donut Chart SVG ───── */

function DonutChart({ data }: { data: { label: string; pct: number; color: string }[] }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <svg viewBox="0 0 140 140" className="w-[120px] h-[120px] mx-auto">
      {data.map((slice) => {
        const dash = (slice.pct / 100) * circumference;
        const gap = circumference - dash;
        const offset = -((accumulated / 100) * circumference);
        accumulated += slice.pct;
        return (
          <circle
            key={slice.label}
            cx="70" cy="70" r={radius}
            fill="none" stroke={slice.color} strokeWidth="20"
            strokeDasharray={`${dash} ${gap}`} strokeDashoffset={offset}
            transform="rotate(-90 70 70)"
          />
        );
      })}
      <text x="70" y="66" textAnchor="middle" className="fill-navy text-[14px] font-bold">100%</text>
      <text x="70" y="82" textAnchor="middle" className="fill-muted text-[9px]">Total</text>
    </svg>
  );
}

/* ───── Arrow Icons ───── */

function ArrowUp({ className }: { className?: string }) {
  return (
    <svg className={cn("w-3 h-3", className)} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 10V2M3 5l3-3 3 3" />
    </svg>
  );
}

function ArrowDown({ className }: { className?: string }) {
  return (
    <svg className={cn("w-3 h-3", className)} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2v8M3 7l3 3 3-3" />
    </svg>
  );
}

function Dash({ className }: { className?: string }) {
  return (
    <svg className={cn("w-3 h-3", className)} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 6h6" />
    </svg>
  );
}

/* ───── Page Component ───── */

export default function SignalMonitorPage() {
  const [keywords, setKeywords] = useState(defaultKeywords);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");

  const { data: rawSignals, loading, live, refresh } = useApiData({
    fetcher: () => api.signals({ limit: 100 }),
    fallback: [] as ApiSignal[],
    pollInterval: 30_000,
  });

  const signals = useMemo(() => rawSignals.map(mapApiSignal), [rawSignals]);

  const enriched = useMemo(() => {
    return rawSignals.map((raw, i) => ({
      mapped: signals[i],
      sentiment: deriveSentiment(raw),
      relevance: Math.round(raw.confidence * 100),
    }));
  }, [rawSignals, signals]);

  const filtered = useMemo(() => {
    return enriched.filter((s) => {
      if (sourceFilter !== "all" && s.mapped.layer !== sourceFilter) return false;
      if (sentimentFilter !== "all" && s.sentiment !== sentimentFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!s.mapped.content.toLowerCase().includes(q) && !s.mapped.source.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [enriched, sourceFilter, sentimentFilter, search]);

  const distribution = useMemo(() => {
    const counts: Record<string, number> = {};
    rawSignals.forEach((s) => { counts[s.layer] = (counts[s.layer] || 0) + 1; });
    const total = rawSignals.length || 1;
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([layer, count]) => ({
        source: layer,
        pct: Math.round((count / total) * 100),
        color: LAYER_ICON_COLORS[layer] || "bg-gray-400",
      }));
  }, [rawSignals]);

  const sentimentData = useMemo(() => {
    let pos = 0, alert = 0, neutral = 0;
    rawSignals.forEach((s) => {
      const sent = deriveSentiment(s);
      if (sent === "Positive") pos++;
      else if (sent === "Alert") alert++;
      else neutral++;
    });
    const total = rawSignals.length || 1;
    return [
      { label: "Positive", pct: Math.round((pos / total) * 100), color: "#059669" },
      { label: "Neutral", pct: Math.round((neutral / total) * 100), color: "#94A3B8" },
      { label: "Alert", pct: Math.round((alert / total) * 100), color: "#DC2626" },
    ];
  }, [rawSignals]);

  const removeKeyword = (kw: string) => setKeywords((prev) => prev.filter((k) => k !== kw));

  const layers = useMemo(() => {
    const set = new Set(rawSignals.map((s) => s.layer));
    return Array.from(set).sort();
  }, [rawSignals]);

  const exportPayload = useMemo<ExportPayload>(() => ({
    title: "Signal Monitoring",
    subtitle: sourceFilter !== "all" ? `Layer: ${sourceFilter}` : undefined,
    generated: new Date().toUTCString(),
    stats: [
      { label: "Total Signals", value: rawSignals.length },
      { label: "Filtered", value: filtered.length },
      { label: "Layers Active", value: layers.length },
    ],
    tables: [
      {
        title: "Signal Feed",
        headers: ["Layer", "Source", "Content", "Confidence %", "Sentiment", "Time Ago"],
        rows: filtered.map((s) => [
          s.mapped.layer,
          s.mapped.source,
          s.mapped.content,
          s.relevance,
          s.sentiment,
          `${s.mapped.timeAgo} ago`,
        ]),
      },
      {
        title: "Layer Distribution",
        headers: ["Layer", "Signal %"],
        rows: distribution.map((d) => [d.source, d.pct]),
      },
      {
        title: "Sentiment Distribution",
        headers: ["Sentiment", "%"],
        rows: sentimentData.map((s) => [s.label, s.pct]),
      },
    ],
    notes: keywords.length > 0 ? `Keyword alerts: ${keywords.join(", ")}` : undefined,
  }), [filtered, rawSignals, distribution, sentimentData, layers, sourceFilter, keywords]);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-bold text-navy leading-tight">Signal Monitoring</h1>
          {live ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-[9px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> LIVE
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 text-[9px] font-bold">CONNECTING...</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="h-8 rounded-md border border-border bg-card px-2.5 text-[11px] text-navy focus:outline-none">
            <option value="all">All Layers</option>
            {layers.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={sentimentFilter} onChange={(e) => setSentimentFilter(e.target.value)} className="h-8 rounded-md border border-border bg-card px-2.5 text-[11px] text-navy focus:outline-none">
            <option value="all">Sentiment: All</option>
            <option value="Positive">Positive</option>
            <option value="Alert">Alert</option>
            <option value="Neutral">Neutral</option>
          </select>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search signals..."
              className="h-8 w-48 rounded-md border border-border bg-card pl-7 pr-2.5 text-[11px] text-navy placeholder:text-muted focus:outline-none focus:border-brand/50"
            />
          </div>
          <button onClick={refresh} className="h-8 px-2.5 rounded-md border border-border bg-card text-navy hover:bg-surface-100 flex items-center gap-1 text-[11px]">
            <ArrowPathIcon className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
          </button>
          <ExportButton payload={exportPayload} />
          <SnapshotButton filename="STRATEGOS_signal_monitor.png" />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-5 pb-5 flex gap-4 flex-1 min-h-0">
        {/* Left: Signal Feed */}
        <div className="flex-[7] min-w-0 flex flex-col">
          <div className="bg-card border border-border rounded-lg flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-[13px] font-bold text-navy">Real-Time Signal Feed</h2>
              <span className="text-[10px] text-muted">{filtered.length} signals</span>
            </div>
            <div className="divide-y divide-border overflow-y-auto">
              {loading && filtered.length === 0 ? (
                <div className="p-8 text-center">
                  <ArrowPathIcon className="w-5 h-5 text-brand animate-spin mx-auto mb-2" />
                  <p className="text-[11px] text-muted">Loading signals...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-[11px] text-muted">No signals match your filters</div>
              ) : (
                filtered.map((s) => {
                  const cfg = sentimentConfig[s.sentiment];
                  return (
                    <div key={s.mapped.id} className="px-4 py-3 flex items-start gap-3 hover:bg-surface transition-colors">
                      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 mt-0.5", LAYER_ICON_COLORS[s.mapped.layer] || "bg-gray-400")}>
                        {s.mapped.layer}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-navy truncate">
                            {s.mapped.layerName}: {s.mapped.source}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted leading-relaxed mt-0.5 line-clamp-2">{s.mapped.content}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] text-muted font-medium">Confidence:</span>
                          <div className="w-24 h-1.5 rounded-full bg-surface-200 overflow-hidden">
                            <div className="h-full rounded-full bg-brand" style={{ width: `${s.relevance}%` }} />
                          </div>
                          <span className="text-[9px] font-semibold text-navy">{s.relevance}%</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-[10px] text-muted whitespace-nowrap">{s.mapped.timeAgo} ago</span>
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium", cfg.badge)}>
                          {cfg.arrow === "up" && <ArrowUp />}
                          {cfg.arrow === "down" && <ArrowDown />}
                          {cfg.arrow === "neutral" && <Dash />}
                          {s.sentiment}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[280px] shrink-0 flex flex-col gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-[12px] font-bold text-navy mb-3">Layer Distribution</h3>
            <div className="flex flex-col gap-3">
              {distribution.map((d) => (
                <div key={d.source}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-navy font-medium">{d.source}</span>
                    <span className="text-[10px] font-semibold text-navy">{d.pct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-200 overflow-hidden">
                    <div className={cn("h-full rounded-full", d.color)} style={{ width: `${d.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-[12px] font-bold text-navy mb-3">Sentiment Analysis</h3>
            <DonutChart data={sentimentData} />
            <div className="flex flex-col gap-2 mt-4">
              {sentimentData.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-[11px] text-navy flex-1">{s.label}</span>
                  <span className="text-[11px] font-semibold text-navy">{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Keyword Alerts */}
      <div className="px-5 pb-5">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-[12px] font-bold text-navy mb-2.5">Keyword Alerts</h3>
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw) => (
              <span key={kw} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-50 border border-brand-100 text-[11px] text-brand font-medium">
                {kw}
                <button onClick={() => removeKeyword(kw)} className="text-brand/60 hover:text-brand transition-colors leading-none" aria-label={`Remove ${kw}`}>
                  &times;
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
