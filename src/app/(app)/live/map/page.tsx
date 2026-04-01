"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  ArrowDownTrayIcon,
  NewspaperIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { api, type ApiConflict, type ApiPrediction, type ApiSignal } from "@/lib/api";
import { useApiData } from "@/hooks/use-api-data";

const categories = [
  "All Conflicts",
  "Armed Conflicts",
  "Political Crisis",
  "Economic Tensions",
  "Cyber Threats",
];

const REGION_COORDS: Record<string, { x: number; y: number }> = {
  "Eastern Europe": { x: 54, y: 24 },
  "Middle East": { x: 51, y: 38 },
  "East Africa": { x: 50, y: 50 },
  "West Africa": { x: 40, y: 48 },
  "South America": { x: 24, y: 60 },
  "East Asia": { x: 78, y: 38 },
  "Korean Peninsula": { x: 80, y: 30 },
  "Southeast Asia": { x: 73, y: 46 },
  "South Asia": { x: 66, y: 40 },
  "Central Asia": { x: 62, y: 28 },
  "North Africa": { x: 46, y: 40 },
  "Southern Africa": { x: 48, y: 58 },
  "Central America": { x: 20, y: 48 },
  "Western Europe": { x: 42, y: 22 },
  "Global": { x: 50, y: 35 },
};

type DisplayConflict = {
  id: string;
  name: string;
  region: string;
  description: string;
  intensity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  probabilities: { label: string; pct: number; color: string }[];
  signals: { icon: "news" | "globe"; text: string }[];
  statusLabel: string;
  statusPct: number;
  x: number;
  y: number;
  size: number;
};

const intensityBadge: Record<string, string> = {
  CRITICAL: "bg-red-500 text-white",
  HIGH: "bg-red-500 text-white",
  MEDIUM: "bg-amber-500 text-white",
  LOW: "bg-green-500 text-white",
};

const markerColor: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-red-500",
  MEDIUM: "bg-amber-500",
  LOW: "bg-green-500",
};

const legendItems = [
  { color: "bg-red-500", label: "Critical", sz: 12 },
  { color: "bg-red-400", label: "High", sz: 10 },
  { color: "bg-amber-500", label: "Medium", sz: 8 },
  { color: "bg-green-500", label: "Low", sz: 6 },
];

