"use client";

import { cn } from "@/lib/utils";
import { api, ApiSignal } from "@/lib/api";
import { useApiData } from "@/hooks/use-api-data";
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  SignalIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";

const LAYERS = ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10"];
const LAYER_NAMES: Record<string, string> = {
  L1: "Editorial", L2: "Social", L3: "Shipping", L4: "Aviation",
  L5: "Commodities", L6: "Currency", L7: "Equities", L8: "Satellite",
  L9: "Economic", L10: "Connectivity",
};
const LAYER_COLORS: Record<string, string> = {
  L1: "#DC2626", L2: "#4F46E5", L3: "#0891B2", L4: "#0284C7",
  L5: "#D97706", L6: "#7C3AED", L7: "#059669", L8: "#2563EB",
  L9: "#B45309", L10: "#DC2626",
};

function layerStats(signals: ApiSignal[], layer: string) {
  const layerSigs = signals.filter((s) => s.layer === layer);
  const count = layerSigs.length;
  const alerts = layerSigs.filter((s) => s.alert_flag).length;
  const avgScore = count > 0
    ? layerSigs.reduce((s, x) => s + (x.normalized_score ?? 0), 0) / count
    : 0;
  const avgConf = count > 0
    ? layerSigs.reduce((s, x) => s + x.confidence, 0) / count
    : 0;
  const latestTs = count > 0
    ? Math.max(...layerSigs.map((s) => new Date(s.timestamp).getTime()))
    : 0;
  const ageSec = latestTs ? (Date.now() - latestTs) / 1000 : 99999;
  const status = ageSec < 600 ? "active" : ageSec < 3600 ? "stale" : "offline";
  return { count, alerts, avgScore, avgConf, status, ageSec };
}

function correlation(sigs: ApiSignal[], layerA: string, layerB: string): number {
  const a = sigs.filter((s) => s.layer === layerA).map((s) => s.normalized_score ?? 0);
  const b = sigs.filter((s) => s.layer === layerB).map((s) => s.normalized_score ?? 0);
  if (a.length < 3 || b.length < 3) return 0;
  const meanA = a.reduce((s, v) => s + v, 0) / a.length;
  const meanB = b.reduce((s, v) => s + v, 0) / b.length;
  let num = 0, denA = 0, denB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const da = a[i] - meanA, db = b[i] - meanB;
    num += da * db; denA += da * da; denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  return den === 0 ? 0 : num / den;
}

