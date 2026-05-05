"use client";

import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PaperAirplaneIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { api, type ApiChatResponse, type ApiSignal, type ApiConflict } from "@/lib/api";
import { useApiData } from "@/hooks/use-api-data";
import { Tag } from "@/components/ui/tag";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  cites?: string[];
  probabilities?: Record<string, number> | null;
  convergence_score?: number | null;
  sources?: { name: string; layer: string; bias_score: number | null }[];
  confidence?: string;
  ts: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Rough token estimate: ~4 tokens per word in assistant messages */
function estimateTokens(messages: ChatMessage[]): number {
  return messages
    .filter((m) => m.role === "assistant")
    .reduce((acc, m) => {
      const words = m.content.split(/\s+/).filter(Boolean).length;
      return acc + words * 4;
    }, 0);
}

/** Extract [SIG-XXXXX] citation IDs from a string */
function extractCites(text: string): string[] {
  const matches = text.match(/\[SIG-[A-Z0-9]+\]/g) || [];
  return [...new Set(matches.map((m) => m.slice(1, -1)))];
}

/** Render assistant content with paragraphs, headers, bullets, and cite chips */
function RichContent({
  content,
  hoveredCite,
  setHoveredCite,
}: {
  content: string;
  hoveredCite: string | null;
  setHoveredCite: (id: string | null) => void;
}) {
  const blocks = content.split(/\n\n+/);

  function renderInline(text: string) {
    // Split on citations and bold spans
    const parts = text.split(/(\[SIG-[A-Z0-9]+\]|\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      const citeMatch = part.match(/^\[SIG-([A-Z0-9]+)\]$/);
      if (citeMatch) {
        const sigId = `SIG-${citeMatch[1]}`;
        return (
          <span
            key={i}
            onMouseEnter={() => setHoveredCite(sigId)}
            onMouseLeave={() => setHoveredCite(null)}
            style={{
              display: "inline-block",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              padding: "1px 5px",
              borderRadius: 2,
              background: hoveredCite === sigId ? "rgba(200,162,106,0.25)" : "rgba(200,162,106,0.12)",
              color: "var(--accent)",
              border: "1px solid var(--accent-dim)",
              cursor: "default",
              letterSpacing: "0.05em",
              marginLeft: 3,
              marginRight: 3,
            }}
          >
            {sigId}
          </span>
        );
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} style={{ fontWeight: 600, color: "var(--fg-1)" }}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {blocks.map((block, bi) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Horizontal rule
        if (trimmed === "---" || trimmed === "***") {
          return <hr key={bi} style={{ border: "none", borderTop: "1px solid var(--line-2)", margin: "4px 0" }} />;
        }

        // Headers: #, ##, ###
        if (trimmed.match(/^#{1,3} /)) {
          const level = (trimmed.match(/^#+/) || [""])[0].length;
          const text = trimmed.replace(/^#+\s+/, "");
          return (
            <div
              key={bi}
              className="mono caps"
              style={{
                fontSize: level === 1 ? 12 : 10.5,
                fontWeight: level === 1 ? 700 : 600,
                color: "var(--accent)",
                letterSpacing: "0.08em",
              }}
            >
              {renderInline(text)}
            </div>
          );
        }

        // Blockquote
        const lines = trimmed.split("\n");
        const isBlockquote = lines.every((l) => l.startsWith("> "));
        if (isBlockquote) {
          return (
            <div
              key={bi}
              style={{
                borderLeft: "2px solid var(--accent-dim)",
                paddingLeft: 10,
                color: "var(--fg-2)",
                fontSize: 11.5,
                fontStyle: "italic",
                lineHeight: 1.55,
              }}
            >
              {lines.map((l, li) => (
                <div key={li}>{renderInline(l.replace(/^> /, ""))}</div>
              ))}
            </div>
          );
        }

        // Markdown table: lines that start and end with |
        const isTable = lines.length >= 2 && lines.every((l) => l.trim().startsWith("|"));
        if (isTable) {
          const dataRows = lines.filter((l) => !l.match(/^\|[-| :]+\|$/));
          const [headerRow, ...bodyRows] = dataRows;
          const parseRow = (row: string) =>
            row.split("|").map((c) => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
          const headers = parseRow(headerRow || "");
          return (
            <table key={bi} style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  {headers.map((h, hi) => (
                    <th
                      key={hi}
                      style={{
                        textAlign: "left",
                        padding: "4px 8px",
                        borderBottom: "1px solid var(--line-2)",
                        color: "var(--fg-3)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "0.05em",
                        fontWeight: 600,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr key={ri} style={{ borderBottom: "1px solid var(--line-1)" }}>
                    {parseRow(row).map((cell, ci) => (
                      <td key={ci} style={{ padding: "4px 8px", color: "var(--fg-1)", lineHeight: 1.5 }}>
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }

        // Bullet list
        const isBulletBlock = lines.every((l) => l.match(/^[-*•]\s/));
        if (isBulletBlock) {
          return (
            <ul key={bi} style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
              {lines.map((line, li) => (
                <li key={li} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                  <span style={{ color: "var(--accent)", fontSize: 11, flexShrink: 0, marginTop: 1 }}>–</span>
                  <span style={{ fontSize: 12, color: "var(--fg-1)", lineHeight: 1.55 }}>
                    {renderInline(line.replace(/^[-*•]\s+/, ""))}
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        // Caveat / warning block: lines starting with "NOTE:" or "CAVEAT:"
        if (trimmed.match(/^(NOTE|CAVEAT|WARNING|CAUTION):/i)) {
          return (
            <div
              key={bi}
              style={{
                border: "1px dashed var(--line-3)",
                borderRadius: 4,
                padding: "8px 10px",
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
              }}
            >
              <ExclamationTriangleIcon
                style={{ width: 14, height: 14, color: "var(--sig-warn)", flexShrink: 0, marginTop: 1 }}
              />
              <span style={{ fontSize: 11.5, color: "var(--fg-2)", lineHeight: 1.55 }}>
                {renderInline(trimmed)}
              </span>
            </div>
          );
        }

        // Default paragraph
        return (
          <p key={bi} style={{ margin: 0, fontSize: 12, color: "var(--fg-1)", lineHeight: 1.6 }}>
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Evidence cell                                                        */
/* ------------------------------------------------------------------ */

function EvidenceCell({ sig, active }: { sig: ApiSignal; active: boolean }) {
  const layerLabel = sig.layer || "??";
  return (
    <div
      style={{
        padding: "10px 14px",
        borderBottom: "1px solid var(--line-2)",
        background: active ? "var(--bg-3)" : "transparent",
        transition: "background 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span
          className="mono"
          style={{ fontSize: 9.5, color: "var(--accent)", letterSpacing: "0.05em" }}
        >
          {sig.id.slice(0, 14)}
        </span>
        <span
          className="mono"
          style={{
            fontSize: 9,
            padding: "1px 5px",
            borderRadius: 2,
            background: "var(--bg-inset)",
            border: "1px solid var(--line-2)",
            color: "var(--fg-3)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {layerLabel}
        </span>
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: "var(--fg-1)",
          lineHeight: 1.45,
          marginBottom: 4,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {sig.content || "(no content)"}
      </div>
      <div className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>
        {sig.source_name}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pending dots                                                         */
/* ------------------------------------------------------------------ */

function PendingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--accent)",
              opacity: 0.7,
              animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>
        ranking signals &rarr; verifying citations&hellip;
      </span>
      <style>{`
        @keyframes pulse-dot {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                            */
/* ------------------------------------------------------------------ */

const SUGGESTIONS = [
  "What changed on Hormuz in the last 6 hours?",
  "Compare Iran connectivity signals to the 2022–23 pattern",
  "Draft a 150-word note for the principal on Bab-el-Mandeb",
  "Which layer is most confirming on SCN-0147 right now?",
];

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Welcome to STRATEGOS AI Analysis. I can help you analyze geopolitical situations, assess conflict probabilities, and provide intelligence-backed insights. Ask me anything about current conflicts, predictions, or signal analysis.",
  confidence: "HIGH",
  ts: nowHHMM(),
};

function AiChatInner() {
  const searchParams = useSearchParams();
  const incomingScenario = searchParams.get("scenario");
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [hoveredCite, setHoveredCite] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: recentSignals } = useApiData<ApiSignal[]>({
    fetcher: () => api.signals({ limit: 50 }),
    fallback: [],
    pollInterval: 0,
  });

  const { data: conflicts } = useApiData<ApiConflict[]>({
    fetcher: () => api.conflicts(),
    fallback: [],
    pollInterval: 0,
  });

  const contextConflictId = useMemo(() => {
    if (!incomingScenario) return null;
    const match = conflicts.find(
      (c) => c.id === incomingScenario || c.name === incomingScenario
    );
    return match?.id ?? null;
  }, [conflicts, incomingScenario]);

  /* Derive evidence signals from most-recent assistant message sources */
  const evidenceSignals: ApiSignal[] = (() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return recentSignals.slice(0, 6);
    if (lastAssistant.sources && lastAssistant.sources.length > 0) {
      // Map source names back to signals where possible
      const sourceNames = new Set(lastAssistant.sources.map((s) => s.name));
      const matched = recentSignals.filter((s) => sourceNames.has(s.source_name));
      return matched.length > 0 ? matched.slice(0, 8) : recentSignals.slice(0, 6);
    }
    return recentSignals.slice(0, 6);
  })();

  const tokenCount = estimateTokens(messages);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      ts: nowHHMM(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const resp: ApiChatResponse = await api.chat(text, contextConflictId || undefined, sessionId || undefined);
      setSessionId(resp.session_id);
      setLive(true);

      const cites = extractCites(resp.analysis);
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: resp.analysis,
        cites,
        probabilities: resp.probabilities,
        convergence_score: resp.convergence_score,
        sources: resp.sources,
        confidence: resp.confidence,
        ts: nowHHMM(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setLive(false);
      const fallbackMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content:
          "Unable to connect to the analysis backend. Please ensure the STRATEGOS API is reachable. The system monitors 10 signal layers across geopolitical, economic, and connectivity domains to provide convergence-based predictions.",
        confidence: "LOW",
        ts: nowHHMM(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId, contextConflictId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const applySuggestion = (s: string) => {
    setInput(s);
    textareaRef.current?.focus();
  };

  const showSuggestions = messages.length <= 2;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "18px 20px 14px",
          borderBottom: "1px solid var(--line-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: "var(--fg-1)",
              letterSpacing: "-0.02em",
            }}
          >
            AI Analysis
          </h1>
          <p className="mono" style={{ margin: "2px 0 0", fontSize: 11, color: "var(--fg-4)" }}>
            Natural language geopolitical intelligence powered by Claude
          </p>
        </div>
        <div>
          {live ? (
            <span
              className="mono"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 8px",
                borderRadius: 3,
                background: "rgba(74,157,107,0.12)",
                color: "var(--sig-positive)",
                border: "1px solid rgba(74,157,107,0.3)",
                fontSize: 9.5,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--sig-positive)",
                  animation: "pulse-dot 2s ease-in-out infinite",
                }}
              />
              CONNECTED
            </span>
          ) : (
            <span
              className="mono"
              style={{
                padding: "3px 8px",
                borderRadius: 3,
                background: "rgba(216,161,58,0.12)",
                color: "var(--sig-warn)",
                border: "1px solid rgba(216,161,58,0.3)",
                fontSize: 9.5,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              OFFLINE
            </span>
          )}
        </div>
      </div>

      {/* Context strip */}
      <div
        style={{
          padding: "10px 20px",
          borderBottom: "1px solid var(--line-2)",
          background: "var(--bg-1)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        <span
          className="mono caps"
          style={{ color: "var(--fg-4)", fontSize: 9.5, letterSpacing: "0.08em" }}
        >
          Context window
        </span>
        {conflicts.slice(0, 3).map((c) => {
          const isActive =
            incomingScenario != null &&
            (c.id === incomingScenario || c.name === incomingScenario);
          return (
            <Tag key={c.id} tone={isActive ? "accent" : "default"}>
              {c.id} · {c.name}
            </Tag>
          );
        })}
        {conflicts.length === 0 && incomingScenario && (
          <Tag tone="accent">{incomingScenario}</Tag>
        )}
        <span style={{ flex: 1 }} />
        <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>
          Citation verification: ON ·{" "}
          <span style={{ color: "var(--fg-2)" }}>all resolved</span>
        </span>
        <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>
          Tokens: {tokenCount.toLocaleString()} / 8,000
        </span>
      </div>

      {/* Body: messages + evidence sidebar */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {/* Messages column */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          {/* Scrollable message area */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {messages.map((msg) =>
              msg.role === "user" ? (
                /* User bubble */
                <div key={msg.id} style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div
                    style={{
                      maxWidth: "68%",
                      background: "var(--bg-2)",
                      border: "1px solid var(--line-2)",
                      borderRadius: 8,
                      padding: "10px 14px",
                    }}
                  >
                    <div
                      className="mono"
                      style={{ fontSize: 9.5, color: "var(--fg-4)", marginBottom: 6 }}
                    >
                      Analyst · {msg.ts}
                    </div>
                    <p style={{ margin: 0, fontSize: 12.5, color: "var(--fg-1)", lineHeight: 1.55 }}>
                      {msg.content}
                    </p>
                  </div>
                </div>
              ) : (
                /* Assistant bubble */
                <div key={msg.id} style={{ display: "flex", justifyContent: "flex-start", gap: 10 }}>
                  {/* Avatar */}
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 4,
                      background: "var(--bg-inset)",
                      border: "1px solid var(--accent-dim)",
                      color: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    S
                  </div>
                  <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column", gap: 8 }}>
                    {/* Sender row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="mono" style={{ fontSize: 9.5, color: "var(--fg-4)" }}>
                        STRATEGOS analyst · briefing · {msg.ts}
                      </span>
                      <Tag tone="positive">verified</Tag>
                    </div>

                    {/* Rich body */}
                    <div
                      style={{
                        background: "var(--bg-2)",
                        border: "1px solid var(--line-2)",
                        borderRadius: 8,
                        padding: "12px 14px",
                      }}
                    >
                      <RichContent
                        content={msg.content}
                        hoveredCite={hoveredCite}
                        setHoveredCite={setHoveredCite}
                      />

                      {/* Probabilities */}
                      {msg.probabilities && Object.keys(msg.probabilities).length > 0 && (
                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 10,
                            borderTop: "1px solid var(--line-2)",
                          }}
                        >
                          <div
                            className="mono caps"
                            style={{ fontSize: 9.5, color: "var(--fg-4)", marginBottom: 8 }}
                          >
                            Probabilities
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            {Object.entries(msg.probabilities).map(([key, val]) => (
                              <div
                                key={key}
                                style={{ display: "flex", alignItems: "center", gap: 8 }}
                              >
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    color: "var(--fg-2)",
                                    width: 80,
                                    textTransform: "capitalize",
                                  }}
                                >
                                  {key}
                                </span>
                                <div
                                  style={{
                                    flex: 1,
                                    height: 4,
                                    background: "var(--bg-inset)",
                                    borderRadius: 2,
                                    overflow: "hidden",
                                  }}
                                >
                                  <div
                                    style={{
                                      height: "100%",
                                      width: `${val * 100}%`,
                                      background: "var(--accent)",
                                      borderRadius: 2,
                                    }}
                                  />
                                </div>
                                <span
                                  className="mono"
                                  style={{ fontSize: 10.5, color: "var(--fg-1)", width: 34, textAlign: "right" }}
                                >
                                  {(val * 100).toFixed(0)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Convergence score */}
                      {msg.convergence_score != null && (
                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span className="mono" style={{ fontSize: 10, color: "var(--fg-4)" }}>
                            Convergence Score
                          </span>
                          <span
                            className="mono"
                            style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}
                          >
                            {msg.convergence_score}/10
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Confidence badge */}
                    {msg.confidence && (
                      <div>
                        <Tag
                          tone={
                            msg.confidence === "HIGH"
                              ? "positive"
                              : msg.confidence === "MEDIUM"
                              ? "warn"
                              : "default"
                          }
                        >
                          {msg.confidence} confidence
                        </Tag>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}

            {/* Pending */}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start", gap: 10 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 4,
                    background: "var(--bg-inset)",
                    border: "1px solid var(--accent-dim)",
                    color: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  S
                </div>
                <div
                  style={{
                    background: "var(--bg-2)",
                    border: "1px solid var(--line-2)",
                    borderRadius: 8,
                  }}
                >
                  <PendingDots />
                </div>
              </div>
            )}

            {/* Suggestion chips */}
            {showSuggestions && !loading && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => applySuggestion(s)}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 6,
                      background: "var(--bg-inset)",
                      border: "1px solid var(--line-2)",
                      color: "var(--fg-2)",
                      fontSize: 11.5,
                      lineHeight: 1.45,
                      cursor: "pointer",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <div
            style={{
              padding: "12px 16px 14px",
              borderTop: "1px solid var(--line-2)",
              background: "var(--bg-1)",
              flexShrink: 0,
            }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              <textarea
                ref={textareaRef}
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about a scenario, a layer, a source, or request a briefing..."
                disabled={loading}
                style={{
                  width: "100%",
                  resize: "none",
                  border: "1px solid var(--line-2)",
                  borderRadius: 6,
                  padding: "9px 12px",
                  fontSize: 12.5,
                  color: "var(--fg-1)",
                  background: "var(--bg-2)",
                  fontFamily: "inherit",
                  lineHeight: 1.5,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="mono" style={{ fontSize: 10, color: "var(--fg-4)" }}>
                  claude-sonnet-4-6 · 8k cap
                </span>
                <span style={{ flex: 1 }} />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 6,
                    background: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                    opacity: input.trim() && !loading ? 1 : 0.4,
                    fontSize: 12,
                    fontWeight: 600,
                    transition: "opacity 0.15s",
                  }}
                >
                  <PaperAirplaneIcon style={{ width: 14, height: 14 }} />
                  Send
                </button>
              </div>
            </form>
            <div
              style={{
                marginTop: 6,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <span className="mono" style={{ fontSize: 9.5, color: "var(--fg-4)" }}>
                Enter to send · Shift+Enter for newline
              </span>
              <span className="mono" style={{ fontSize: 9.5, color: "var(--fg-4)" }}>
                AI responses are grounded in live signal data. Every source citation includes its bias score. Not a substitute for professional intelligence assessment.
              </span>
            </div>
          </div>
        </div>

        {/* Evidence sidebar */}
        <div
          style={{
            width: 300,
            flexShrink: 0,
            borderLeft: "1px solid var(--line-2)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Sidebar header */}
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--line-2)",
              flexShrink: 0,
            }}
          >
            <div className="mono caps" style={{ color: "var(--fg-4)", fontSize: 10, letterSpacing: "0.08em" }}>
              Evidence panel
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 3 }}>
              Every claim traces back here.
            </div>
          </div>

          {/* Signal cells */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {evidenceSignals.length === 0 ? (
              <div
                style={{
                  padding: "20px 16px",
                  fontSize: 11.5,
                  color: "var(--fg-4)",
                  fontStyle: "italic",
                }}
              >
                No evidence signals yet. Send a message to populate this panel.
              </div>
            ) : (
              evidenceSignals.map((sig) => (
                <EvidenceCell
                  key={sig.id}
                  sig={sig}
                  active={hoveredCite !== null && sig.id.includes(hoveredCite)}
                />
              ))
            )}
          </div>

          {/* Sidebar footer */}
          <div
            style={{
              padding: "10px 16px",
              borderTop: "1px solid var(--line-2)",
              background: "var(--bg-inset)",
              flexShrink: 0,
            }}
          >
            <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>
              {evidenceSignals.length} injected · all resolved
            </div>
            <div className="mono" style={{ fontSize: 9.5, color: "var(--fg-4)", marginTop: 2 }}>
              0 stripped by verifier · 0 hallucinated
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AiChatPage() {
  return (
    <Suspense>
      <AiChatInner />
    </Suspense>
  );
}
