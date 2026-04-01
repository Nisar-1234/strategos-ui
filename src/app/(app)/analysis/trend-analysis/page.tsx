"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { api, ApiTimeseriesBucket, ApiPrediction } from "@/lib/api";
import { useApiData } from "@/hooks/use-api-data";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  ArrowDownTrayIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

const LAYER_COLORS: Record<string, string> = {
  L1: "#DC2626", L2: "#4F46E5", L3: "#0891B2", L4: "#0284C7",
  L5: "#D97706", L6: "#7C3AED", L7: "#059669", L8: "#2563EB",
  L9: "#B45309", L10: "#DC2626",
};

function DataLabel({ x, y, value, suffix }: { x?: number; y?: number; value?: number; suffix?: string }) {
  return (
    <text x={x} y={(y ?? 0) - 10} textAnchor="middle" fill="#0F172A" fontSize={10} fontWeight={600}>
      {value}{suffix}
    </text>
  );
}

interface TrendRow {
  prediction: string;
  direction: "up" | "down" | "flat";
  change: string;
  confidence: string;
  updated: string;
}

function DirectionIcon({ direction }: { direction: TrendRow["direction"] }) {
  if (direction === "up")
    return <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />;
  if (direction === "down")
    return <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />;
  return <ArrowRightIcon className="w-4 h-4 text-gray-400" />;
}

