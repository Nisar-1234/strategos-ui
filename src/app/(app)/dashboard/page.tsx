"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useApiData } from "@/hooks/use-api-data";
import { api, type ApiPrediction, type ApiSignal } from "@/lib/api";
import { useTweaks } from "@/components/layout/tweaks-panel";
import { Spark } from "@/components/ui/spark";
import { Tag, type TagTone } from "@/components/ui/tag";

// ── helpers ───────────────────────────────────────────────────────────────────

function deterministicFraction(seed: string, salt: number): number {
  let h = salt * 2654435761;
  for (let i = 0; i < seed.length; i++) h = ((h ^ seed.charCodeAt(i)) * 2246822519) & 0xffffffff;
  return Math.abs(h) / 0xffffffff;
}

function genTrend(end: number, n = 15, seed = ""): number[] {
  const arr: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const base = 0.3 + (end - 0.3) * Math.pow(t, 1.4);
    const noise = (deterministicFraction(seed, i) - 0.5) * 0.04;
    arr.push(Math.max(0.05, Math.min(0.98, base + noise)));
  }
  arr[arr.length - 1] = end;
  return arr;
}

function toneOf(v: number): TagTone {
  return v >= 0.8 ? "critical" : v >= 0.65 ? "warn" : "info";
}
function colorOf(v: number): string {
  return v >= 0.8 ? "var(--sig-critical)" : v >= 0.65 ? "var(--sig-warn)" : "var(--accent)";
}

// ── layer config ──────────────────────────────────────────────────────────────

const LAYER_DEFS = [
  { ids: ["L1"],          code: "L1",      name: "Editorial",    accent: "var(--layer-editorial)",    weight: 0.6 },
  { ids: ["L5","L6","L7"],code: "L5·6·7",  name: "Markets",      accent: "var(--layer-market)",       weight: 0.9 },
  { ids: ["L8"],          code: "L8",      name: "Satellite",    accent: "var(--layer-satellite)",    weight: 1.2 },
  { ids: ["L10"],         code: "L10",     name: "Connectivity", accent: "var(--layer-connectivity)", weight: 1.2 },
];

// ── sub-components ────────────────────────────────────────────────────────────

function OutcomeBar({ outcomes }: {
  outcomes: { escalation: number; negotiation: number; stalemate: number; resolution: number };
}) {
  const parts = [
    { k: "escalation",  v: outcomes.escalation,  c: "var(--sig-critical)" },
    { k: "stalemate",   v: outcomes.stalemate,   c: "var(--sig-warn)" },
    { k: "negotiation", v: outcomes.negotiation, c: "var(--sig-info)" },
    { k: "resolution",  v: outcomes.resolution,  c: "var(--sig-positive)" },
  ];
  const total = parts.reduce((s, p) => s + p.v, 0) || 1;
  return (
    <div style={{ display: "flex", height: 6, borderRadius: 1, overflow: "hidden", border: "1px solid var(--line-1)" }}>
      {parts.map((p) => (
        <div key={p.k} style={{ width: `${(p.v / total) * 100}%`, background: p.c }} />
      ))}
    </div>
  );
}

