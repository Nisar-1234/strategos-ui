"use client";

import { useState, useMemo } from "react";
import { api, ApiSignal } from "@/lib/api";
import { useApiData } from "@/hooks/use-api-data";
import { Spark } from "@/components/ui/spark";
import { Tag, TagTone } from "@/components/ui/tag";

/* ─── Panel wrapper ─────────────────────────────────────────────────── */

interface PanelProps {
  title: string;
  kicker?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
  right?: React.ReactNode;
}

function Panel({ title, kicker, children, style, bodyStyle, right }: PanelProps) {
  return (
    <div style={{
      background: "var(--bg-1)",
      border: "1px solid var(--line-2)",
      borderRadius: 3,
      display: "flex",
      flexDirection: "column",
      ...style,
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        borderBottom: "1px solid var(--line-1)",
      }}>
        <div>
          <span className="mono caps" style={{ fontSize: 9.5, color: "var(--fg-4)", letterSpacing: "0.14em" }}>
            {kicker}
          </span>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-1)", marginTop: kicker ? 2 : 0 }}>
            {title}
          </div>
        </div>
        {right}
      </div>
      <div style={{ flex: 1, padding: "14px", ...bodyStyle }}>{children}</div>
    </div>
  );
}

/* ─── Layer group definitions ───────────────────────────────────────── */

interface LayerGroup {
  code: string;
  layers: string[];
  name: string;
  accent: string;
  weight: number;
  desc: string;
}

const LAYER_GROUPS: LayerGroup[] = [
  {
    code: "L1",
    layers: ["L1"],
    name: "Editorial",
    accent: "var(--layer-editorial)",
    weight: 0.6,
    desc: "GDELT + NewsAPI editorial signal ingestion — tone, framing, geopolitical salience",
  },
  {
    code: "L5·6·7",
    layers: ["L5", "L6", "L7"],
    name: "Market",
    accent: "var(--layer-market)",
    weight: 0.9,
    desc: "Gold / Oil / FX volatility / Defence equities + VIX — market-derived conflict pricing",
  },
  {
    code: "L8",
    layers: ["L8"],
    name: "Satellite",
    accent: "var(--layer-satellite)",
    weight: 1.2,
    desc: "NASA FIRMS thermal + VIIRS nighttime lights — ground-truth activity impossible to fabricate",
  },
  {
    code: "L10",
    layers: ["L10"],
    name: "Connectivity",
    accent: "var(--layer-connectivity)",
    weight: 1.2,
    desc: "Cloudflare Radar + IODA — internet disruption as proxy for kinetic and political pressure",
  },
];

/* ─── Layer stat helpers ────────────────────────────────────────────── */

interface LayerStats {
  count: number;
  avgScore: number;
  status: "active" | "stale" | "offline";
  ageSec: number;
  throughput24h: number;
}

function layerStats(signals: ApiSignal[], layers: string[]): LayerStats {
  const sigs = signals.filter((s) => layers.includes(s.layer));
  const count = sigs.length;
  const avgScore =
    count > 0 ? sigs.reduce((acc, s) => acc + (s.normalized_score ?? 0), 0) / count : 0;
  const latestTs =
    count > 0 ? Math.max(...sigs.map((s) => new Date(s.timestamp).getTime())) : 0;
  const ageSec = latestTs ? (Date.now() - latestTs) / 1000 : 99999;
  const status: LayerStats["status"] =
    ageSec < 600 ? "active" : ageSec < 3600 ? "stale" : "offline";
  const cutoff24h = Date.now() - 24 * 60 * 60 * 1000;
  const throughput24h = sigs.filter(
    (s) => new Date(s.timestamp).getTime() > cutoff24h,
  ).length;
  return { count, avgScore, status, ageSec, throughput24h };
}

function sparkValues(signals: ApiSignal[], layers: string[]): number[] {
  const sigs = signals
    .filter((s) => layers.includes(s.layer) && s.normalized_score != null)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const vals = sigs.map((s) => s.normalized_score as number);
  return vals.slice(-28);
}

