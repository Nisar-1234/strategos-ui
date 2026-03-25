"use client";

import { useEffect, useState, useCallback } from "react";
import { Topbar } from "@/components/layout/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PredictionsPanel } from "@/components/dashboard/predictions-panel";
import { SignalFeed } from "@/components/dashboard/signal-feed";
import { ProbabilityChart } from "@/components/dashboard/probability-chart";
import { GameTheoryMini } from "@/components/dashboard/game-theory-mini";
import {
  topPredictions,
  liveSignals as mockSignals,
  gameTheorySummary,
  probabilityData,
} from "@/lib/mock-data";
import { api, mapApiSignal } from "@/lib/api";
import type { Signal } from "@/lib/mock-data";

export default function DashboardPage() {
  const [signals, setSignals] = useState<Signal[]>(mockSignals);
  const [kpis, setKpis] = useState([
    { label: "Active Signals", value: "--", sub: "Loading...", color: "text-brand" },
    { label: "Signal Layers", value: "--", sub: "Checking...", color: "text-success" },
    { label: "L5 Commodities", value: "--", sub: "Polygon.io", color: "text-warning" },
    { label: "L7 Equities", value: "--", sub: "Polygon.io", color: "text-success" },
    { label: "L10 Connectivity", value: "--", sub: "Cloudflare Radar", color: "text-danger" },
  ]);
  const [lastSync, setLastSync] = useState("Loading...");

  const fetchData = useCallback(async () => {
    try {
      const [feed, counts] = await Promise.all([
        api.signalsFeed(20),
        api.signalsCount(),
      ]);

      if (feed.length > 0) {
        setSignals(feed.map(mapApiSignal) as Signal[]);
      }

      const totalSignals = Object.values(counts).reduce((a, b) => a + b, 0);
      const activeLayers = Object.keys(counts).length;

      setKpis([
        { label: "Active Signals", value: String(totalSignals), sub: `${activeLayers} layers reporting`, color: "text-brand" },
        { label: "Signal Layers", value: `${activeLayers}/10`, sub: activeLayers >= 3 ? "Ingestion active" : "Partial", color: activeLayers >= 3 ? "text-success" : "text-warning" },
        { label: "L5 Commodities", value: String(counts["L5"] || 0), sub: "Gold, Silver, Oil, Metals", color: "text-warning" },
        { label: "L7 Equities", value: String(counts["L7"] || 0), sub: "RTX, LMT, NOC, GD", color: "text-success" },
        { label: "L10 Connectivity", value: String(counts["L10"] || 0), sub: "11 conflict zones", color: counts["L10"] ? "text-danger" : "text-muted" },
      ]);

      setLastSync(`Last sync ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setLastSync("Sync failed - using cached data");
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <>
      <Topbar
        title="Intelligence Dashboard"
        subtitle={`Live signal ingestion active -- ${lastSync}`}
      />
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="grid grid-cols-5 gap-2.5 mb-3">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>

        <div className="grid grid-cols-[1.3fr_1fr] gap-2.5" style={{ height: "calc(100vh - 220px)" }}>
          <div className="flex flex-col gap-2.5 overflow-hidden">
            <PredictionsPanel predictions={topPredictions} />
            <div className="flex-1 min-h-0">
              <ProbabilityChart data={probabilityData} />
            </div>
          </div>

          <div className="flex flex-col gap-2.5 overflow-hidden">
            <div className="flex-1 min-h-0">
              <SignalFeed signals={signals} />
            </div>
            <GameTheoryMini data={gameTheorySummary} />
          </div>
        </div>
      </div>
    </>
  );
}