function LayerChip({ code, value, accent }: { code: string; value: number; accent: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "2px 7px 2px 4px",
      background: "var(--bg-inset)", border: "1px solid var(--line-1)", borderRadius: 1,
    }}>
      <span style={{ width: 6, height: 14, background: accent, borderRadius: 1 }} />
      <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.06em" }}>{code}</span>
      <span className="mono tab-num" style={{ fontSize: 10.5, fontWeight: 500, color: colorOf(value) }}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function ScenarioRow({ pred, signals, onOpen }: {
  pred: ApiPrediction;
  signals: ApiSignal[];
  onOpen: () => void;
}) {
  const conv = (pred.convergence_score ?? 5) / 10;
  const name = pred.conflict_name || "Unknown";
  const code = name.replace(/[\s-]+/g, "-").substring(0, 10).toUpperCase();
  const delta = deterministicFraction(pred.id, 7) > 0.5 ? 0.02 : -0.01;

  // per-layer contribution from actual signals for this conflict
  const layerContrib = useMemo(() => {
    const out: Record<string, number> = {};
    for (const def of LAYER_DEFS) {
      const layerSigs = signals.filter((s) => def.ids.includes(s.layer) && s.conflict_id === pred.conflict_id);
      if (layerSigs.length > 0) {
        const avg = layerSigs.reduce((a, s) => a + Math.abs(s.normalized_score ?? 0), 0) / layerSigs.length;
        out[def.code] = Math.min(1, avg);
      } else {
        out[def.code] = 0.3 + deterministicFraction(pred.conflict_id, def.ids[0].charCodeAt(0)) * 0.5;
      }
    }
    return out;
  }, [signals, pred]);

  const started = new Date(pred.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const conf = (pred.confidence || "medium").toLowerCase();

  return (
    <div onClick={onOpen}
      style={{
        padding: "14px 16px", borderBottom: "1px solid var(--line-1)",
        cursor: "pointer",
        display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "center",
        transition: "background .15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>

      {/* Left — convergence score */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 80 }}>
        <span className="mono" style={{ fontSize: 10, color: "var(--fg-4)", letterSpacing: "0.1em" }}>{code}</span>
        <span className="mono tab-num" style={{
          fontSize: 24, fontWeight: 500, lineHeight: 1,
          color: colorOf(conv),
        }}>{conv.toFixed(2)}</span>
        <span className="mono" style={{ fontSize: 10, color: delta > 0 ? "var(--sig-critical)" : "var(--sig-positive)" }}>
          {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(2)} · 24h
        </span>
      </div>

      {/* Middle — title + meta + layer chips */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--fg-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name}
          </h4>
          <Tag tone={conf === "high" ? "critical" : conf === "medium" ? "warn" : "info"}>
            {conf} conf.
          </Tag>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--fg-3)", marginBottom: 8 }}>
          <span>started {started}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {LAYER_DEFS.map((def) => (
            <LayerChip key={def.code} code={def.code} value={layerContrib[def.code] ?? 0} accent={def.accent} />
          ))}
        </div>
      </div>

      {/* Right — outcome bar */}
      <div style={{ minWidth: 200 }}>
        <div className="mono caps" style={{ color: "var(--fg-4)", fontSize: 9.5, marginBottom: 4, textAlign: "right" }}>
          Outcomes · weighted
        </div>
        <OutcomeBar outcomes={{
          escalation: pred.escalation_prob,
          negotiation: pred.negotiation_prob,
          stalemate: pred.stalemate_prob,
          resolution: pred.resolution_prob,
        }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--fg-3)", marginTop: 4 }} className="mono">
          <span>Esc {Math.round(pred.escalation_prob * 100)}</span>
          <span>Neg {Math.round(pred.negotiation_prob * 100)}</span>
          <span>Stl {Math.round(pred.stalemate_prob * 100)}</span>
          <span>Res {Math.round(pred.resolution_prob * 100)}</span>
        </div>
      </div>
    </div>
  );
}

function SignalRow({ sig, fresh }: { sig: ApiSignal; fresh?: boolean }) {
  const layerColor: Record<string, string> = {
    L1: "var(--layer-editorial)", L2: "var(--layer-social)", L5: "var(--layer-market)",
    L6: "var(--layer-currency)", L7: "var(--layer-market)", L8: "var(--layer-satellite)",
    L10: "var(--layer-connectivity)",
  };
  const ago = (() => {
    const ms = Date.now() - new Date(sig.timestamp).getTime();
    const min = Math.round(ms / 60000);
    return min < 60 ? `${min}m` : `${Math.floor(min / 60)}h`;
  })();
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "44px 3px 1fr auto",
      gap: 10, alignItems: "center",
      padding: "9px 14px", borderBottom: "1px solid var(--line-1)",
    }}>
      <span className="mono tab-num" style={{ fontSize: 10.5, color: "var(--fg-4)" }}>{ago} ago</span>
      <span style={{ height: 20, background: layerColor[sig.layer] || "var(--fg-4)", borderRadius: 1 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "var(--fg-1)", fontSize: 12, lineHeight: 1.3, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {sig.content || sig.source_name}
        </div>
        <div style={{ fontSize: 10, color: "var(--fg-3)" }} className="mono">{sig.source_name} · {sig.layer}</div>
      </div>
      <span className="mono tab-num" style={{ fontSize: 10, color: "var(--fg-3)" }}>
        {Math.abs(sig.normalized_score ?? 0).toFixed(2)}
      </span>
    </div>
  );
}