function statusTone(status: "active" | "stale" | "offline"): TagTone {
  if (status === "active") return "positive";
  if (status === "stale") return "warn";
  return "critical";
}

function freshnessLabel(ageSec: number, status: "active" | "stale" | "offline"): string {
  if (status === "active") return "<=60s";
  if (ageSec < 3600) return `${Math.round(ageSec / 60)}m`;
  return `${Math.round(ageSec / 3600)}h`;
}

/* ─── Convergence history synthetic data ────────────────────────────── */

function genHistoryData(): {
  composite: number[];
  editorial: number[];
  market: number[];
  shipping: number[];
  connectivity: number[];
} {
  const N = 48;
  const composite: number[] = [];
  const editorial: number[] = [];
  const market: number[] = [];
  const shipping: number[] = [];
  const connectivity: number[] = [];

  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const c =
      0.45 + Math.pow(t, 1.2) * 0.4 + Math.sin(t * Math.PI * 5.3) * 0.06;
    composite.push(Math.min(1, Math.max(0, c)));
    editorial.push(Math.min(1, Math.max(0, c - 0.08 + Math.sin(t * 7.1) * 0.05)));
    market.push(Math.min(1, Math.max(0, c + 0.05 + Math.sin(t * 4.7) * 0.07)));
    shipping.push(Math.min(1, Math.max(0, c - 0.12 + Math.sin(t * 3.2) * 0.04)));
    connectivity.push(Math.min(1, Math.max(0, c + 0.03 + Math.sin(t * 6.9) * 0.06)));
  }
  return { composite, editorial, market, shipping, connectivity };
}

/* ─── SVG History Chart ──────────────────────────────────────────────── */

const W = 560;
const H = 200;
const PAD = { t: 12, r: 10, b: 28, l: 34 };
const CW = W - PAD.l - PAD.r;
const CH = H - PAD.t - PAD.b;

