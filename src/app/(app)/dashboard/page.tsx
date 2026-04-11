"use client";

/**
 * STRATEGOS Dashboard — redesigned for comprehensibility.
 *
 * Layout: three fixed columns
 *   Left  — active conflicts ranked by convergence score
 *   Centre — selected conflict: AI assessment + signal breakdown
 *   Right  — live signals grouped by category
 *
 * Everything auto-selects the highest-convergence conflict on load.
 * WebSocket keeps signals live without polling.
 */

import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronRightIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MinusCircleIcon,
} from "@heroicons/react/24/outline";
import {
  api,
  type ApiConflict,
  type ApiPrediction,
  type ApiLayerStatus,
  type ApiSignal,
} from "@/lib/api";
import { useApiData } from "@/hooks/use-api-data";
import { useRealtime, type RealtimeSignal } from "@/hooks/use-realtime";

// ─── helpers ──────────────────────────────────────────────────────────────────

function scoreBg(score: number) {
  if (score >= 7) return "bg-red-500";
  if (score >= 5) return "bg-amber-500";
  return "bg-green-500";
}

function severityClass(sev: string | null) {
  if (sev === "ALERT") return "bg-red-50 text-red-700 border-red-200";
  if (sev === "WATCH") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-gray-100 text-gray-500 border-gray-200";
}

const LAYER_NAME: Record<string, string> = {
  L1: "MEDIA", L2: "SOCIAL", L3: "MARITIME", L4: "AVIATION",
  L5: "COMMODITIES", L6: "FX", L7: "EQUITY", L8: "SATELLITE",
  L9: "ECONOMIC", L10: "CONNECTIVITY",
};

const SIGNAL_CATEGORIES: Array<{ key: string; layers: string[]; label: string }> = [
  { key: "energy",   layers: ["L5"],      label: "ENERGY" },
  { key: "financial",layers: ["L6","L7"], label: "FINANCIAL" },
  { key: "satellite",layers: ["L8"],      label: "SATELLITE" },
  { key: "economic", layers: ["L9"],      label: "ECONOMIC" },
  { key: "connect",  layers: ["L10"],     label: "CONNECTIVITY" },
  { key: "intel",    layers: ["L1","L2"], label: "INTELLIGENCE" },
];

