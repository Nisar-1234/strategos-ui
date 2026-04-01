"use client";

import { useState, useMemo } from "react";
import { Topbar } from "@/components/layout/topbar";
import { cn } from "@/lib/utils";
import {
  PlusIcon,
  SpeakerXMarkIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { api, mapApiSignal, type ApiSignal } from "@/lib/api";
import { useApiData } from "@/hooks/use-api-data";

const tabs = ["All Channels", "Live Only", "Breaking News", "Geopolitical"];

/* All data from live API — no mock fallback */

function extractSourceName(sourceName: string): string {
  const parts = sourceName.split("/");
  return parts.length > 1 ? parts.slice(1).join("/") : parts[0];
}

function extractProvider(sourceName: string): string {
  const parts = sourceName.split("/");
  return parts[0] || sourceName;
}

export default function NewsLivePage() {
  const [activeTab, setActiveTab] = useState(0);

  const { data: rawSignals, live, loading } = useApiData({
    fetcher: () => api.signals({ layer: "L1", limit: 50 }),
    fallback: [] as ApiSignal[],
    pollInterval: 30_000,
  });

  const mapped = useMemo(() => rawSignals.map(mapApiSignal), [rawSignals]);

  const channels = useMemo(() => {
    const sourceMap = new Map<string, { name: string; desc: string; live: boolean; signals: number; bias: string; biasColor: string }>();
    for (const s of rawSignals) {
      const provider = extractProvider(s.source_name);
      const name = extractSourceName(s.source_name);
      if (!sourceMap.has(provider)) {
        const bias = s.confidence > 0.85 ? "NEUTRAL" : s.confidence > 0.7 ? "CAUTIOUS" : "UNVERIFIED";
        const biasColor = bias === "NEUTRAL" ? "bg-gray-100 text-gray-600 border-gray-200" : bias === "CAUTIOUS" ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-100 text-amber-700 border-amber-200";
        sourceMap.set(provider, { name: name || provider, desc: `${provider} Feed`, live: true, signals: 0, bias, biasColor });
      }
      sourceMap.get(provider)!.signals++;
    }
    return Array.from(sourceMap.values()).slice(0, 4);
  }, [rawSignals]);

  const alertSignals = useMemo(() => {
    return rawSignals
      .filter((s) => s.alert_flag)
      .slice(0, 5)
      .map((s) => ({
        source: extractSourceName(s.source_name),
        time: mapApiSignal(s).timeAgo + " ago",
        text: s.content || "",
        severity: s.alert_severity === "CRITICAL" ? "HIGH" : "MEDIUM",
      }));
  }, [rawSignals]);

  return (
    <>
      <Topbar title="Live News Channels" subtitle="Real-time broadcast monitoring and AI signal detection">
        <div className="flex items-center gap-2">
          {live ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500 text-white text-[9px] font-bold uppercase tracking-wider">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Live
            </div>
          ) : (
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-600 text-[9px] font-bold">CONNECTING...</span>
          )}
        </div>
      </Topbar>
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex gap-0.5 border border-border rounded-md p-0.5 bg-card">
              {["grid", "list", "card"].map((v) => (
                <button key={v} className="w-7 h-7 flex items-center justify-center rounded text-muted hover:bg-surface-100">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
              ))}
            </div>
            {tabs.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors",
                  activeTab === i ? "bg-brand text-white border-brand" : "bg-card text-navy border-border hover:border-brand/40"
                )}
              >
                {tab}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <button className="flex items-center gap-1.5 border border-border rounded-md px-2.5 py-1.5 text-[11px] text-navy bg-card hover:bg-surface-100">
                <PlusIcon className="w-3.5 h-3.5" />
                Add Channel
              </button>
              <button className="flex items-center gap-1.5 border border-border rounded-md px-2.5 py-1.5 text-[11px] text-navy bg-card hover:bg-surface-100">
                <SpeakerXMarkIcon className="w-3.5 h-3.5" />
                Mute All
              </button>
            </div>
          </div>

          {/* News cards from real signal sources */}
          <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
            {channels.length > 0 ? channels.map((ch) => (
              <div key={ch.name} className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
                <div className="relative bg-navy-mid flex-1 min-h-[140px] flex items-center justify-center">
                  {ch.live ? (
                    <>
                      <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-bold">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        LIVE
                      </div>
                      <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px]">
                        {ch.signals} signals
                      </div>
                      <span className="text-[11px] text-white/40">Live Signal Stream</span>
                    </>
                  ) : (
                    <span className="text-[13px] font-semibold text-white/30 uppercase tracking-wider">Offline</span>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-[12px] font-semibold text-navy">{ch.name}</div>
                  <div className="text-[10px] text-muted mt-0.5 mb-2">{ch.desc}</div>
                  <div className="flex items-center justify-between">
                    <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold border", ch.biasColor)}>{ch.bias}</span>
                    {ch.live && (
                      <button className="flex items-center gap-1 text-[10px] text-muted hover:text-navy transition-colors">
                        <MagnifyingGlassIcon className="w-3 h-3" />
                        Analyze
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-2 flex items-center justify-center text-[11px] text-muted p-8">
                {loading ? "Loading news sources..." : "No editorial signals available"}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-[260px] shrink-0 flex flex-col gap-4">
          <div className="bg-card border border-border rounded-lg p-4 flex-1 overflow-y-auto">
            <h3 className="text-[12px] font-semibold text-navy mb-1">AI Signal Detection</h3>
            <p className="text-[9px] text-muted mb-3">{live ? "Live signals from L1 editorial layer" : "Connecting to signal feed..."}</p>
            <div className="space-y-3">
              {alertSignals.length > 0 ? alertSignals.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <ExclamationTriangleIcon className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", s.severity === "HIGH" ? "text-red-500" : "text-amber-500")} />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-navy">{s.source}</span>
                      <span className="text-[9px] text-muted">{s.time}</span>
                    </div>
                    <p className="text-[10px] text-muted leading-relaxed mt-0.5 line-clamp-2">{s.text}</p>
                    <span className={cn("text-[9px] font-bold", s.severity === "HIGH" ? "text-red-500" : "text-amber-500")}>{s.severity}</span>
                  </div>
                </div>
              )) : (
                <p className="text-[10px] text-muted">No alerts detected</p>
              )}
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[12px] font-semibold text-navy">Keyword Alerts</h3>
              <button className="text-[10px] text-brand hover:text-brand-mid">Edit</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["ceasefire", "escalation", "nuclear", "sanctions", "NATO", "UN Security"].map((kw) => (
                <span key={kw} className="px-2 py-0.5 rounded-full bg-surface border border-border text-[9px] text-navy">{kw}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