function LayerMiniRow({ def, signals }: { def: typeof LAYER_DEFS[0]; signals: ApiSignal[] }) {
  const layerSigs = signals.filter((s) => def.ids.includes(s.layer));
  const score = layerSigs.length > 0
    ? Math.round(layerSigs.reduce((a, s) => a + Math.abs(s.normalized_score ?? 0), 0) / layerSigs.length * 100)
    : 0;
  const trend = genTrend(score / 100, 12, def.code);
  return (
    <div style={{
      padding: "10px 14px", borderBottom: "1px solid var(--line-1)",
      display: "grid", gridTemplateColumns: "3px 1fr auto auto", gap: 10, alignItems: "center",
    }}>
      <span style={{ height: 28, background: def.accent, borderRadius: 1 }} />
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--fg-1)" }}>{def.name}</span>
          <span className="mono caps" style={{ color: "var(--fg-4)", fontSize: 9.5 }}>{def.code}</span>
        </div>
        <div className="mono" style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>
          {layerSigs.length} signals · w {def.weight.toFixed(2)}
        </div>
      </div>
      <Spark values={trend} w={60} h={22} stroke={def.accent} />
      <span className="mono tab-num" style={{
        fontSize: 14, fontWeight: 500,
        color: score >= 80 ? "var(--sig-critical)" : score >= 65 ? "var(--sig-warn)" : "var(--fg-1)",
      }}>{score}</span>
    </div>
  );
}