function timeAgo(ts: string) {
  const diff = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

// ─── sub-components ───────────────────────────────────────────────────────────

function ConflictRow({
  conflict,
  score,
  delta,
  selected,
  onClick,
}: {
  conflict: ApiConflict;
  score: number;
  delta: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b border-border transition-colors",
        selected ? "bg-brand/8 border-l-2 border-l-brand" : "hover:bg-surface border-l-2 border-l-transparent"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={cn("text-[12px] font-semibold truncate", selected ? "text-brand" : "text-navy")}>
            {conflict.name}
          </p>
          <p className="text-[10px] text-muted mt-0.5">{conflict.region}</p>
        </div>
        <div className="flex flex-col items-end shrink-0 gap-0.5">
          <span className="text-[20px] font-bold text-navy leading-none font-mono">
            {score > 0 ? score.toFixed(1) : "—"}
          </span>
          {delta !== 0 && (
            <span className={cn("text-[10px] font-semibold", delta > 0 ? "text-red-600" : "text-green-600")}>
              {delta > 0 ? "+" : ""}{delta.toFixed(1)}
            </span>
          )}
        </div>
      </div>
      {score > 0 && (
        <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full", scoreBg(score))} style={{ width: `${score * 10}%` }} />
        </div>
      )}
    </button>
  );
}

function SignalBadge({ sig }: { sig: RealtimeSignal }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-b-0 gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-navy truncate">
          {sig.source_name.replace(/^(Polygon|NewsAPI|CloudflareRadar|IODA|AV|OXR)\//,"")}&nbsp;
          <span className="text-[10px] text-muted font-mono">{LAYER_NAME[sig.layer] ?? sig.layer}</span>
        </p>
        {sig.content && (
          <p className="text-[10px] text-muted line-clamp-1 mt-0.5">{sig.content}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase", severityClass(sig.alert_severity))}>
          {sig.alert_severity ?? "NORMAL"}
        </span>
        {sig.deviation_pct != null && sig.deviation_pct !== 0 && (
          <span className={cn("text-[9px] font-mono", sig.deviation_pct > 0 ? "text-red-600" : "text-green-600")}>
            {sig.deviation_pct > 0 ? "+" : ""}{sig.deviation_pct.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

function LayerStatusDot({ status }: { status: string }) {
  if (status === "ACTIVE")   return <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />;
  if (status === "DEGRADED") return <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />;
  return <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />;
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  // ── data fetching ──────────────────────────────────────────────────────────
  const { data: conflicts, live: conflictsLive } = useApiData<ApiConflict[]>({
    fetcher: () => api.conflicts(),
    fallback: [],
    pollInterval: 120_000,
  });

  const { data: predictions } = useApiData<ApiPrediction[]>({
    fetcher: () => api.predictions({ limit: 20 }),
    fallback: [],
    pollInterval: 60_000,
  });

  const { data: layerStatuses } = useApiData<ApiLayerStatus[]>({
    fetcher: () => api.layerStatus(),
    fallback: [],
    pollInterval: 60_000,
  });

  // ── selected conflict ──────────────────────────────────────────────────────
  const scoreMap = useMemo<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const p of predictions) m[p.conflict_id] = p.convergence_score;
    return m;
  }, [predictions]);

  const sortedConflicts = useMemo(
    () => [...conflicts].sort((a, b) => (scoreMap[b.id] ?? 0) - (scoreMap[a.id] ?? 0)),
    [conflicts, scoreMap]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId
    ? conflicts.find((c) => c.id === selectedId) ?? sortedConflicts[0] ?? null
    : sortedConflicts[0] ?? null;

  // ── WebSocket ──────────────────────────────────────────────────────────────
  const { signals: wsSignals, convergenceScore: wsScore, connected: wsConnected } =
    useRealtime(selected?.id ?? null);

  const selectedSignalConflictId = selected?.id ?? null;
  const { data: conflictSignalsRest, refresh: refreshConflictSignals } = useApiData<ApiSignal[]>({
    fetcher: () => api.conflictSignals(selectedSignalConflictId!, { limit: 50 }),
    fallback: [],
    pollInterval: 60_000,
    skip: !selectedSignalConflictId,
  });

  useEffect(() => {
    if (!selectedSignalConflictId) return;
    refreshConflictSignals();
  }, [selectedSignalConflictId, refreshConflictSignals]);

  // Latest convergence score: prefer live WS, fall back to prediction
  const liveScore = wsScore ?? (selected ? scoreMap[selected.id] ?? 0 : 0);

  // ── selected conflict prediction ───────────────────────────────────────────
  const selectedPred = useMemo(
    () => predictions.find((p) => p.conflict_id === selected?.id) ?? null,
    [predictions, selected]
  );

  // ── signal breakdown: WS for selected conflict, else REST /conflicts/{id}/signals
  const breakdownSignals = useMemo(() => {
    const cid = selected?.id;
    if (!cid) return [];
    const wsScoped = wsSignals.filter((s) => s.conflict_id === cid);
    const wsAlerts = wsScoped.filter((s) => s.alert_severity !== "NORMAL");
    const restAlerts = conflictSignalsRest.filter(
      (s) => (s.alert_severity ?? "NORMAL") !== "NORMAL",
    );
    const pick = wsAlerts.length > 0 ? wsAlerts : restAlerts;
    return pick.slice(0, 8);
  }, [wsSignals, conflictSignalsRest, selected?.id]);

  // ── group signals by category for right panel ──────────────────────────────
  const categorised = useMemo(() => {
    const all = wsSignals.slice(0, 40);
    return SIGNAL_CATEGORIES.map((cat) => ({
      ...cat,
      signals: all.filter((s) => cat.layers.includes(s.layer)).slice(0, 5),
    })).filter((cat) => cat.signals.length > 0);
  }, [wsSignals]);

  // ── offline layers count ───────────────────────────────────────────────────
  const offlineCount = layerStatuses.filter((l) => l.status === "OFFLINE").length;
  const activeCount  = layerStatuses.filter((l) => l.status === "ACTIVE").length;

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden bg-surface">

      {/* ── LEFT: conflict list ─────────────────────────────────────────── */}
      <div className="w-[220px] shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
        <div className="px-4 pt-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-muted uppercase tracking-wider">Active Conflicts</span>
            {conflictsLive && (
              <span className="flex items-center gap-1 text-[9px] text-green-600 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> LIVE
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted mt-0.5">{conflicts.length} monitored</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sortedConflicts.length === 0 && (
            <p className="text-[11px] text-muted text-center py-8">No conflicts seeded yet</p>
          )}
          {sortedConflicts.map((c) => (
            <ConflictRow
              key={c.id}
              conflict={c}
              score={scoreMap[c.id] ?? 0}
              delta={0}
              selected={selected?.id === c.id}
              onClick={() => setSelectedId(c.id)}
            />
          ))}
        </div>

        {/* layer status summary */}
        <div className="px-4 py-3 border-t border-border">
          <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-2">Signal Layers</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {layerStatuses.slice(0, 10).map((l) => (
              <div key={l.layer} className="flex items-center gap-1">
                <LayerStatusDot status={l.status} />
                <span className="text-[9px] font-mono text-muted">{l.layer}</span>
              </div>
            ))}
          </div>
          {offlineCount > 0 && (
            <p className="mt-2 text-[9px] text-red-600 font-semibold">{offlineCount} layer{offlineCount > 1 ? "s" : ""} offline</p>
          )}
          {layerStatuses.length === 0 && (
            <p className="text-[9px] text-muted">Checking layers...</p>
          )}
        </div>
      </div>

      {/* ── CENTRE: conflict assessment ─────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden border-r border-border bg-white">
        {selected ? (
          <>
            {/* header */}
            <div className="px-5 pt-4 pb-3 border-b border-border">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-[15px] font-bold text-navy">{selected.name}</h1>
                  <p className="text-[10px] text-muted mt-0.5">{selected.region} · {selected.status.toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {wsConnected && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-[9px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> WS
                    </span>
                  )}
                  <div className={cn(
                    "px-3 py-1.5 rounded-lg text-center",
                    liveScore >= 7 ? "bg-red-50 border border-red-200" :
                    liveScore >= 5 ? "bg-amber-50 border border-amber-200" :
                    "bg-green-50 border border-green-200"
                  )}>
                    <p className="text-[9px] font-bold text-muted uppercase tracking-wider">Convergence</p>
                    <p className={cn(
                      "text-[24px] font-bold leading-none font-mono",
                      liveScore >= 7 ? "text-red-600" : liveScore >= 5 ? "text-amber-600" : "text-green-700"
                    )}>
                      {liveScore > 0 ? liveScore.toFixed(1) : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* outcome probabilities */}
              {selectedPred && (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {[
                    { label: "Escalation", value: selectedPred.escalation_prob, color: "bg-red-400" },
                    { label: "Negotiation", value: selectedPred.negotiation_prob, color: "bg-blue-400" },
                    { label: "Stalemate", value: selectedPred.stalemate_prob, color: "bg-gray-400" },
                    { label: "Resolution", value: selectedPred.resolution_prob, color: "bg-green-400" },
                  ].map((outcome) => (
                    <div key={outcome.label}>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-[9px] text-muted">{outcome.label}</span>
                        <span className="text-[10px] font-semibold font-mono text-navy">
                          {Math.round(outcome.value * 100)}%
                        </span>
                      </div>
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", outcome.color)} style={{ width: `${outcome.value * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* signal breakdown */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-3">Signal Breakdown</p>

              {breakdownSignals.length === 0 ? (
                <div className="text-center py-10">
                  <SignalIcon className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                  <p className="text-[12px] text-muted">Waiting for signal data</p>
                  <p className="text-[10px] text-muted mt-1">
                    {activeCount > 0 ? `${activeCount} layer${activeCount > 1 ? "s" : ""} active — signals will appear as ingestion runs` : "Start Celery workers to begin ingestion"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {breakdownSignals.map((sig) => (
                    <div key={sig.id} className={cn(
                      "flex items-start gap-3 p-2.5 rounded-lg border",
                      sig.alert_severity === "ALERT"
                        ? "bg-red-50 border-red-200"
                        : sig.alert_severity === "WATCH"
                        ? "bg-amber-50 border-amber-200"
                        : "bg-surface border-border"
                    )}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={cn(
                            "text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase",
                            severityClass(sig.alert_severity)
                          )}>
                            {sig.alert_severity ?? "NORMAL"}
                          </span>
                          <span className="text-[10px] text-muted font-mono">{LAYER_NAME[sig.layer] ?? sig.layer}</span>
                          <span className="text-[10px] text-muted ml-auto">{timeAgo(sig.timestamp)}</span>
                        </div>
                        <p className="text-[11px] text-navy font-medium truncate">
                          {sig.source_name.replace(/^(Polygon|NewsAPI|CloudflareRadar|IODA|AV|OXR)\//, "")}
                        </p>
                        {sig.content && (
                          <p className="text-[10px] text-muted mt-0.5 line-clamp-2">{sig.content}</p>
                        )}
                      </div>
                      {sig.deviation_pct != null && sig.deviation_pct !== 0 && (
                        <div className="text-right shrink-0">
                          <span className={cn(
                            "text-[11px] font-semibold font-mono",
                            sig.deviation_pct > 0 ? "text-red-600" : "text-green-600"
                          )}>
                            {sig.deviation_pct > 0 ? "+" : ""}{sig.deviation_pct.toFixed(1)}%
                          </span>
                          <p className="text-[9px] text-muted">vs 30d</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* description / context */}
              {selected.description && (
                <div className="mt-5 pt-4 border-t border-border">
                  <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-2">Context</p>
                  <p className="text-[11px] text-muted leading-relaxed">{selected.description}</p>
                </div>
              )}
            </div>

            {/* action buttons */}
            <div className="px-5 py-3 border-t border-border flex gap-2">
              <a
                href={`/analysis/ai-chat?conflict=${selected.id}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-brand text-white text-[11px] font-semibold rounded-lg hover:bg-brand/90 transition-colors"
              >
                Ask AI Chat
                <ChevronRightIcon className="w-3 h-3" />
              </a>
              <a
                href={`/analysis/game-theory?conflict=${selected.id}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-surface border border-border text-navy text-[11px] font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Game Theory
                <ChevronRightIcon className="w-3 h-3" />
              </a>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[12px] text-muted">No conflicts loaded — check API connection</p>
          </div>
        )}
      </div>

      {/* ── RIGHT: live signals by category ─────────────────────────────── */}
      <div className="w-[260px] shrink-0 flex flex-col overflow-hidden bg-card">
        <div className="px-4 pt-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-muted uppercase tracking-wider">Live Signals</span>
            <div className="flex items-center gap-1.5">
              {wsConnected
                ? <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
                : <MinusCircleIcon className="w-3.5 h-3.5 text-amber-400" />}
              <span className={cn("text-[9px] font-bold", wsConnected ? "text-green-600" : "text-amber-500")}>
                {wsConnected ? "LIVE" : "POLLING"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {categorised.length === 0 ? (
            <div className="text-center py-12">
              <ExclamationTriangleIcon className="w-7 h-7 text-gray-200 mx-auto mb-2" />
              <p className="text-[11px] text-muted px-4">
                Signal workers not yet running. Start Celery to see live data here.
              </p>
            </div>
          ) : (
            categorised.map((cat) => (
              <div key={cat.key} className="border-b border-border last:border-b-0">
                <div className="px-4 py-2 bg-surface">
                  <span className="text-[9px] font-bold text-muted uppercase tracking-wider">{cat.label}</span>
                </div>
                <div className="px-4 py-1">
                  {cat.signals.map((sig) => (
                    <SignalBadge key={sig.id} sig={sig} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* platform stats footer */}
        <div className="px-4 py-3 border-t border-border">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[16px] font-bold text-navy leading-none">{conflicts.length}</p>
              <p className="text-[8px] text-muted uppercase mt-0.5">Conflicts</p>
            </div>
            <div>
              <p className="text-[16px] font-bold text-navy leading-none">{activeCount}</p>
              <p className="text-[8px] text-muted uppercase mt-0.5">Layers On</p>
            </div>
            <div>
              <p className={cn("text-[16px] font-bold leading-none", offlineCount > 0 ? "text-red-500" : "text-navy")}>
                {offlineCount}
              </p>
              <p className="text-[8px] text-muted uppercase mt-0.5">Offline</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
