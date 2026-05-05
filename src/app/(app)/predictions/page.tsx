"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { api, type ApiPrediction, type ApiSignal, type ApiConflict } from "@/lib/api";
import { useApiData } from "@/hooks/use-api-data";
import { Tag } from "@/components/ui/tag";
import { useTweaks } from "@/components/layout/tweaks-panel";

/* ── helpers ── */

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

/* ── FilterGroup ── */

function FilterGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        className="mono caps"
        style={{ color: "var(--fg-4)", fontSize: 9.5 }}
      >
        {label}
      </span>
      <div
        style={{
          display: "inline-flex",
          background: "var(--bg-inset)",
          border: "1px solid var(--line-2)",
          borderRadius: 2,
          padding: 2,
          gap: 1,
        }}
      >
        {options.map((o) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            style={{
              padding: "4px 10px",
              fontSize: 11,
              background: value === o.v ? "var(--bg-3)" : "transparent",
              color: value === o.v ? "var(--fg-1)" : "var(--fg-3)",
              border: "none",
              borderRadius: 1,
              cursor: "pointer",
            }}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── OutcomeBar ── */

function OutcomeBar({
  escalation,
  stalemate,
  negotiation,
  resolution,
}: {
  escalation: number;
  stalemate: number;
  negotiation: number;
  resolution: number;
}) {
  const parts = [
    { label: "Esc", v: escalation,  c: "var(--sig-critical)" },
    { label: "Stl", v: stalemate,   c: "var(--sig-warn)" },
    { label: "Neg", v: negotiation, c: "var(--sig-info)" },
    { label: "Res", v: resolution,  c: "var(--sig-positive)" },
  ];
  const total = parts.reduce((s, p) => s + p.v, 1e-9);
  return (
    <div style={{ minWidth: 200 }}>
      <div
        className="mono caps"
        style={{
          color: "var(--fg-4)",
          fontSize: 9,
          marginBottom: 4,
          textAlign: "right",
        }}
      >
        Outcome weighting
      </div>
      <div
        style={{
          display: "flex",
          height: 18,
          borderRadius: 1,
          overflow: "hidden",
          border: "1px solid var(--line-1)",
        }}
      >
        {parts.map((p) => (
          <div
            key={p.label}
            style={{
              width: `${(p.v / total) * 100}%`,
              background: p.c,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              color: "var(--bg-0)",
              fontWeight: 600,
            }}
          >
            {p.v / total >= 0.2 && Math.round(p.v * 100)}
          </div>
        ))}
      </div>
      <div
        className="mono caps"
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
          fontSize: 9.5,
          color: "var(--fg-4)",
        }}
      >
        {parts.map((p) => (
          <span key={p.label}>{p.label}</span>
        ))}
      </div>
    </div>
  );
}

/* ── ScenarioCard ── */