export default function GeoMapPage() {
  const [activeCategory, setActiveCategory] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: apiConflicts, live } = useApiData<ApiConflict[]>({
    fetcher: () => api.conflicts(),
    fallback: [],
    pollInterval: 60_000,
  });

  const { data: predictions } = useApiData<ApiPrediction[]>({
    fetcher: () => api.predictions({ limit: 100 }),
    fallback: [],
    pollInterval: 60_000,
  });

  const { data: recentSignals } = useApiData<ApiSignal[]>({
    fetcher: () => api.signals({ limit: 200 }),
    fallback: [],
    pollInterval: 30_000,
  });

  const predMap = useMemo(() => {
    const m = new Map<string, ApiPrediction>();
    for (const p of predictions) m.set(p.conflict_id, p);
    return m;
  }, [predictions]);

  const signalsByConflict = useMemo(() => {
    const m = new Map<string, ApiSignal[]>();
    for (const s of recentSignals) {
      if (s.conflict_id) {
        const arr = m.get(s.conflict_id) || [];
        arr.push(s);
        m.set(s.conflict_id, arr);
      }
    }
    return m;
  }, [recentSignals]);

  const displayConflicts: DisplayConflict[] = useMemo(() => {
    return apiConflicts.map((c, i) => {
      const pred = predMap.get(c.id);
      const sigs = signalsByConflict.get(c.id) || [];
      const coords = REGION_COORDS[c.region] || { x: 30 + (i * 12) % 50, y: 25 + (i * 10) % 35 };

      let intensity: DisplayConflict["intensity"] = "MEDIUM";
      let probabilities: DisplayConflict["probabilities"] = [];
      let statusLabel = "Monitoring";
      let statusPct = 0;

      if (pred) {
        const probs = [
          { label: "Escalation", pct: Math.round(pred.escalation_prob * 100), color: "bg-danger" },
          { label: "Negotiation", pct: Math.round(pred.negotiation_prob * 100), color: "bg-brand" },
          { label: "Stalemate", pct: Math.round(pred.stalemate_prob * 100), color: "bg-amber-500" },
          { label: "Resolution", pct: Math.round(pred.resolution_prob * 100), color: "bg-success" },
        ].sort((a, b) => b.pct - a.pct);
        probabilities = probs;
        statusLabel = probs[0].label;
        statusPct = probs[0].pct;

        if (pred.convergence_score >= 7.5) intensity = "CRITICAL";
        else if (pred.convergence_score >= 5) intensity = "HIGH";
        else if (pred.convergence_score >= 3) intensity = "MEDIUM";
        else intensity = "LOW";
      }

      const signals = sigs.slice(0, 3).map((s) => ({
        icon: (s.layer === "L1" ? "news" : "globe") as "news" | "globe",
        text: s.content || s.source_name,
      }));

      return {
        id: c.id,
        name: c.name,
        region: c.region,
        description: c.description || c.region,
        intensity,
        probabilities,
        signals: signals.length > 0 ? signals : [{ icon: "globe" as const, text: c.description || "Monitoring..." }],
        statusLabel,
        statusPct,
        x: coords.x,
        y: coords.y,
        size: intensity === "CRITICAL" ? 24 : intensity === "HIGH" ? 20 : intensity === "MEDIUM" ? 16 : 12,
      };
    });
  }, [apiConflicts, predMap, signalsByConflict]);

  const effectiveSelected = selectedId ?? displayConflicts[0]?.id ?? null;
  const selected = displayConflicts.find((c) => c.id === effectiveSelected) ?? displayConflicts[0];

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {categories.map((cat, i) => (
          <button key={cat} onClick={() => setActiveCategory(i)}
            className={cn("px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors border",
              activeCategory === i ? "bg-brand text-white border-brand" : "bg-card text-navy border-border hover:border-brand/40")}>
            {cat}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {live ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-[9px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> LIVE
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 text-[9px] font-bold">CONNECTING...</span>
          )}
          <div className="flex items-center gap-1.5 border border-border rounded-md px-2.5 py-1.5 text-[11px] text-navy bg-card">
            <CalendarIcon className="w-3.5 h-3.5 text-muted" />
            {dateLabel}
          </div>
          <button className="flex items-center gap-1.5 border border-border rounded-md px-2.5 py-1.5 text-[11px] text-navy bg-card hover:bg-surface-100 transition-colors">
            <ArrowDownTrayIcon className="w-3.5 h-3.5 text-muted" />
            Export Map
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Map */}
        <div className="flex-1 bg-surface-100 border border-border rounded-lg relative overflow-hidden">
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.07]" viewBox="0 0 100 70" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="0.4">
            <path d="M8,12 L12,10 16,8 20,10 22,14 20,18 18,22 14,24 10,26 8,24 6,20 8,16Z" />
            <path d="M18,30 L22,28 26,30 28,34 30,40 28,46 24,50 20,48 16,44 14,38 16,34Z" />
            <path d="M40,8 L44,6 48,8 52,10 50,14 46,16 42,14 40,12Z" />
            <path d="M40,22 L44,20 48,22 52,26 54,32 52,40 48,46 44,48 40,46 36,40 34,34 36,28Z" />
            <path d="M52,6 L58,4 64,6 70,8 76,10 82,12 86,16 88,22 86,28 82,32 76,30 70,26 64,22 58,18 54,14Z" />
            <path d="M48,18 L52,16 56,18 58,22 56,26 52,28 48,26 46,22Z" />
            <path d="M70,28 L74,26 78,28 80,32 82,36 80,40 76,38 72,34Z" />
            <path d="M76,44 L82,42 88,44 90,48 88,54 82,56 76,54 74,50Z" />
            <line x1="0" y1="35" x2="100" y2="35" strokeDasharray="2 2" strokeWidth="0.15" />
            <line x1="50" y1="0" x2="50" y2="70" strokeDasharray="2 2" strokeWidth="0.15" />
          </svg>

          {displayConflicts.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-[13px] text-muted">
              Waiting for conflict data from API...
            </div>
          )}

          {displayConflicts.map((c) => (
            <button key={c.id} onClick={() => setSelectedId(c.id)} className="absolute group"
              style={{ left: `${c.x}%`, top: `${c.y}%`, transform: "translate(-50%, -50%)" }}>
              <div className="relative">
                <div className={cn("rounded-full transition-all", markerColor[c.intensity],
                  effectiveSelected === c.id && "ring-2 ring-navy ring-offset-2",
                  c.intensity === "CRITICAL" && "animate-pulse")}
                  style={{ width: c.size, height: c.size }} />
                <div className={cn("absolute left-1/2 -translate-x-1/2 whitespace-nowrap transition-opacity pointer-events-none",
                  effectiveSelected === c.id || c.size >= 18 ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
                  style={{ top: c.size + 4 }}>
                  <div className="bg-card/95 border border-border rounded px-1.5 py-0.5 shadow-sm text-center">
                    <div className="text-[9px] font-semibold text-navy leading-tight">{c.name} — {c.intensity}</div>
                    <div className="text-[8px] text-muted leading-tight">{c.statusPct}% {c.statusLabel}</div>
                  </div>
                </div>
              </div>
            </button>
          ))}

          <div className="absolute left-3 bottom-3 bg-card/90 border border-border rounded-lg p-2.5 backdrop-blur-sm">
            <div className="text-[10px] font-semibold text-navy mb-1.5">Map Legend</div>
            {legendItems.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 mb-1 last:mb-0">
                <div className={cn("rounded-full", item.color)} style={{ width: item.sz, height: item.sz }} />
                <span className="text-[9px] text-navy">{item.label}</span>
              </div>
            ))}
            <div className="text-[8px] text-muted mt-1 italic">Size = intensity</div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-[280px] shrink-0 bg-card border border-border rounded-lg p-4 overflow-y-auto">
          {selected ? (
            <>
              <span className={cn("inline-block px-2 py-0.5 rounded text-[9px] font-bold mb-2", intensityBadge[selected.intensity])}>
                {selected.intensity}
              </span>
              <h3 className="text-[15px] font-bold text-navy mb-4">{selected.name}</h3>
              <div className="space-y-3 text-[11px]">
                <div>
                  <div className="text-muted text-[9px] uppercase tracking-wider mb-0.5">Region</div>
                  <div className="font-medium text-navy">{selected.region}</div>
                </div>
                <div>
                  <div className="text-muted text-[9px] uppercase tracking-wider mb-0.5">Description</div>
                  <div className="font-medium text-navy">{selected.description}</div>
                </div>
                <div>
                  <div className="text-muted text-[9px] uppercase tracking-wider mb-1">Intensity</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 via-orange-400 to-red-500" />
                    <span className={cn("text-[12px] font-bold",
                      selected.intensity === "CRITICAL" || selected.intensity === "HIGH" ? "text-red-500" : selected.intensity === "MEDIUM" ? "text-amber-500" : "text-green-500")}>
                      {selected.intensity}
                    </span>
                  </div>
                </div>
                {selected.probabilities.length > 0 && (
                  <div>
                    <div className="text-muted text-[9px] uppercase tracking-wider mb-1.5">Probability Breakdown</div>
                    <div className="space-y-1.5">
                      {selected.probabilities.map((p) => (
                        <div key={p.label}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[10px] text-navy">{p.label}</span>
                            <span className="text-[10px] font-semibold text-navy">{p.pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-surface-200">
                            <div className={cn("h-full rounded-full transition-all", p.color)} style={{ width: `${p.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-muted text-[9px] uppercase tracking-wider mb-1.5">Recent Signals</div>
                  <div className="space-y-2">
                    {selected.signals.map((s, i) => (
                      <div key={i} className="flex items-start gap-2">
                        {s.icon === "news" ? <NewspaperIcon className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5" /> : <GlobeAltIcon className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5" />}
                        <span className="text-[10px] text-navy leading-snug line-clamp-2">{s.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <button className="w-full mt-4 py-2 rounded-md bg-brand text-white text-[11px] font-semibold hover:bg-brand-mid transition-colors">
                Full Analysis
              </button>
            </>
          ) : (
            <p className="text-[11px] text-muted py-8 text-center">Waiting for data...</p>
          )}
        </div>
      </div>

      {/* Bottom conflict cards */}
      <div className="flex gap-3 mt-3 overflow-x-auto pb-1">
        {displayConflicts.slice(0, 6).map((c) => (
          <button key={c.id} onClick={() => setSelectedId(c.id)}
            className={cn("shrink-0 w-[170px] bg-card border rounded-lg p-3 text-left transition-colors",
              effectiveSelected === c.id ? "border-brand ring-1 ring-brand/30" : "border-border hover:border-brand/40")}>
            <div className="text-[11px] font-semibold text-navy mb-1.5 truncate">{c.name}</div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold", intensityBadge[c.intensity])}>
                {c.intensity}
              </span>
            </div>
            <div className="text-[10px] text-muted">
              <span className="font-semibold text-navy">{c.statusPct}%</span> {c.statusLabel}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
