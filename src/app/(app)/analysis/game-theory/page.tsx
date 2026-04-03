"use client";

import { useState, Fragment, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  PlayIcon,
  InformationCircleIcon,
  ChevronRightIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { api, type ApiGameTheoryResult, type ApiConflict, type ApiPrediction } from "@/lib/api";
import { useApiData } from "@/hooks/use-api-data";
import { ExportButton } from "@/components/export/ExportButton";
import type { ExportPayload } from "@/lib/export/types";

type CellKind = "red" | "green" | "neutral";

const cellStyles: Record<CellKind, string> = {
  red: "bg-red-50 text-red-700 border-red-200",
  green: "bg-green-50 text-green-700 border-green-200",
  neutral: "bg-surface text-navy border-border",
};

const priorityBadge: Record<string, string> = {
  HIGH: "bg-red-50 text-red-600 border border-red-200",
  MEDIUM: "bg-amber-50 text-amber-700 border border-amber-200",
  MED: "bg-amber-50 text-amber-700 border border-amber-200",
  LOW: "bg-green-50 text-green-700 border border-green-200",
};

export default function GameTheoryPage() {
  const { data: conflicts, live: conflictsLive } = useApiData<ApiConflict[]>({
    fetcher: () => api.conflicts(),
    fallback: [],
    pollInterval: 120_000,
  });

  const { data: predictions } = useApiData<ApiPrediction[]>({
    fetcher: () => api.predictions({ limit: 100 }),
    fallback: [],
    pollInterval: 60_000,
  });

  const { data: signalCounts } = useApiData<Record<string, number>>({
    fetcher: () => api.signalsCount(),
    fallback: {},
    pollInterval: 60_000,
  });

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [apiResult, setApiResult] = useState<ApiGameTheoryResult | null>(null);
  const [running, setRunning] = useState(false);
  const [live, setLive] = useState(false);

  const totalSignals = useMemo(() => Object.values(signalCounts).reduce((a, b) => a + b, 0), [signalCounts]);

  const predMap = useMemo(() => {
    const m = new Map<string, ApiPrediction>();
    for (const p of predictions) m.set(p.conflict_id, p);
    return m;
  }, [predictions]);

  const selectedConflict = conflicts[selectedIdx] ?? null;

  const pred = selectedConflict ? predMap.get(selectedConflict.id) : undefined;

  const runAnalysis = useCallback(async () => {
    if (!selectedConflict) return;
    setRunning(true);
    try {
      const result = await api.gameTheory(selectedConflict.id);
      setApiResult(result);
      setLive(true);
    } catch {
      setLive(false);
    } finally {
      setRunning(false);
    }
  }, [selectedConflict]);

  const displayMatrix = apiResult
    ? apiResult.payoff_matrix.map((row) =>
        row.map((v) => ({
          v: `(${v > 0 ? "+" : ""}${v})`,
          kind: (v < 0 ? "red" : v > 0 ? "green" : "neutral") as CellKind,
        })),
      )
    : null;

  const displayCols = apiResult?.actor_labels?.actor_b?.slice(0, 3) || ["Resist", "Negotiate", "Concede"];
  const displayRows = apiResult?.actor_labels?.actor_a?.slice(0, 3) || ["Escalate", "Negotiate", "Maintain"];
  const displayStrategy = apiResult?.recommended_strategy || (pred ? getStrategyFromPred(pred) : "—");
  const displayRationale = apiResult?.rationale || "Run analysis to compute Nash equilibria from live signal data.";
  const displayConfidence = apiResult?.confidence || pred?.confidence || "—";
  const nashEquilibria = apiResult?.nash_equilibria || [];

  const outcomes = useMemo(() => {
    if (pred) {
      return [
        { name: "Escalation", pct: Math.round(pred.escalation_prob * 100), color: "bg-danger" },
        { name: "Negotiation", pct: Math.round(pred.negotiation_prob * 100), color: "bg-brand" },
        { name: "Stalemate", pct: Math.round(pred.stalemate_prob * 100), color: "bg-amber-500" },
        { name: "Resolution", pct: Math.round(pred.resolution_prob * 100), color: "bg-success" },
      ].sort((a, b) => b.pct - a.pct);
    }
    return [];
  }, [pred]);

  const confValue = pred ? Math.min(99, pred.convergence_score * 10) : 0;
  const DASH = 2 * Math.PI * 15.9155;
  const confOffset = DASH * (1 - confValue / 100);

  const actions = useMemo(() => {
    if (!pred) return [];
    const list: { priority: string; label: string }[] = [];
    const probs = [
      { key: "escalation", v: pred.escalation_prob },
      { key: "negotiation", v: pred.negotiation_prob },
      { key: "stalemate", v: pred.stalemate_prob },
      { key: "resolution", v: pred.resolution_prob },
    ].sort((a, b) => b.v - a.v);

    if (probs[0].key === "escalation") {
      list.push({ priority: "HIGH", label: "Activate diplomatic back-channels immediately" });
      list.push({ priority: "MEDIUM", label: "Monitor military posture changes in region" });
    } else if (probs[0].key === "negotiation") {
      list.push({ priority: "HIGH", label: "Support ongoing negotiation tracks" });
      list.push({ priority: "MEDIUM", label: "Prepare ceasefire implementation framework" });
    } else {
      list.push({ priority: "MEDIUM", label: "Continue monitoring signal evolution" });
    }
    list.push({ priority: "LOW", label: "Prepare contingency analysis for alternative outcomes" });
    return list;
  }, [pred]);

  const exportPayload = useMemo((): ExportPayload => ({
    title: "STRATEGOS — Game Theory Analysis",
    subtitle: selectedConflict ? `Conflict: ${selectedConflict.name}` : undefined,
    generated: new Date().toUTCString(),
    stats: [
      { label: "Recommended Strategy", value: displayStrategy },
      { label: "Model Confidence",     value: confValue > 0 ? `${confValue.toFixed(1)}%` : "—" },
      { label: "Total Signals",        value: totalSignals },
      { label: "Nash Equilibrium",     value: nashEquilibria[0] ? `(${nashEquilibria[0].actor_a}, ${nashEquilibria[0].actor_b})` : "—" },
    ],
    tables: [
      ...(outcomes.length > 0 ? [{
        title: "Outcome Probability Distribution",
        headers: ["Outcome", "Probability %"],
        rows: outcomes.map((o) => [o.name, o.pct]),
      }] : []),
      ...(actions.length > 0 ? [{
        title: "Recommended Actions",
        headers: ["#", "Priority", "Action"],
        rows: actions.map((a, i) => [i + 1, a.priority, a.label]),
      }] : []),
      ...(displayMatrix ? [{
        title: "Strategic Payoff Matrix",
        headers: ["Strategy / Actor B →", ...displayCols],
        rows: displayMatrix.map((row, ri) => [displayRows[ri] ?? `R${ri}`, ...row.map((c) => c.v)]),
      }] : []),
    ],
    notes: displayRationale,
  }), [selectedConflict, displayStrategy, confValue, totalSignals, nashEquilibria, outcomes, actions, displayMatrix, displayCols, displayRows, displayRationale]);

  const treeBranches = useMemo(() => {
    if (!pred) return [];
    const esc = Math.round(pred.escalation_prob * 100);
    const neg = Math.round(pred.negotiation_prob * 100);
    const stl = Math.round(pred.stalemate_prob * 100);
    const res = Math.round(pred.resolution_prob * 100);
    return [
      {
        label: "Diplomatic Path",
        pct: `${neg + res}%`,
        bg: "bg-blue-50 border-blue-300",
        children: [
          { label: "Negotiation", pct: `${neg}%`, leaf: { label: "Settlement", prob: `${neg}%`, payoff: "+2.0", color: "bg-green-50", border: "border-green-300", text: "text-green-700" } },
          { label: "Resolution", pct: `${res}%`, leaf: { label: "Peace", prob: `${res}%`, payoff: "+3.0", color: "bg-green-50", border: "border-green-300", text: "text-green-700" } },
        ],
      },
      {
        label: "Military Path",
        pct: `${esc + stl}%`,
        bg: "bg-red-50 border-red-300",
        children: [
          { label: "Escalation", pct: `${esc}%`, leaf: { label: "Conflict", prob: `${esc}%`, payoff: "-3.0", color: "bg-red-50", border: "border-red-300", text: "text-red-700" } },
          { label: "Stalemate", pct: `${stl}%`, leaf: { label: "Frozen", prob: `${stl}%`, payoff: "-0.5", color: "bg-gray-50", border: "border-gray-300", text: "text-gray-600" } },
        ],
      },
    ];
  }, [pred]);

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="flex items-center gap-1.5 text-[10px] text-muted mb-2">
        <span>Home</span>
        <ChevronRightIcon className="w-2.5 h-2.5" />
        <span>Analysis</span>
        <ChevronRightIcon className="w-2.5 h-2.5" />
        <span className="text-navy font-medium">Game Theory</span>
      </div>

      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-bold leading-tight">
            <span className="text-brand">Game Theory Analysis</span>
            {selectedConflict && <span className="text-navy"> — {selectedConflict.name}</span>}
          </h1>
          {live ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-[9px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> LIVE
            </span>
          ) : conflictsLive ? (
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-[9px] font-bold">DATA READY</span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 text-[9px] font-bold">CONNECTING...</span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {conflicts.length > 0 && (
            <div className="relative">
              <select value={selectedIdx} onChange={(e) => { setSelectedIdx(Number(e.target.value)); setApiResult(null); setLive(false); }}
                className="appearance-none border border-border rounded-lg pl-3 pr-8 py-2 text-[12px] text-navy bg-card cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand">
                {conflicts.map((c, i) => (
                  <option key={c.id} value={i}>{c.name}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
          <ExportButton payload={exportPayload} />
          <button onClick={runAnalysis} disabled={running || !selectedConflict}
            className="flex items-center gap-1.5 bg-brand text-white px-4 py-2 rounded-lg text-[12px] font-medium hover:bg-brand-mid transition-colors disabled:opacity-50">
            {running ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PlayIcon className="w-4 h-4" />}
            {running ? "Computing..." : "Run Analysis"}
          </button>
        </div>
      </div>

      {conflicts.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-[13px] text-muted">
          Waiting for conflict data from API...
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Left column */}
          <div className="flex-[55] min-w-0 flex flex-col gap-4">
            {/* Payoff Matrix */}
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center gap-1.5 mb-1">
                <h3 className="text-[13px] font-semibold text-navy">Strategic Payoff Matrix</h3>
                <InformationCircleIcon className="w-4 h-4 text-muted" />
              </div>
              <p className="text-[10px] text-muted mb-4 leading-relaxed">
                {displayMatrix ? "Live payoff analysis computed from real signal data." : "Click \"Run Analysis\" to compute from live signals."}
              </p>

              {displayMatrix ? (
                <>
                  <div className={cn("grid gap-1.5 max-w-[520px]", `grid-cols-[72px_repeat(${displayCols.length},1fr)]`)}>
                    <div />
                    {displayCols.map((c) => (
                      <div key={c} className="text-center text-[10px] font-semibold text-muted py-1">{c}</div>
                    ))}
                    {displayMatrix.map((row, ri) => (
                      <Fragment key={displayRows[ri] || ri}>
                        <div className="flex items-center text-[10px] font-semibold text-muted pr-2">{displayRows[ri] || `R${ri}`}</div>
                        {row.map((cell, ci) => (
                          <div key={`${ri}-${ci}`} className={cn("relative text-center py-3 rounded-lg text-[13px] font-semibold border", cellStyles[cell.kind])}>
                            {cell.v}
                          </div>
                        ))}
                      </Fragment>
                    ))}
                  </div>
                  <div className="mt-4 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 max-w-[520px]">
                    <InformationCircleIcon className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                    <div className="text-[11px] text-navy leading-relaxed">
                      <strong>
                        Nash Equilibrium: ({nashEquilibria[0]?.actor_a || "—"}, {nashEquilibria[0]?.actor_b || "—"}) — {displayConfidence} confidence.
                      </strong>{" "}
                      {displayRationale}
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-40 flex items-center justify-center text-[11px] text-muted border border-dashed border-border rounded-lg">
                  Matrix will appear after running analysis
                </div>
              )}
            </div>

            {/* Recommended Actions */}
            {actions.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-[13px] font-semibold text-navy mb-3">Recommended Actions</h3>
                <div className="space-y-3">
                  {actions.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 border border-border rounded-lg p-3">
                      <span className="text-[11px] font-bold text-navy w-4 shrink-0">{i + 1}.</span>
                      <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider", priorityBadge[a.priority] || priorityBadge.LOW)}>
                        {a.priority}
                      </span>
                      <span className="text-[11px] text-navy flex-1">{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strategy summary */}
            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="text-[13px] font-semibold text-navy mb-3">Strategy Summary</h3>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[11px] text-muted">Recommended:</span>
                <span className="text-[13px] font-bold text-navy">{displayStrategy}</span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">{displayRationale}</p>
            </div>
          </div>

          {/* Right column */}
          <div className="flex-[45] min-w-0 flex flex-col gap-4">
            {/* Outcome Probabilities */}
            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="text-[13px] font-semibold text-navy mb-4">Outcome Probability Distribution</h3>
              {outcomes.length > 0 ? (
                <div className="space-y-3">
                  {outcomes.map((o) => (
                    <div key={o.name}>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-navy">{o.name}</span>
                        <span className="font-bold text-navy">{o.pct}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", o.color)} style={{ width: `${o.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted py-4 text-center">Prediction data loading...</p>
              )}
            </div>

            {/* Confidence */}
            <div className="bg-card border border-border rounded-lg p-5 flex flex-col items-center">
              <div className="relative w-[110px] h-[110px] mb-3">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#E2E8F0" strokeWidth="2.5" />
                  {confValue > 0 && (
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#1B4FD8" strokeWidth="2.5"
                      strokeDasharray={DASH} strokeDashoffset={confOffset} strokeLinecap="round" />
                  )}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[20px] font-bold text-navy">
                    {confValue > 0 ? `${confValue.toFixed(1)}%` : "—"}
                  </span>
                </div>
              </div>
              <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Model Confidence</div>
              <p className="text-[10px] text-muted text-center leading-relaxed max-w-[280px]">
                {totalSignals > 0 ? `${totalSignals.toLocaleString()} signals analyzed across all layers.` : "Signals loading..."}
              </p>
            </div>

            {/* Decision Tree */}
            {treeBranches.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-[13px] font-semibold text-navy mb-4">Decision Tree — Next 90 Days</h3>
                <div className="flex items-start gap-0">
                  <div className="flex flex-col items-center shrink-0 pt-[52px]">
                    <div className="w-[72px] h-[72px] rounded-full bg-brand-50 border-2 border-brand flex flex-col items-center justify-center">
                      <span className="text-[10px] font-semibold text-brand leading-none">Current</span>
                      <span className="text-[10px] font-semibold text-brand leading-none">State</span>
                      <span className="text-[8px] text-muted mt-0.5">Month 0</span>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center shrink-0 pt-[52px]">
                    <div className="w-6 h-px bg-border" />
                  </div>
                  <div className="flex flex-col gap-6 flex-1 min-w-0">
                    {treeBranches.map((branch, bi) => (
                      <div key={bi} className="flex items-start gap-0">
                        <div className="flex flex-col items-center shrink-0">
                          <div className={cn("border-2 rounded-lg px-2 py-1.5 text-center min-w-[80px]", branch.bg)}>
                            <div className="text-[9px] font-semibold text-navy leading-tight">{branch.label}</div>
                            <div className="text-[9px] font-bold text-muted">{branch.pct}</div>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center shrink-0 self-center">
                          <div className="w-3 h-px bg-border" />
                        </div>
                        <div className="flex flex-col gap-3 flex-1 min-w-0">
                          {branch.children.map((child, ci) => (
                            <div key={ci} className="flex items-center gap-0">
                              <div className="border border-border rounded-md px-1.5 py-1 text-center shrink-0 bg-card min-w-[68px]">
                                <div className="text-[8px] font-semibold text-navy leading-tight">{child.label}</div>
                                <div className="text-[8px] font-bold text-muted">{child.pct}</div>
                              </div>
                              <div className="w-3 h-px bg-border shrink-0" />
                              <div className={cn("rounded-lg border px-2 py-1.5 min-w-[88px]", child.leaf.color, child.leaf.border)}>
                                <div className={cn("text-[9px] font-semibold leading-tight", child.leaf.text)}>{child.leaf.label}</div>
                                <div className="text-[8px] text-muted leading-snug">P: {child.leaf.prob}</div>
                                <div className="text-[8px] text-muted leading-snug">E[V]: {child.leaf.payoff}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getStrategyFromPred(p: ApiPrediction): string {
  const probs = [
    { key: "Diplomatic Engagement", v: p.negotiation_prob + p.resolution_prob },
    { key: "Military Posture", v: p.escalation_prob },
    { key: "Status Quo", v: p.stalemate_prob },
  ];
  return probs.reduce((a, b) => (b.v > a.v ? b : a)).key;
}