function bucketLabel(ts: string) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function TrendAnalysisPage() {
  const [days, setDays] = useState(30);
  const [bucket, setBucket] = useState("1d");

  const { data: timeseries, live: tsLive } = useApiData<ApiTimeseriesBucket[]>({
    fetcher: () => api.signalsTimeseries({ days, bucket }),
    fallback: [],
    pollInterval: 60_000,
  });

  const { data: predictions, live: predLive } = useApiData<ApiPrediction[]>({
    fetcher: () => api.predictions({ limit: 10 }),
    fallback: [],
    pollInterval: 60_000,
  });

  const live = tsLive || predLive;

  const volumeByDate = Object.values(
    timeseries.reduce<Record<string, { date: string; count: number }>>((acc, b) => {
      const key = bucketLabel(b.timestamp);
      if (!acc[key]) acc[key] = { date: key, count: 0 };
      acc[key].count += b.signal_count;
      return acc;
    }, {})
  );

  const confidenceByDate = Object.values(
    timeseries.reduce<Record<string, { date: string; value: number; n: number }>>((acc, b) => {
      const key = bucketLabel(b.timestamp);
      if (!acc[key]) acc[key] = { date: key, value: 0, n: 0 };
      acc[key].value += b.avg_confidence * b.signal_count;
      acc[key].n += b.signal_count;
      return acc;
    }, {})
  ).map((d) => ({ date: d.date, value: d.n > 0 ? Math.round((d.value / d.n) * 100) : 0 }));

  const alertByDate = Object.values(
    timeseries.reduce<Record<string, { date: string; alerts: number; total: number }>>((acc, b) => {
      const key = bucketLabel(b.timestamp);
      if (!acc[key]) acc[key] = { date: key, alerts: 0, total: 0 };
      acc[key].alerts += b.alert_count;
      acc[key].total += b.signal_count;
      return acc;
    }, {})
  ).map((d) => ({ date: d.date, value: d.total > 0 ? Math.round((d.alerts / d.total) * 100) : 0 }));

  const trendRows: TrendRow[] = predictions.map((p) => {
    const esc = p.escalation_prob;
    const neg = p.negotiation_prob;
    const direction: TrendRow["direction"] = esc > neg ? "up" : esc < neg ? "down" : "flat";
    const change = `${esc > 0.5 ? "+" : ""}${(esc * 100).toFixed(1)}%`;
    return {
      prediction: p.conflict_name,
      direction,
      change,
      confidence: p.confidence,
      updated: new Date(p.created_at).toLocaleDateString(),
    };
  });

  const totalSignals = timeseries.reduce((s, b) => s + b.signal_count, 0);
  const totalAlerts = timeseries.reduce((s, b) => s + b.alert_count, 0);
  const avgConf = timeseries.length > 0
    ? (timeseries.reduce((s, b) => s + b.avg_confidence, 0) / timeseries.length * 100).toFixed(1)
    : "0";
  const avgScore = timeseries.length > 0
    ? (timeseries.reduce((s, b) => s + b.avg_score, 0) / timeseries.length).toFixed(3)
    : "0";
  const uniqueLayers = new Set(timeseries.map((b) => b.layer)).size;

  const overallTrend = parseFloat(avgScore) < -0.1 ? "Escalatory" : parseFloat(avgScore) > 0.1 ? "De-escalatory" : "Mixed";
  const trendUp = overallTrend === "Escalatory";

  const trendStats = [
    { label: "Overall Trend", value: overallTrend, accent: trendUp },
    { label: "Average Confidence", value: `${avgConf}%` },
    { label: "Total Signals", value: totalSignals.toLocaleString() },
    { label: "Alert Signals", value: totalAlerts.toLocaleString() },
    { label: "Active Layers", value: `${uniqueLayers} / 10` },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-navy leading-tight">Trend Analysis</h1>
        <span className={cn(
          "px-2 py-0.5 rounded text-[9px] font-bold tracking-wider",
          live ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600",
        )}>
          {live ? "LIVE DATA" : "CONNECTING..."}
        </span>
      </div>

      <div className="px-6 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border border-border rounded-md px-2.5 py-1.5 text-[11px] text-navy bg-card appearance-none pr-7 cursor-pointer"
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={60}>Last 60 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
          <select
            value={bucket}
            onChange={(e) => setBucket(e.target.value)}
            className="border border-border rounded-md px-2.5 py-1.5 text-[11px] text-navy bg-card appearance-none pr-7 cursor-pointer"
          >
            <option value="1h">Hourly</option>
            <option value="6h">6-Hour</option>
            <option value="1d">Daily</option>
          </select>
          <button className="ml-auto flex items-center gap-1.5 bg-green-600 text-white rounded-lg px-3.5 py-1.5 text-[11px] font-medium hover:bg-green-700 transition-colors">
            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 px-6 pb-6 overflow-auto">
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Signal Volume */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-[13px] font-semibold text-navy mb-3">Signal Volume Trend</h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={volumeByDate} margin={{ top: 20, right: 12, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} label={{ value: "Volume", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: "#64748B" }, offset: 16 }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="count" stroke="#0F172A" strokeWidth={2} dot={{ r: 3, fill: "#0F172A", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Confidence */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-[13px] font-semibold text-navy mb-3">Confidence Level Trend</h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={confidenceByDate} margin={{ top: 20, right: 12, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="confidenceFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} label={{ value: "Confidence (%)", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: "#64748B" }, offset: 16 }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} fill="url(#confidenceFill)" dot={{ r: 3, fill: "#3B82F6", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Alert Rate */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-[13px] font-semibold text-navy mb-3">Alert Rate Trend</h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={alertByDate} margin={{ top: 20, right: 12, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} label={{ value: "Alert %", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: "#64748B" }, offset: 16 }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="value" stroke="#DC2626" strokeWidth={2} dot={{ r: 3, fill: "#DC2626", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Trending Predictions Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-[13px] font-semibold text-navy">Conflict Escalation Trends</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 text-[9px] font-bold text-muted uppercase tracking-wider">Conflict</th>
                    <th className="text-left px-4 py-2.5 text-[9px] font-bold text-muted uppercase tracking-wider">Trend</th>
                    <th className="text-left px-4 py-2.5 text-[9px] font-bold text-muted uppercase tracking-wider">Escalation %</th>
                    <th className="text-left px-4 py-2.5 text-[9px] font-bold text-muted uppercase tracking-wider">Confidence</th>
                    <th className="text-left px-4 py-2.5 text-[9px] font-bold text-muted uppercase tracking-wider">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {trendRows.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-[12px] text-muted">No prediction data yet — waiting for computation workers...</td></tr>
                  )}
                  {trendRows.map((row) => (
                    <tr key={row.prediction} className="border-b border-border last:border-b-0 hover:bg-surface transition-colors">
                      <td className="px-4 py-3 text-[12px] font-medium text-navy">{row.prediction}</td>
                      <td className="px-4 py-3"><DirectionIcon direction={row.direction} /></td>
                      <td className={cn(
                        "px-4 py-3 text-[12px] font-semibold",
                        row.direction === "up" && "text-red-500",
                        row.direction === "down" && "text-green-600",
                        row.direction === "flat" && "text-gray-500",
                      )}>{row.change}</td>
                      <td className="px-4 py-3 text-[12px] text-navy">{row.confidence}</td>
                      <td className="px-4 py-3 text-[12px] text-muted">{row.updated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[280px] shrink-0 flex flex-col gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-[13px] font-semibold text-navy mb-3">Signal Statistics</h3>
            <div className="space-y-3">
              {trendStats.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[11px] text-muted">{s.label}</span>
                  {s.accent ? (
                    <span className="flex items-center gap-1 text-[12px] font-semibold text-red-500">
                      <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                      {s.value}
                    </span>
                  ) : (
                    <span className="text-[12px] font-semibold text-navy">{s.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-[13px] font-semibold text-navy mb-3">Layer Breakdown</h3>
            <div className="space-y-2">
              {Array.from(new Set(timeseries.map((b) => b.layer))).sort().map((layer) => {
                const layerData = timeseries.filter((b) => b.layer === layer);
                const count = layerData.reduce((s, b) => s + b.signal_count, 0);
                const avgS = layerData.length > 0
                  ? (layerData.reduce((s, b) => s + b.avg_score, 0) / layerData.length).toFixed(2)
                  : "0";
                return (
                  <div key={layer} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LAYER_COLORS[layer] || "#6B7280" }} />
                      <span className="text-[11px] font-medium text-navy">{layer}</span>
                    </span>
                    <span className="text-[10px] text-muted">{count} signals / avg {avgS}</span>
                  </div>
                );
              })}
              {timeseries.length === 0 && (
                <p className="text-[11px] text-muted">No timeseries data yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