function toSvgPoints(values: number[]): string {
  return values
    .map((v, i) => {
      const x = PAD.l + (i / (values.length - 1)) * CW;
      const y = PAD.t + (1 - v) * CH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function HistoryChart({ data }: { data: ReturnType<typeof genHistoryData> }) {
  const yLabels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const xLabels: { label: string; idx: number }[] = [
    { label: "-14d", idx: 0 },
    { label: "-10d", idx: 13 },
    { label: "-7d", idx: 20 },
    { label: "-3d", idx: 35 },
    { label: "now", idx: 47 },
  ];

  const series: {
    key: keyof typeof data;
    color: string;
    label: string;
    strokeWidth: number;
    dash?: string;
  }[] = [
    { key: "composite", color: "var(--accent)", label: "Composite", strokeWidth: 2 },
    { key: "editorial", color: "var(--layer-editorial)", label: "Editorial", strokeWidth: 1.2 },
    { key: "market", color: "var(--layer-market)", label: "Market", strokeWidth: 1.2 },
    { key: "shipping", color: "var(--layer-shipping)", label: "Shipping (P2)", strokeWidth: 1.2, dash: "4 3" },
    { key: "connectivity", color: "var(--layer-connectivity)", label: "Connectivity", strokeWidth: 1.2 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
        {/* Warn zone 0.65–0.80 */}
        <rect
          x={PAD.l}
          y={PAD.t + (1 - 0.8) * CH}
          width={CW}
          height={(0.8 - 0.65) * CH}
          fill="rgba(216,161,58,0.05)"
        />
        {/* Critical zone 0.80–1.0 */}
        <rect
          x={PAD.l}
          y={PAD.t}
          width={CW}
          height={(1 - 0.8) * CH}
          fill="rgba(216,74,58,0.04)"
        />
        {/* Y gridlines + labels */}
        {yLabels.map((v) => {
          const y = PAD.t + (1 - v) * CH;
          return (
            <g key={v}>
              <line
                x1={PAD.l}
                y1={y}
                x2={PAD.l + CW}
                y2={y}
                stroke="var(--line-1)"
                strokeWidth={1}
                strokeDasharray="3 4"
              />
              <text
                x={PAD.l - 4}
                y={y + 3.5}
                textAnchor="end"
                fontSize={8.5}
                fill="var(--fg-4)"
                fontFamily="var(--font-mono)"
              >
                {v.toFixed(1)}
              </text>
            </g>
          );
        })}
        {/* X axis labels */}
        {xLabels.map(({ label, idx }) => {
          const x = PAD.l + (idx / 47) * CW;
          return (
            <text
              key={label}
              x={x}
              y={H - 6}
              textAnchor="middle"
              fontSize={8.5}
              fill="var(--fg-4)"
              fontFamily="var(--font-mono)"
            >
              {label}
            </text>
          );
        })}
        {/* Series lines */}
        {series.map((s) => (
          <polyline
            key={s.key}
            points={toSvgPoints(data[s.key])}
            fill="none"
            stroke={s.color}
            strokeWidth={s.strokeWidth}
            strokeDasharray={s.dash}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      {/* Legend */}
      <div style={{ display: "flex", gap: 16, paddingLeft: PAD.l, flexWrap: "wrap" }}>
        {series.map((s) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <svg width={18} height={8}>
              <line
                x1={0}
                y1={4}
                x2={18}
                y2={4}
                stroke={s.color}
                strokeWidth={s.strokeWidth + 0.5}
                strokeDasharray={s.dash}
              />
            </svg>
            <span className="mono" style={{ fontSize: 9, color: "var(--fg-3)" }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Weights Bar ────────────────────────────────────────────────────── */

function WeightsBar() {
  const total = LAYER_GROUPS.reduce((acc, g) => acc + g.weight, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", height: 24, borderRadius: 2, overflow: "hidden" }}>
        {LAYER_GROUPS.map((g) => (
          <div
            key={g.code}
            title={`${g.code} — weight ${g.weight}`}
            style={{
              flex: g.weight / total,
              background: g.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRight: "1px solid var(--bg-0)",
            }}
          >
            <span className="mono caps" style={{ fontSize: 8.5, color: "var(--bg-0)", opacity: 0.85 }}>
              {g.code}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 20 }}>
        {LAYER_GROUPS.map((g) => (
          <div key={g.code} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span className="mono" style={{ fontSize: 11, color: g.accent, fontWeight: 600 }}>
              {g.weight.toFixed(1)}
            </span>
            <span style={{ fontSize: 9.5, color: "var(--fg-3)" }}>{g.code}</span>
            <span style={{ fontSize: 9, color: "var(--fg-4)" }}>{g.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Audit Trail ────────────────────────────────────────────────────── */

const AUDIT_ENTRIES: { ts: string; event: string; action: string; note: string }[] = [
  {
    ts: "14:32:07",
    event: "L8 threshold breach — Gaza Strip",
    action: "ALERT_RAISED",
    note: "FIRMS thermal anomaly count +340% vs 7-day baseline",
  },
  {
    ts: "12:18:44",
    event: "L10 internet disruption — Sudan",
    action: "LAYER_DEGRADED",
    note: "IODA BGP withdrawal affecting 3 ASNs",
  },
  {
    ts: "09:55:21",
    event: "Convergence score crossed 0.75 — Syria",
    action: "SCORE_CRITICAL",
    note: "4 of 4 active layers in agreement direction",
  },
  {
    ts: "08:02:13",
    event: "L1 editorial volume spike — Yemen",
    action: "INGESTION_PEAK",
    note: "GDELT event density 3.1x 30-day moving average",
  },
  {
    ts: "06:47:58",
    event: "L6 FX volatility — Ukrainian hryvnia",
    action: "SIGNAL_HIGH",
    note: "Deviation 22.4% above model expectation",
  },
  {
    ts: "03:30:00",
    event: "Scheduled convergence recalculation",
    action: "RECALC_OK",
    note: "All 8 active layers processed — 20,519 signals aggregated",
  },
];

function AuditTrail() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {AUDIT_ENTRIES.map((e, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "60px 1fr",
            columnGap: 12,
            padding: "8px 0",
            borderBottom: i < AUDIT_ENTRIES.length - 1 ? "1px solid var(--line-1)" : "none",
          }}
        >
          <span className="mono" style={{ fontSize: 10, color: "var(--fg-4)", lineHeight: 1.6 }}>
            {e.ts}
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: "var(--fg-1)" }}>{e.event}</span>
              <span className="mono caps" style={{ fontSize: 9, color: "var(--accent)" }}>
                {e.action}
              </span>
            </div>
            <span style={{ fontSize: 10, color: "var(--fg-3)" }}>{e.note}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Layer Card ─────────────────────────────────────────────────────── */

interface LayerCardProps {
  group: LayerGroup;
  signals: ApiSignal[];
  focused: boolean;
  onToggle: () => void;
}

function LayerCard({ group, signals, focused, onToggle }: LayerCardProps) {
  const stats = layerStats(signals, group.layers);
  const spark = sparkValues(signals, group.layers);
  const tone = statusTone(stats.status);
  const freshness = freshnessLabel(stats.ageSec, stats.status);

  const sourcesLive = new Set(
    signals
      .filter((s) => group.layers.includes(s.layer))
      .map((s) => s.source_name),
  ).size;

  return (
    <div
      onClick={onToggle}
      style={{
        background: "var(--bg-2)",
        border: `1px solid ${focused ? group.accent : "var(--line-2)"}`,
        borderRadius: 4,
        padding: "14px 16px",
        cursor: "pointer",
        boxShadow: focused ? "var(--shadow-glow)" : "none",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "border-color .15s, box-shadow .15s",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span className="mono caps" style={{ fontSize: 11, color: group.accent, fontWeight: 700 }}>
            {group.code}
          </span>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{group.name}</span>
        </div>
        <Tag tone={tone}>{stats.status}</Tag>
      </div>

      {/* Score + spark */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          className="mono"
          style={{ fontSize: 32, fontWeight: 600, color: group.accent, lineHeight: 1 }}
        >
          {stats.avgScore.toFixed(2)}
        </span>
        <Spark
          values={spark.length >= 2 ? spark : [0, 0]}
          w={88}
          h={28}
          stroke={group.accent}
          fill={group.accent}
        />
      </div>

      {/* Stat cells */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px 12px",
          borderTop: "1px solid var(--line-1)",
          paddingTop: 8,
        }}
      >
        {[
          { label: "Sources live", value: String(sourcesLive) },
          { label: "Throughput", value: `${stats.throughput24h}/24h` },
          { label: "Ensemble w", value: group.weight.toFixed(1) },
          { label: "Freshness", value: freshness },
        ].map((cell) => (
          <div key={cell.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9, color: "var(--fg-4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {cell.label}
            </span>
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-2)" }}>
              {cell.value}
            </span>
          </div>
        ))}
      </div>

      {/* Desc */}
      <p style={{ fontSize: 9.5, color: "var(--fg-4)", margin: 0, lineHeight: 1.55 }}>
        {group.desc}
      </p>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function CommandCenterPage() {
  const [focusedGroup, setFocusedGroup] = useState<string | null>(null);

  const { data: signals, live } = useApiData<ApiSignal[]>({
    fetcher: () => api.signals({ limit: 500 }),
    fallback: [],
    pollInterval: 30_000,
  });

  const historyData = useMemo(() => genHistoryData(), []);

  function toggleFocus(code: string) {
    setFocusedGroup((prev) => (prev === code ? null : code));
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        background: "var(--bg-0)",
        padding: "20px 24px 32px",
        gap: 16,
      }}
    >
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span className="mono caps" style={{ fontSize: 9.5, color: "var(--fg-4)", letterSpacing: "0.14em" }}>
            Signal Intelligence
          </span>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--fg-1)", margin: 0, marginTop: 3 }}>
            Command Center
          </h1>
        </div>
        <Tag tone={live ? "positive" : "warn"}>{live ? "LIVE" : "POLLING"}</Tag>
      </div>

      {/* CSS Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateAreas: `"layers layers" "history matrix" "weights audit"`,
          gap: 16,
        }}
      >
        {/* ── LAYERS strip ── */}
        <div
          style={{
            gridArea: "layers",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          {LAYER_GROUPS.map((group) => (
            <LayerCard
              key={group.code}
              group={group}
              signals={signals}
              focused={focusedGroup === group.code}
              onToggle={() => toggleFocus(group.code)}
            />
          ))}
        </div>

        {/* ── HISTORY ── */}
        <Panel
          kicker="14-day lookback · 6h bins"
          title="Convergence History"
          style={{ gridArea: "history", minHeight: 0 }}
          bodyStyle={{ padding: "14px 14px 10px", overflow: "auto" }}
        >
          <HistoryChart data={historyData} />
        </Panel>

        {/* ── MATRIX ── */}
        <Panel
          kicker="Cross-layer"
          title="Correlation Matrix"
          style={{ gridArea: "matrix" }}
          bodyStyle={{ padding: "12px 14px", overflow: "auto" }}
        >
          <CorrelationMatrix signals={signals} />
        </Panel>

        {/* ── WEIGHTS ── */}
        <Panel
          kicker="Ensemble"
          title="Layer Weights"
          style={{ gridArea: "weights" }}
        >
          <WeightsBar />
        </Panel>

        {/* ── AUDIT ── */}
        <Panel
          kicker="System audit"
          title="Recent Events"
          style={{ gridArea: "audit" }}
          bodyStyle={{ padding: "0 14px 14px", maxHeight: 300, overflow: "auto" }}
        >
          <AuditTrail />
        </Panel>
      </div>
    </div>
  );
}

/* ─── Correlation Matrix (kept from original, uses CSS vars) ─────────── */

const MATRIX_LAYERS = ["L1", "L2", "L5", "L6", "L7", "L8", "L10"];

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

function CorrelationMatrix({ signals }: { signals: ApiSignal[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ padding: "4px 6px", width: 28 }} />
            {MATRIX_LAYERS.map((l) => (
              <th
                key={l}
                className="mono"
                style={{ padding: "4px 5px", fontSize: 9, fontWeight: 600, color: "var(--fg-3)", textAlign: "center" }}
              >
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MATRIX_LAYERS.map((row) => (
            <tr key={row}>
              <td
                className="mono"
                style={{ padding: "3px 6px", fontSize: 9, fontWeight: 600, color: "var(--fg-3)", whiteSpace: "nowrap" }}
              >
                {row}
              </td>
              {MATRIX_LAYERS.map((col) => {
                const corr = row === col ? 1.0 : correlation(signals, row, col);
                const absC = Math.abs(corr);
                const isDiag = row === col;
                const bg = isDiag
                  ? "var(--bg-inset)"
                  : corr > 0.3
                    ? `rgba(74,157,107,${(absC * 0.55).toFixed(2)})`
                    : corr < -0.3
                      ? `rgba(216,74,58,${(absC * 0.55).toFixed(2)})`
                      : `rgba(107,140,174,${(absC * 0.25).toFixed(2)})`;
                const textColor = isDiag
                  ? "var(--accent)"
                  : corr > 0.3
                    ? "var(--sig-positive)"
                    : corr < -0.3
                      ? "var(--sig-critical)"
                      : "var(--fg-3)";
                return (
                  <td
                    key={col}
                    style={{
                      padding: "3px 4px",
                      textAlign: "center",
                      background: bg,
                      border: "1px solid var(--line-1)",
                    }}
                  >
                    <span
                      className="mono"
                      style={{ fontSize: 9, fontWeight: isDiag ? 600 : 500, color: textColor }}
                    >
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
  );
}