function ScenarioCard({
  prediction,
  expanded,
  onToggle,
  relatedSignals,
}: {
  prediction: ApiPrediction;
  expanded: boolean;
  onToggle: () => void;
  relatedSignals: ApiSignal[];
}) {
  const router = useRouter();
  const convergence = prediction.convergence_score / 10;
  const bandLo = Math.max(0, convergence - 0.08);
  const bandHi = Math.min(1, convergence + 0.06);
  const toneColor =
    convergence >= 0.8
      ? "var(--sig-critical)"
      : convergence >= 0.65
      ? "var(--sig-warn)"
      : "var(--accent)";

  const confidenceTone =
    prediction.confidence === "HIGH"
      ? "critical"
      : prediction.confidence === "MED"
      ? "warn"
      : ("info" as const);

  return (
    <div
      style={{
        background: "var(--bg-1)",
        border: `1px solid ${expanded ? "var(--line-3)" : "var(--line-2)"}`,
        borderLeft: `3px solid ${toneColor}`,
        borderRadius: 3,
        boxShadow: expanded ? "var(--shadow-1)" : "none",
      }}
    >
      {/* Header row */}
      <div
        onClick={onToggle}
        style={{
          padding: "14px 18px",
          cursor: "pointer",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto auto",
          gap: 18,
          alignItems: "center",
        }}
      >
        {/* Column 1: score + code */}
        <div style={{ minWidth: 110 }}>
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: "var(--fg-4)",
              letterSpacing: "0.1em",
              marginBottom: 2,
            }}
          >
            {prediction.conflict_name || "SCN-" + prediction.id.slice(-4)}
          </div>
          <div
            className="mono"
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: toneColor,
              lineHeight: 1,
            }}
          >
            {convergence.toFixed(2)}
          </div>
          <div
            className="mono"
            style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 3 }}
          >
            band [{bandLo.toFixed(2)} · {bandHi.toFixed(2)}]
          </div>
        </div>

        {/* Column 2: title + meta */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 6,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 500,
                color: "var(--fg-1)",
              }}
            >
              {prediction.conflict_name || "Conflict scenario"}
            </h3>
            <Tag tone={confidenceTone}>
              {prediction.confidence} conf.
            </Tag>
          </div>
          <div
            style={{
              display: "flex",
              gap: 14,
              fontSize: 11,
              color: "var(--fg-3)",
            }}
          >
            <span>{prediction.conflict_id || "Unknown"}</span>
            <span>{timeAgo(prediction.created_at)}</span>
          </div>
        </div>

        {/* Column 3: outcome weighting bar */}
        <OutcomeBar
          escalation={prediction.escalation_prob}
          stalemate={prediction.stalemate_prob}
          negotiation={prediction.negotiation_prob}
          resolution={prediction.resolution_prob}
        />

        {/* Column 4: chevron */}
        <ChevronDownIcon
          style={{
            width: 14,
            height: 14,
            color: "var(--fg-3)",
            transform: expanded ? "rotate(180deg)" : "none",
            transition: "transform .15s",
            flexShrink: 0,
          }}
        />
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          style={{
            borderTop: "1px solid var(--line-1)",
            padding: "16px 18px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
          }}
        >
          {/* Left: analyst summary + outcome probability bars */}
          <div>
            <div
              className="mono caps"
              style={{ color: "var(--fg-4)", marginBottom: 8 }}
            >
              Analyst summary
            </div>
            <p
              style={{
                margin: "0 0 14px",
                fontSize: 13.5,
                lineHeight: 1.6,
                color: "var(--fg-1)",
              }}
            >
              Convergence score {convergence.toFixed(2)} with{" "}
              {prediction.confidence?.toLowerCase()} confidence. Escalation
              probability {Math.round(prediction.escalation_prob * 100)}%,
              stalemate {Math.round(prediction.stalemate_prob * 100)}%.
            </p>

            <div
              className="mono caps"
              style={{ color: "var(--fg-4)", marginBottom: 8 }}
            >
              Outcome probabilities
            </div>
            {[
              {
                label: "Escalation",
                v: prediction.escalation_prob,
                c: "var(--sig-critical)",
              },
              {
                label: "Stalemate",
                v: prediction.stalemate_prob,
                c: "var(--sig-warn)",
              },
              {
                label: "Negotiation",
                v: prediction.negotiation_prob,
                c: "var(--sig-info)",
              },
              {
                label: "Resolution",
                v: prediction.resolution_prob,
                c: "var(--sig-positive)",
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "100px 1fr 44px",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <span
                  className="mono"
                  style={{ fontSize: 11, color: "var(--fg-3)" }}
                >
                  {item.label}
                </span>
                <div
                  style={{
                    height: 6,
                    background: "var(--bg-inset)",
                    borderRadius: 1,
                    overflow: "hidden",
                    border: "1px solid var(--line-1)",
                  }}
                >
                  <div
                    style={{
                      width: `${item.v * 100}%`,
                      height: "100%",
                      background: item.c,
                    }}
                  />
                </div>
                <span
                  className="mono"
                  style={{ fontSize: 11, color: "var(--fg-2)" }}
                >
                  {(item.v * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>

          {/* Right: actions + related signals */}
          <div>
            <div
              className="mono caps"
              style={{ color: "var(--fg-4)", marginBottom: 8 }}
            >
              Actions
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button
                onClick={() =>
                  router.push(
                    `/analysis/ai-chat?scenario=${encodeURIComponent(prediction.conflict_name || prediction.conflict_id)}`
                  )
                }
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  background: "transparent",
                  border: "1px solid var(--line-3)",
                  color: "var(--accent)",
                  fontSize: 10.5,
                  cursor: "pointer",
                  borderRadius: 2,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Open in AI Chat
              </button>
              <button
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  background: "transparent",
                  border: "1px solid var(--line-2)",
                  color: "var(--fg-2)",
                  fontSize: 10.5,
                  cursor: "pointer",
                  borderRadius: 2,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Export note
              </button>
            </div>

            {relatedSignals.length > 0 && (
              <>
                <div
                  className="mono caps"
                  style={{ color: "var(--fg-4)", marginBottom: 8 }}
                >
                  Related signals
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {relatedSignals.map((sig) => (
                    <div
                      key={sig.id}
                      style={{
                        padding: "7px 10px",
                        background: "var(--bg-inset)",
                        border: "1px solid var(--line-1)",
                        borderRadius: 2,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 3,
                        }}
                      >
                        <span
                          className="mono"
                          style={{ fontSize: 10, color: "var(--accent)" }}
                        >
                          {sig.layer}
                        </span>
                        <span
                          className="mono"
                          style={{ fontSize: 10, color: "var(--fg-4)" }}
                        >
                          {timeAgo(sig.timestamp)}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11.5,
                          color: "var(--fg-2)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {sig.content || sig.source_name}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Page ── */

export default function PredictionsPage() {
  const [tweaks] = useTweaks();
  const { data: predictions, live } = useApiData<ApiPrediction[]>({
    fetcher: () => api.predictions({ limit: 50 }),
    fallback: [],
    pollInterval: 60_000,
  });

  const { data: signals } = useApiData<ApiSignal[]>({
    fetcher: () => api.signals({ limit: 200 }),
    fallback: [],
    pollInterval: 30_000,
  });

  const { data: conflicts } = useApiData<ApiConflict[]>({
    fetcher: () => api.conflicts(),
    fallback: [],
    pollInterval: 0,
  });

  const regionOptions = useMemo(() => {
    const regions = [...new Set(conflicts.map((c) => c.region).filter(Boolean))];
    return [
      { v: "all", l: "All" },
      ...regions.map((r) => ({ v: r.toLowerCase(), l: r })),
    ];
  }, [conflicts]);

  const [region, setRegion] = useState("all");
  const [confidence, setConfidence] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Auto-expand first prediction when data loads
  useEffect(() => {
    if (predictions.length > 0 && !expandedId) {
      setExpandedId(predictions[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictions]);

  const filtered = predictions.filter((p) => {
    const name = (p.conflict_name || "").toLowerCase();
    if (region !== "all" && !name.includes(region)) return false;
    if (confidence !== "all" && p.confidence !== confidence) return false;
    if ((p.convergence_score ?? 0) / 10 < tweaks.convergenceThreshold - 0.2) return false;
    return true;
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Page header */}
      <div
        style={{
          padding: "20px 20px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          borderBottom: "1px solid var(--line-1)",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: "var(--fg-1)",
              lineHeight: 1.2,
            }}
          >
            Predictions
          </h1>
          <p
            className="mono"
            style={{ margin: "3px 0 0", fontSize: 10, color: "var(--fg-4)" }}
          >
            Home / Predictions / Scenarios
          </p>
        </div>
        {live ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 8px",
              background: "rgba(74,157,107,0.12)",
              border: "1px solid rgba(74,157,107,0.3)",
              borderRadius: 2,
              fontSize: 9,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "var(--sig-positive)",
              textTransform: "uppercase",
            }}
          >
            <span
              className="live-dot"
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "var(--sig-positive)",
                display: "inline-block",
              }}
            />
            Live
          </span>
        ) : (
          <span
            style={{
              padding: "3px 8px",
              background: "rgba(216,161,58,0.12)",
              border: "1px solid rgba(216,161,58,0.3)",
              borderRadius: 2,
              fontSize: 9,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "var(--sig-warn)",
              textTransform: "uppercase",
            }}
          >
            Polling
          </span>
        )}
      </div>

      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "10px 20px",
          borderBottom: "1px solid var(--line-1)",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <FilterGroup
          label="Region"
          value={region}
          onChange={setRegion}
          options={regionOptions.length > 1 ? regionOptions : [{ v: "all", l: "All" }]}
        />
        <FilterGroup
          label="Confidence"
          value={confidence}
          onChange={setConfidence}
          options={[
            { v: "all", l: "All" },
            { v: "HIGH", l: "High" },
            { v: "MED", l: "Medium" },
            { v: "LOW", l: "Low" },
          ]}
        />
        <span style={{ flex: 1 }} />
        <span
          className="mono"
          style={{ color: "var(--fg-3)", fontSize: 11 }}
        >
          {filtered.length} of {predictions.length} · threshold {tweaks.convergenceThreshold.toFixed(2)}
        </span>
        <button
          style={{
            padding: "6px 12px",
            background: "transparent",
            border: "1px solid var(--line-3)",
            color: "var(--accent)",
            borderRadius: 2,
            fontSize: 10.5,
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Export briefing
        </button>
      </div>

      {/* Scrollable card list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "80px 20px",
            }}
          >
            <span
              className="mono"
              style={{ fontSize: 12, color: "var(--fg-4)" }}
            >
              Waiting for prediction workers...
            </span>
          </div>
        ) : (
          filtered.map((p) => (
            <ScenarioCard
              key={p.id}
              prediction={p}
              expanded={expandedId === p.id}
              onToggle={() =>
                setExpandedId(expandedId === p.id ? null : p.id)
              }
              relatedSignals={signals
                .filter((s) => s.conflict_id === p.conflict_id)
                .slice(0, 4)}
            />
          ))
        )}
      </div>
    </div>
  );
}
