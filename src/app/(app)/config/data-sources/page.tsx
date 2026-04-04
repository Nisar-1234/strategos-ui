"use client";

import { useMemo } from "react";
import { Topbar } from "@/components/layout/topbar";
import { cn } from "@/lib/utils";
import { api, type ApiHealthResponse } from "@/lib/api";
import { useApiData } from "@/hooks/use-api-data";

/** Health API returns `layers` keyed as L1…L10 (same as DB `signals.layer`), not L1_editorial-style names. */
const LAYER_SOURCES: { layer: string; name: string; apis: string[] }[] = [
  { layer: "L1", name: "Editorial Media", apis: ["NewsAPI.org", "GDELT"] },
  {
    layer: "L2",
    name: "Social Media",
    apis: ["Telegram (Telethon, primary)", "Reddit (supplementary)", "X (optional)"],
  },
  {
    layer: "L3",
    name: "Shipping / Maritime",
    apis: [
      "Phase 2 — MarineTraffic or equivalent AIS (vessel positions). Not UN Comtrade or Wikipedia.",
    ],
  },
  {
    layer: "L4",
    name: "Aviation",
    apis: [
      "OpenSky Network (ADS-B state vectors by region). ADS-B Exchange not integrated — see repo data.md.",
    ],
  },
  { layer: "L5", name: "Commodities", apis: ["Polygon.io", "Alpha Vantage"] },
  { layer: "L6", name: "Forex / Currency", apis: ["Open Exchange Rates"] },
  { layer: "L7", name: "Defense Equities", apis: ["Polygon.io", "Alpha Vantage"] },
  {
    layer: "L8",
    name: "Satellite / Remote Sensing",
    apis: [
      "NASA FIRMS (thermal hotspots)",
      "NASA CMR — VIIRS VNP46A2 metadata (not NASA EONET)",
      "Sentinel Hub optical — planned Phase 2",
    ],
  },
  {
    layer: "L9",
    name: "Economic Indicators",
    apis: ["FRED", "World Bank", "UN COMTRADE (trade flows)"],
  },
  { layer: "L10", name: "Connectivity", apis: ["Cloudflare Radar", "IODA"] },
];

const LAYER_COLORS: Record<string, string> = {
  L1: "bg-red-500", L2: "bg-indigo-500", L3: "bg-teal-500", L4: "bg-sky-500",
  L5: "bg-amber-500", L6: "bg-purple-500", L7: "bg-emerald-500", L8: "bg-blue-500",
  L9: "bg-orange-500", L10: "bg-red-600",
};

export default function DataSourcesPage() {
  const { data: layerCounts, live: countLive } = useApiData<Record<string, number>>({
    fetcher: () => api.signalsCount(),
    fallback: {},
    pollInterval: 60_000,
  });

  const { data: health, live: healthLive } = useApiData<ApiHealthResponse>({
    fetcher: () => api.health(),
    fallback: { status: "unknown", service: "", version: "", timestamp: "", layers: {} },
    pollInterval: 60_000,
  });

  const live = countLive || healthLive;

  const totalSignals = useMemo(() => Object.values(layerCounts).reduce((a, b) => a + b, 0), [layerCounts]);
  const connectedLayers = useMemo(() => {
    return LAYER_SOURCES.filter((ls) => {
      const hk = health.layers?.[ls.layer];
      return hk && hk !== "no_data";
    }).length;
  }, [health]);

  const layerDetails = useMemo(() => {
    return LAYER_SOURCES.map((ls) => {
      const count = layerCounts[ls.layer] || 0;
      const hk = health.layers?.[ls.layer];
      let status: "active" | "stale" | "pending" = "pending";
      if (live && hk === "active") status = "active";
      else if (live && hk === "stale") status = "stale";
      else if (live && count > 0) status = "active";
      return { ...ls, count, status };
    });
  }, [layerCounts, health, live]);

  return (
    <>
      <Topbar title="Data Sources" subtitle="All 10 signal layer ingestion pipelines">
        {live ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-[9px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> API CONNECTED
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 text-[9px] font-bold">CONNECTING...</span>
        )}
      </Topbar>
      <div className="flex-1 overflow-auto p-4">
        {/* Summary row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1">Total Signals Ingested</p>
            <p className="text-[28px] font-bold text-navy leading-none">{totalSignals.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1">Active Layers</p>
            <p className="text-[28px] font-bold text-success leading-none">{connectedLayers} / 10</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1">System Status</p>
            <p className={cn("text-[28px] font-bold leading-none",
              health.status === "healthy" ? "text-success" : health.status === "degraded" ? "text-amber-500" : "text-red-500",
            )}>
              {health.status === "healthy" ? "Healthy" : health.status === "degraded" ? "Degraded" : live ? "Unhealthy" : "Connecting"}
            </p>
          </div>
        </div>

        {/* Layer grid */}
        <div className="grid grid-cols-2 gap-4">
          {layerDetails.map((ld) => (
            <div key={ld.layer} className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-white text-[11px] font-bold", LAYER_COLORS[ld.layer] || "bg-gray-500")}>
                  {ld.layer}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-navy">{ld.name}</div>
                  <div className="text-[10px] text-muted">{ld.apis.join(" · ")}</div>
                </div>
                <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold border",
                  ld.status === "active" ? "bg-green-50 text-green-700 border-green-200" :
                  ld.status === "stale" ? "bg-amber-50 text-amber-700 border-amber-200" :
                  "bg-gray-100 text-gray-500 border-gray-200",
                )}>
                  {ld.status === "active" ? "Active" : ld.status === "stale" ? "Stale" : "Pending"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted">Signals ingested</span>
                <span className="font-semibold text-navy">{ld.count.toLocaleString()}</span>
              </div>
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", LAYER_COLORS[ld.layer] || "bg-gray-400")}
                  style={{ width: `${totalSignals > 0 ? Math.max(2, (ld.count / totalSignals) * 100) : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