export default function CommandCenterPage() {
  const { data: signals, live } = useApiData<ApiSignal[]>({
    fetcher: () => api.signals({ limit: 500 }),
    fallback: [],
    pollInterval: 30_000,
  });

  const { data: healthData } = useApiData<{ total_signals?: number; status?: string; layers?: Record<string, string> }>({
    fetcher: () => api.health(),
    fallback: {},
    pollInterval: 15_000,
  });

  const { data: counts } = useApiData<Record<string, number>>({
    fetcher: () => api.signalsCount(),
    fallback: {},
    pollInterval: 30_000,
  });

  const totalSignals = Object.values(counts).reduce((s, v) => s + v, 0);
  const totalAlerts = signals.filter((s) => s.alert_flag).length;
  const activeLayers = LAYERS.filter((l) => layerStats(signals, l).status === "active").length;
  const systemStatus = (healthData as Record<string, unknown>)?.status as string || "unknown";

  const alertSignals = signals
    .filter((s) => s.alert_flag)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 15);

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-navy leading-tight">Signal Intelligence Command</h1>
        <div className="flex items-center gap-3">
          <span className={cn(
            "px-2 py-0.5 rounded text-[9px] font-bold tracking-wider",
            systemStatus === "healthy" ? "bg-green-500/10 text-green-600" :
            systemStatus === "degraded" ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-600",
          )}>
            SYSTEM: {systemStatus.toUpperCase()}
          </span>
          <span className={cn(
            "px-2 py-0.5 rounded text-[9px] font-bold tracking-wider",
            live ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600",
          )}>
            {live ? "LIVE" : "OFFLINE"}
          </span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="px-6 pb-4 grid grid-cols-4 gap-3">
        {[
          { icon: SignalIcon, label: "Total Signals", value: totalSignals.toLocaleString(), color: "text-brand" },
          { icon: ExclamationTriangleIcon, label: "Active Alerts", value: totalAlerts.toString(), color: "text-red-500" },
          { icon: ShieldCheckIcon, label: "Active Layers", value: `${activeLayers} / 10`, color: "text-green-600" },
          { icon: BoltIcon, label: "Ingestion Rate", value: signals.length > 0 ? `${Math.round(totalSignals / 24)}/hr` : "—", color: "text-purple-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
            <kpi.icon className={cn("w-8 h-8", kpi.color)} />
            <div>
              <div className="text-[10px] text-muted uppercase tracking-wider">{kpi.label}</div>
              <div className="text-[20px] font-bold text-navy">{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 flex gap-4 px-6 pb-6 overflow-auto">
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Layer Health Matrix */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-[13px] font-semibold text-navy mb-3">Layer Health Status</h2>
            <div className="grid grid-cols-5 gap-2">
              {LAYERS.map((layer) => {
                const stats = layerStats(signals, layer);
                return (
                  <div key={layer} className={cn(
                    "rounded-lg p-3 border",
                    stats.status === "active" ? "border-green-200 bg-green-50/50" :
                    stats.status === "stale" ? "border-amber-200 bg-amber-50/50" : "border-gray-200 bg-gray-50",
                  )}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LAYER_COLORS[layer] }} />
                      <span className="text-[11px] font-bold text-navy">{layer}</span>
                      <span className="text-[9px] text-muted">{LAYER_NAMES[layer]}</span>
                    </div>
                    <div className="text-[18px] font-bold text-navy">{counts[layer] || 0}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] text-muted">{stats.alerts} alerts</span>
                      <span className={cn(
                        "text-[9px] font-bold uppercase",
                        stats.status === "active" ? "text-green-600" :
                        stats.status === "stale" ? "text-amber-600" : "text-gray-400",
                      )}>
                        {stats.status}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${Math.min(100, Math.abs(stats.avgScore) * 100)}%`,
                        backgroundColor: stats.avgScore < -0.2 ? "#DC2626" : stats.avgScore > 0.2 ? "#059669" : "#D97706",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cross-Layer Correlation Matrix */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-[13px] font-semibold text-navy mb-3">Cross-Layer Correlation Matrix</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-[9px] text-muted p-1"></th>
                    {LAYERS.map((l) => (
                      <th key={l} className="text-[9px] font-bold text-navy p-1 text-center">{l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {LAYERS.map((row) => (
                    <tr key={row}>
                      <td className="text-[9px] font-bold text-navy p-1">{row}</td>
                      {LAYERS.map((col) => {
                        const corr = row === col ? 1.0 : correlation(signals, row, col);
                        const absC = Math.abs(corr);
                        const bg = corr > 0.3 ? `rgba(5,150,105,${absC * 0.6})`
                          : corr < -0.3 ? `rgba(220,38,38,${absC * 0.6})`
                          : `rgba(148,163,184,${absC * 0.3})`;
                        return (
                          <td key={col} className="p-1 text-center" style={{ backgroundColor: bg }}>
                            <span className="text-[9px] font-mono font-bold text-navy">
                              {corr.toFixed(2)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right sidebar — Alert Feed */}
        <div className="w-[300px] shrink-0 flex flex-col gap-4">
          <div className="bg-card border border-border rounded-lg p-4 flex-1 overflow-auto">
            <h2 className="text-[13px] font-semibold text-navy mb-3 flex items-center gap-1.5">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
              Alert Feed
            </h2>
            <div className="space-y-2">
              {alertSignals.length === 0 && (
                <p className="text-[11px] text-muted py-4 text-center">No alerts — all clear</p>
              )}
              {alertSignals.map((sig) => {
                const ago = Math.round((Date.now() - new Date(sig.timestamp).getTime()) / 60000);
                const timeStr = ago < 60 ? `${ago}m ago` : `${Math.floor(ago / 60)}h ago`;
                return (
                  <div key={sig.id} className={cn(
                    "rounded-md p-2.5 border",
                    sig.alert_severity === "CRITICAL" ? "border-red-200 bg-red-50/50" : "border-amber-200 bg-amber-50/50",
                  )}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LAYER_COLORS[sig.layer] || "#6B7280" }} />
                      <span className="text-[10px] font-bold text-navy">{sig.layer}</span>
                      <span className={cn(
                        "text-[8px] font-bold uppercase px-1 py-0.5 rounded",
                        sig.alert_severity === "CRITICAL" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700",
                      )}>
                        {sig.alert_severity || "WARNING"}
                      </span>
                      <span className="text-[9px] text-muted ml-auto">{timeStr}</span>
                    </div>
                    <p className="text-[10px] text-navy leading-relaxed line-clamp-2">{sig.content}</p>
                    <div className="text-[9px] text-muted mt-1">{sig.source_name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
