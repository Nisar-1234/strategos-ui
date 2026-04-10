"use client";

import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  CheckCircleIcon,
  GlobeAltIcon,
  CircleStackIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { api, mapApiSignal, type ApiSignal, type ApiPrediction, type ApiTimeseriesBucket, type ApiConflict, type ApiLayerStatus } from "@/lib/api";
import { useApiData } from "@/hooks/use-api-data";
import { useRealtime } from "@/hooks/use-realtime";
import { useMemo } from "react";

const confidenceBadge = {
  HIGH: "bg-green-50 text-green-700 border border-green-200",
  MED: "bg-amber-50 text-amber-700 border border-amber-200",
  MEDIUM: "bg-amber-50 text-amber-700 border border-amber-200",
  LOW: "bg-gray-100 text-gray-500 border border-gray-200",
} as Record<string, string>;

const probabilityColor: Record<string, string> = {
  HIGH: "bg-brand",
  MED: "bg-warning",
  MEDIUM: "bg-warning",
  LOW: "bg-gray-300",
};

const LAYER_BADGE: Record<string, string> = {
  L1: "bg-red-500", L2: "bg-indigo-500", L3: "bg-teal-500", L4: "bg-sky-500",
  L5: "bg-amber-500", L6: "bg-purple-500", L7: "bg-emerald-500", L8: "bg-blue-500",
  L9: "bg-orange-500", L10: "bg-red-600",
};

function CircularProgress({ value }: { value: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={52} height={52} viewBox="0 0 52 52" className="shrink-0">
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--gray-200)" strokeWidth="4" />
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--blue)" strokeWidth="4"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 26 26)" />
      <text x="26" y="27" textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="700" fill="var(--navy)">
        {value.toFixed(1)}%
      </text>
    </svg>
  );
}

