"use client";

import { useEffect, useState, useCallback } from "react";
import { Topbar } from "@/components/layout/topbar";
import { cn } from "@/lib/utils";
import { api, mapApiSignal } from "@/lib/api";
import {
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";

type MappedSignal = ReturnType<typeof mapApiSignal>;

export default function MarketsPage() {
  const [commodities, setCommodities] = useState<MappedSignal[]>([]);
  const [equities, setEquities] = useState<MappedSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [l5, l7] = await Promise.all([
        api.signals({ layer: "L5", limit: 50 }),
        api.signals({ layer: "L7", limit: 50 }),
      ]);

      const l5Mapped = l5.map(mapApiSignal);
      const l7Mapped = l7.map(mapApiSignal);

      const latestL5 = dedupeBySource(l5Mapped);
      const latestL7 = dedupeBySource(l7Mapped);

      setCommodities(latestL5);
      setEquities(latestL7);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Markets fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <>
      <Topbar title="Markets" subtitle={`Commodities & equities with geopolitical overlay${lastUpdate ? ` -- Updated ${lastUpdate}` : ""}`} />
      <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-navy">Live Market Data via Polygon.io</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success-50 text-success border border-success/30 font-bold">LIVE</span>
          </div>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="flex items-center gap-1 text-[11px] text-brand hover:text-brand-mid"
          >
            <ArrowPathIcon className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>

        <div>
          <h2 className="text-[12px] font-bold text-navy mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warning" />
            L5 -- Commodities & Metals
          </h2>
          {loading && commodities.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <ArrowPathIcon className="w-5 h-5 text-brand animate-spin mx-auto mb-2" />
              <p className="text-[11px] text-muted">Loading commodity data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {commodities.map((s) => (
                <MarketCard key={s.id} signal={s} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-[12px] font-bold text-navy mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success" />
            L7 -- Defense & Market Equities
          </h2>
          {loading && equities.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <ArrowPathIcon className="w-5 h-5 text-brand animate-spin mx-auto mb-2" />
              <p className="text-[11px] text-muted">Loading equity data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {equities.map((s) => (
                <MarketCard key={s.id} signal={s} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function MarketCard({ signal }: { signal: MappedSignal }) {
  const pctMatch = signal.content.match(/\(([+-]?\d+\.?\d*)%/);
  const pctChange = pctMatch ? parseFloat(pctMatch[1]) : 0;
  const isUp = pctChange >= 0;

  const priceMatch = signal.content.match(/\$([0-9,.]+)/);
  const price = priceMatch ? priceMatch[1] : signal.rawValue?.toLocaleString() || "--";

  return (
    <div className="bg-card border border-border rounded-lg p-3 hover:border-brand/30 transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-navy">{signal.source}</span>
        {signal.alertFlag && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-[3px] bg-danger-50 text-danger border border-danger/30">
            {signal.alertSeverity || "ALERT"}
          </span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-[20px] font-bold text-navy leading-none">${price}</span>
        <span className={cn("flex items-center gap-0.5 text-[11px] font-semibold", isUp ? "text-success" : "text-danger")}>
          {isUp ? <ArrowTrendingUpIcon className="w-3.5 h-3.5" /> : <ArrowTrendingDownIcon className="w-3.5 h-3.5" />}
          {pctChange > 0 ? "+" : ""}{pctChange.toFixed(1)}%
        </span>
      </div>
      <div className="text-[9px] text-muted mt-1">{signal.timeAgo} ago via Polygon.io</div>
    </div>
  );
}

function dedupeBySource(signals: MappedSignal[]): MappedSignal[] {
  const seen = new Map<string, MappedSignal>();
  for (const s of signals) {
    if (!seen.has(s.sourceName)) {
      seen.set(s.sourceName, s);
    }
  }
  return Array.from(seen.values());
}