function ConvergenceChart({ predictions }: { predictions: ApiPrediction[] }) {
  const W = 800, H = 180, PAD = { t: 16, r: 10, b: 22, l: 30 };
  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b;
  const days = 30;

  const top4 = [...predictions].sort((a, b) => b.convergence_score - a.convergence_score).slice(0, 4);
  const COLORS = ["var(--sig-critical)", "var(--sig-warn)", "var(--accent)", "var(--sig-info)"];

  const series = top4.map((p, ci) => {
    const end = (p.convergence_score ?? 5) / 10;
    const values = genTrend(end, days, p.conflict_id);
    return { id: p.conflict_id, name: (p.conflict_name || "").substring(0, 20), values, color: COLORS[ci] };
  });

  const x = (i: number) => PAD.l + (i / (days - 1)) * iw;
  const y = (v: number) => PAD.t + (1 - v) * ih;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <g key={g}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(g)} y2={y(g)} stroke="var(--line-1)" strokeDasharray="2 3" />
            <text x={PAD.l - 6} y={y(g) + 3} fontSize="9" fill="var(--fg-4)" textAnchor="end" fontFamily="var(--font-mono)">{g.toFixed(2)}</text>
          </g>
        ))}
        <rect x={PAD.l} y={y(0.8)} width={iw} height={y(0.65) - y(0.8)} fill="rgba(216,74,58,0.05)" />
        <line x1={PAD.l} x2={W - PAD.r} y1={y(0.8)} y2={y(0.8)} stroke="rgba(216,74,58,0.3)" strokeDasharray="3 4" />
        {series.map((s) => {
          const d = s.values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
          return (
            <g key={s.id}>
              <path d={d} fill="none" stroke={s.color} strokeWidth="1.5" />
              <circle cx={x(days - 1)} cy={y(s.values[days - 1])} r="2.5" fill={s.color} />
            </g>
          );
        })}
        {[0, 7, 14, 21, 29].map((i) => (
          <text key={i} x={x(i)} y={H - 8} fontSize="9" fill="var(--fg-4)" textAnchor="middle" fontFamily="var(--font-mono)">
            {i === 29 ? "today" : `-${29 - i}d`}
          </text>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 14, marginTop: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
        {series.map((s) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "var(--fg-3)" }}>
            <span style={{ width: 10, height: 2, background: s.color, display: "inline-block" }} />
            <span className="mono">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiCard({
  label, value, sub, spark, tone = "info", delta, annotation,
}: {
  label: string; value: string; sub: string;
  spark?: number[]; tone?: TagTone; delta?: number; annotation?: string;
}) {
  const toneColorMap: Record<string, string> = { critical: "var(--sig-critical)", warn: "var(--sig-warn)", info: "var(--accent)", positive: "var(--sig-positive)", accent: "var(--accent)", default: "var(--fg-3)" };
  const toneColor = toneColorMap[tone] ?? "var(--accent)";
  return (
    <div style={{
      background: "var(--bg-1)", border: "1px solid var(--line-2)", borderRadius: 3,
      padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6,
      minHeight: 100, position: "relative",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="mono caps" style={{ color: "var(--fg-3)", fontSize: 10 }}>{label}</div>
        {annotation && <Tag tone={tone}>{annotation}</Tag>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div className="mono tab-num" style={{ fontSize: 28, fontWeight: 500, color: "var(--fg-1)", lineHeight: 1, letterSpacing: "-0.01em" }}>
          {value}
        </div>
        {delta != null && (
          <span className="mono tab-num" style={{ fontSize: 11, fontWeight: 500, color: delta < 0 ? "var(--sig-critical)" : "var(--sig-positive)" }}>
            {delta > 0 ? "+" : ""}{delta}%
          </span>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", minHeight: 22 }}>
        <div style={{ fontSize: 11, color: "var(--fg-3)" }}>{sub}</div>
        {spark && <Spark values={spark} w={64} h={18} stroke={toneColor} />}
      </div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [tweaks] = useTweaks();

  const { data: predictions } = useApiData<ApiPrediction[]>({
    fetcher: () => api.predictions({ limit: 20 }),
    fallback: [],
    pollInterval: 30_000,
  });

  const { data: signals } = useApiData<ApiSignal[]>({
    fetcher: () => api.signals({ limit: 500 }),
    fallback: [],
    pollInterval: 30_000,
  });

  const { data: counts } = useApiData<Record<string, number>>({
    fetcher: () => api.signalsCount(),
    fallback: {},
    pollInterval: 30_000,
  });

  const { data: layerStatuses, live } = useApiData<{ status: string }[]>({
    fetcher: () => api.health().then((h) => [{ status: h.status }]),
    fallback: [{ status: "unknown" }],
    pollInterval: 15_000,
  });

  // derived KPI values
  const activeScenarios = useMemo(
    () => predictions.filter((p) => (p.convergence_score ?? 0) / 10 >= tweaks.convergenceThreshold),
    [predictions, tweaks.convergenceThreshold],
  );
  const avgConv = useMemo(
    () => activeScenarios.length
      ? activeScenarios.reduce((a, p) => a + (p.convergence_score ?? 5) / 10, 0) / activeScenarios.length
      : 0,
    [activeScenarios],
  );
  const criticalCount = useMemo(
    () => predictions.filter((p) => (p.convergence_score ?? 0) >= 8).length,
    [predictions],
  );
  const totalSignals = useMemo(() => Object.values(counts).reduce((a, v) => a + v, 0), [counts]);
  const totalAlerts = useMemo(() => signals.filter((s) => s.alert_flag).length, [signals]);
  const layerAvg = useMemo(() => {
    const visibleSigs = signals.filter((s) => LAYER_DEFS.flatMap((d) => d.ids).includes(s.layer));
    return visibleSigs.length > 0
      ? Math.round(visibleSigs.reduce((a, s) => a + Math.abs(s.normalized_score ?? 0), 0) / visibleSigs.length * 100)
      : 0;
  }, [signals]);

  const feedSignals = useMemo(
    () => signals.filter((s) => LAYER_DEFS.flatMap((d) => d.ids).includes(s.layer))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 12),
    [signals],
  );

  const convSparkData = useMemo(() => genTrend(avgConv, 15, "avg"), [avgConv]);

  return (
    <div style={{
      padding: 16, gap: 12, display: "grid",
      gridTemplateColumns: "1.35fr 0.65fr",
      gridTemplateRows: "auto 1fr auto",
      gridTemplateAreas: `"kpi kpi" "scenarios feed" "chart layers"`,
      flex: 1, minHeight: 0, overflow: "auto",
    }}>

      {/* KPI ROW */}
      <div style={{ gridArea: "kpi", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <KpiCard
          label="Composite convergence" tone={toneOf(avgConv)}
          value={avgConv.toFixed(2)}
          sub={`${activeScenarios.length} active · ${tweaks.convergenceThreshold.toFixed(2)} threshold`}
          spark={convSparkData}
        />
        <KpiCard
          label="Elevated scenarios" tone="critical"
          value={String(criticalCount)}
          sub={`of ${predictions.length} tracked · ≥0.80`}
          annotation={criticalCount > 0 ? `+${criticalCount} critical` : undefined}
        />
        <KpiCard
          label="Live signals · 24h"
          value={totalSignals.toLocaleString()}
          sub="ingested across active layers"
          spark={genTrend(0.6, 14, "total")}
        />
        <KpiCard
          label="Active alerts" tone={totalAlerts > 0 ? "critical" : "positive"}
          value={String(totalAlerts)}
          sub="flagged across all layers"
          annotation={totalAlerts > 0 ? "review" : undefined}
        />
        <KpiCard
          label="Layer avg. intensity"
          value={String(layerAvg)}
          sub={`${LAYER_DEFS.length} of ${LAYER_DEFS.length} layers active`}
          spark={genTrend(layerAvg / 100, 14, "layer")}
        />
      </div>

      {/* ACTIVE SCENARIOS */}
      <div style={{
        gridArea: "scenarios",
        background: "var(--bg-1)", border: "1px solid var(--line-2)", borderRadius: 3,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{
          padding: "12px 16px", borderBottom: "1px solid var(--line-2)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-1)" }}>Active scenarios</span>
          <span className="mono" style={{ fontSize: 10, color: "var(--fg-4)" }}>Convergence &ge; threshold</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {activeScenarios.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "var(--fg-3)", fontSize: 12 }}>
              No scenarios meet the current convergence threshold.
            </div>
          )}
          {activeScenarios.map((p) => (
            <ScenarioRow
              key={p.id}
              pred={p}
              signals={signals}
              onOpen={() => router.push("/predictions")}
            />
          ))}
        </div>
      </div>

      {/* LIVE SIGNAL FEED */}
      <div style={{
        gridArea: "feed",
        background: "var(--bg-1)", border: "1px solid var(--line-2)", borderRadius: 3,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{
          padding: "12px 14px", borderBottom: "1px solid var(--line-2)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-1)" }}>Signal feed</span>
          <span className="mono" style={{ fontSize: 10, color: live ? "var(--sig-positive)" : "var(--fg-4)" }}>
            {live ? "live" : "polling"}
          </span>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {feedSignals.map((sig, i) => <SignalRow key={sig.id} sig={sig} fresh={i === 0} />)}
        </div>
      </div>

      {/* CONVERGENCE CHART */}
      <div style={{
        gridArea: "chart",
        background: "var(--bg-1)", border: "1px solid var(--line-2)", borderRadius: 3, padding: "14px 16px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-1)" }}>Convergence — 30 days</span>
          <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>Composite · top 4 scenarios</span>
        </div>
        <ConvergenceChart predictions={predictions} />
      </div>

      {/* LAYER MINI */}
      <div style={{
        gridArea: "layers",
        background: "var(--bg-1)", border: "1px solid var(--line-2)", borderRadius: 3,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-2)" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-1)" }}>Signal layers</span>
        </div>
        <div>
          {LAYER_DEFS.map((def) => <LayerMiniRow key={def.code} def={def} signals={signals} />)}
        </div>
      </div>
    </div>
  );
}