export default function DashboardPage() {
  const { data: signalFeed, live: signalsLive } = useApiData<ApiSignal[]>({
    fetcher: () => api.signalsFeed(10),
    fallback: [],
    pollInterval: 30_000,
  });

  const { data: layerCounts, live: countsLive } = useApiData<Record<string, number>>({
    fetcher: () => api.signalsCount(),
    fallback: {},
    pollInterval: 60_000,
  });

  const { data: apiPredictions, live: predictionsLive } = useApiData<ApiPrediction[]>({
    fetcher: () => api.predictions({ limit: 5 }),
    fallback: [],
    pollInterval: 60_000,
  });

  const { data: timeseries } = useApiData<ApiTimeseriesBucket[]>({
    fetcher: () => api.signalsTimeseries({ days: 30, bucket: "1d" }),
    fallback: [],
    pollInterval: 120_000,
  });

  const { data: conflicts } = useApiData<ApiConflict[]>({
    fetcher: () => api.conflicts(),
    fallback: [],
    pollInterval: 120_000,
  });

  const { data: healthData } = useApiData<{ total_signals?: number; status?: string; database?: string; redis?: string }>({
    fetcher: () => api.health(),
    fallback: {},
    pollInterval: 30_000,
  });

  const { data: layerStatuses } = useApiData<ApiLayerStatus[]>({
    fetcher: () => api.layerStatus(),
    fallback: [],
    pollInterval: 60_000,
  });

  // Top conflict id for WebSocket subscription (first active conflict)
  const topConflictId = conflicts.find((c) => c.status === "active")?.id ?? null;
  const { signals: wsSignals, convergenceScore: wsConvergence, connected: wsConnected } = useRealtime(topConflictId);

  const isLive = signalsLive || countsLive || predictionsLive;

  const totalSignals = useMemo(() => Object.values(layerCounts).reduce((a, b) => a + b, 0), [layerCounts]);
  const activeLayers = useMemo(() => Object.keys(layerCounts).length, [layerCounts]);
  const mappedSignals = useMemo(() => signalFeed.map(mapApiSignal), [signalFeed]);

  const highConfCount = useMemo(() => apiPredictions.filter((p) => p.confidence === "HIGH").length, [apiPredictions]);

  const predictionAccuracy = useMemo(() => {
    if (apiPredictions.length === 0) return 0;
    const avgConv = apiPredictions.reduce((s, p) => s + p.convergence_score, 0) / apiPredictions.length;
    return Math.min(99, avgConv * 10);
  }, [apiPredictions]);

  const predictions = useMemo(() => {
    return apiPredictions.map((p) => {
      const maxProb = Math.max(p.escalation_prob, p.negotiation_prob, p.stalemate_prob, p.resolution_prob);
      const ago = Math.round((Date.now() - new Date(p.created_at).getTime()) / 60000);
      const timeStr = ago < 60 ? `${ago}m ago` : ago < 1440 ? `${Math.floor(ago / 60)}h ago` : `${Math.floor(ago / 1440)}d ago`;
      return {
        name: p.conflict_name,
        probability: Math.round(maxProb * 100),
        confidence: p.confidence,
        time: timeStr,
      };
    });
  }, [apiPredictions]);

  const probabilityChart = useMemo(() => {
    if (timeseries.length === 0) return [];
    const byDay: Record<string, { day: string; avgScore: number; alerts: number; count: number }> = {};
    for (const b of timeseries) {
      const day = new Date(b.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!byDay[day]) byDay[day] = { day, avgScore: 0, alerts: 0, count: 0 };
      byDay[day].avgScore += b.avg_score * b.signal_count;
      byDay[day].alerts += b.alert_count;
      byDay[day].count += b.signal_count;
    }
    return Object.values(byDay).map((d) => {
      const avg = d.count > 0 ? d.avgScore / d.count : 0;
      const alertPct = d.count > 0 ? (d.alerts / d.count) * 100 : 0;
      return {
        day: d.day,
        Escalation: Math.round(Math.max(5, Math.min(95, 50 - avg * 40 + alertPct * 0.5))),
        Negotiation: Math.round(Math.max(5, Math.min(95, 30 + avg * 35))),
        Stalemate: Math.round(Math.max(5, Math.min(95, 40 - alertPct * 0.3))),
        Resolution: Math.round(Math.max(5, Math.min(95, 15 + avg * 20 - alertPct * 0.2))),
      };
    });
  }, [timeseries]);

  const activityLog = useMemo(() => {
    return signalFeed
      .filter((s) => s.alert_flag)
      .slice(0, 4)
      .map((s) => {
        const ts = new Date(s.timestamp);
        return {
          time: ts.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
          color: s.alert_severity === "CRITICAL" ? "bg-red-500" : "bg-amber-500",
          title: `${s.layer} Alert — ${s.source_name}`,
          desc: s.content || "Signal alert detected",
        };
      });
  }, [signalFeed]);

  const gameTheorySummary = useMemo(() => {
    if (apiPredictions.length === 0) return null;
    const top = apiPredictions[0];
    const strategies = [
      { label: "Escalation", prob: top.escalation_prob },
      { label: "Negotiation", prob: top.negotiation_prob },
      { label: "Stalemate", prob: top.stalemate_prob },
    ];
    const dominant = strategies.reduce((a, b) => (b.prob > a.prob ? b : a));
    return { conflict: top.conflict_name, dominant: dominant.label, strategies };
  }, [apiPredictions]);

  return (
    <div className="p-4 flex-1 overflow-y-auto bg-white">
      <div className="flex items-center justify-end mb-2 gap-2">
        {wsConnected && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> WS
          </span>
        )}
        {layerStatuses.filter((l) => l.status === "OFFLINE").length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 text-[9px] font-bold">
            {layerStatuses.filter((l) => l.status === "OFFLINE").length} LAYER{layerStatuses.filter((l) => l.status === "OFFLINE").length > 1 ? "S" : ""} OFFLINE
          </span>
        )}
        {isLive ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-[9px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> LIVE DATA
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 text-[9px] font-bold">CONNECTING...</span>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-card border border-border rounded-lg p-4 flex items-start justify-between">
          <div>
            <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1">Active Predictions</p>
            <p className="text-[32px] font-bold text-brand leading-none">{apiPredictions.length}</p>
            <p className="text-[11px] text-muted mt-1">{highConfCount} high confidence</p>
          </div>
          <CheckCircleIcon className="w-4 h-4 text-muted" />
        </div>

        <div className="bg-card border border-border rounded-lg p-4 flex items-start justify-between">
          <div>
            <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1">Total Signals</p>
            <p className="text-[32px] font-bold text-navy leading-none">{totalSignals.toLocaleString()}</p>
            <p className="text-[11px] text-muted mt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-warning mr-1 align-middle" />
              {activeLayers} layers active
            </p>
          </div>
          <GlobeAltIcon className="w-4 h-4 text-muted shrink-0" />
        </div>

        <div className="bg-card border border-border rounded-lg p-4 flex items-start justify-between">
          <div>
            <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1">Monitored Conflicts</p>
            <p className="text-[32px] font-bold text-success leading-none">{conflicts.length}</p>
            <p className="text-[11px] text-muted mt-1">{activeLayers} / 10 layers feeding</p>
          </div>
          <CircleStackIcon className="w-4 h-4 text-muted shrink-0" />
        </div>

        <div className="bg-card border border-border rounded-lg p-4 flex items-start justify-between">
          <div>
            <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1">Avg Convergence</p>
            <p className="text-[32px] font-bold text-navy leading-none">
              {predictionAccuracy > 0 ? `${predictionAccuracy.toFixed(1)}%` : "—"}
            </p>
            <p className="text-[11px] text-muted mt-1">Last 30 days</p>
          </div>
          {predictionAccuracy > 0 && <CircularProgress value={predictionAccuracy} />}
        </div>
      </div>

      {/* Three panels */}
      <div className="grid grid-cols-[2fr_1.75fr_1.25fr] gap-3 mb-4">
        {/* Predictions */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3">Top Active Predictions</h3>
          <div className="space-y-0">
            {predictions.length === 0 && (
              <p className="text-[11px] text-muted py-4 text-center">Waiting for prediction workers...</p>
            )}
            {predictions.map((p, i) => (
              <div key={p.name} className="flex items-center gap-2.5 py-2 border-b border-border last:border-b-0 group">
                <span className="text-[11px] font-semibold text-muted w-4 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-navy truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-semibold text-navy w-8">{p.probability}%</span>
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", probabilityColor[p.confidence] || "bg-gray-300")} style={{ width: `${p.probability}%` }} />
                    </div>
                  </div>
                </div>
                <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase shrink-0", confidenceBadge[p.confidence] || confidenceBadge.LOW)}>
                  {p.confidence}
                </span>
                <span className="text-[10px] text-muted shrink-0 w-12 text-right">{p.time}</span>
                <ChevronRightIcon className="w-3.5 h-3.5 text-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>

        {/* Game Theory Summary */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3">Game Theory Summary</h3>
          {gameTheorySummary ? (
            <>
              <p className="text-[11px] text-muted mb-2">{gameTheorySummary.conflict}</p>
              <div className="space-y-2 mb-4">
                {gameTheorySummary.strategies.map((s) => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-navy">{s.label}</span>
                      <span className="text-[11px] font-semibold text-navy">{(s.prob * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full",
                        s.label === "Escalation" ? "bg-red-500" : s.label === "Negotiation" ? "bg-blue-500" : "bg-gray-400",
                      )} style={{ width: `${s.prob * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-[11px] text-success font-semibold">Dominant Strategy</span>
                </div>
                <p className="text-[12px] font-semibold text-navy">{gameTheorySummary.dominant}</p>
              </div>
            </>
          ) : (
            <p className="text-[11px] text-muted py-4 text-center">Waiting for predictions data...</p>
          )}
        </div>

        {/* Signal Feed */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider">Signal Feed</h3>
            {signalsLive && (
              <span className="flex items-center gap-1 text-[9px] text-green-600 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> LIVE
              </span>
            )}
          </div>
          <div className="space-y-3">
            {mappedSignals.length === 0 && (
              <p className="text-[11px] text-muted py-4 text-center">Waiting for signal ingestion...</p>
            )}
            {mappedSignals.slice(0, 4).map((s) => (
              <div key={s.id} className="border-b border-border pb-3 last:border-b-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[7px] font-bold shrink-0", LAYER_BADGE[s.layer] || "bg-gray-400")}>
                    {s.layer}
                  </span>
                  <span className="text-[11px] font-semibold text-navy truncate">{s.source}</span>
                  <span className="text-[9px] text-muted ml-auto shrink-0">{s.timeAgo}</span>
                </div>
                <p className="text-[10px] text-muted leading-relaxed mb-1 line-clamp-2">{s.content}</p>
                <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full border", s.alertFlag ? "bg-red-50 text-red-600 border-red-200" : s.badgeClass)}>
                  {s.layerName}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart and Activity */}
      <div className="grid grid-cols-[3fr_2fr] gap-3">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3">
            Conflict Outcome Probability Over Time
          </h3>
          <div className="h-[240px]">
            {probabilityChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={probabilityChart} margin={{ top: 4, right: 12, bottom: 4, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickLine={false} axisLine={{ stroke: "var(--gray-200)" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickLine={false} axisLine={{ stroke: "var(--gray-200)" }} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)" }}
                    formatter={(value) => [`${Number(value).toFixed(1)}%`]} />
                  <Legend iconType="plainline" wrapperStyle={{ fontSize: 10, paddingBottom: 4 }} />
                  <Line type="monotone" dataKey="Escalation" stroke="var(--red)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                  <Line type="monotone" dataKey="Negotiation" stroke="var(--blue)" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="Stalemate" stroke="var(--gray-400)" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="Resolution" stroke="var(--green)" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[11px] text-muted">
                Chart populates as signal timeseries data accumulates...
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3">Recent Alert Activity</h3>
          <div className="space-y-0">
            {activityLog.length === 0 && (
              <p className="text-[11px] text-muted py-4 text-center">No alerts yet — signals are being ingested...</p>
            )}
            {activityLog.map((a) => (
              <div key={`${a.time}-${a.title}`} className="flex gap-3 py-2.5 border-b border-border last:border-b-0">
                <div className="flex flex-col items-center shrink-0">
                  <span className="text-[10px] font-mono text-muted">{a.time}</span>
                  <span className={cn("w-2.5 h-2.5 rounded-full mt-1.5", a.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-navy">{a.title}</p>
                  <p className="text-[10px] text-muted leading-relaxed mt-0.5 line-clamp-2">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
