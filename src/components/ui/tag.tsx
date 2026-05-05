"use client";

import { type ReactNode, type CSSProperties } from "react";

export type TagTone = "critical" | "warn" | "positive" | "info" | "accent" | "default";

const TONE: Record<TagTone, CSSProperties> = {
  critical: { background: "rgba(216,74,58,0.12)",   color: "var(--sig-critical)", border: "1px solid rgba(216,74,58,0.3)" },
  warn:     { background: "rgba(216,161,58,0.12)",  color: "var(--sig-warn)",     border: "1px solid rgba(216,161,58,0.3)" },
  positive: { background: "rgba(74,157,107,0.12)",  color: "var(--sig-positive)", border: "1px solid rgba(74,157,107,0.3)" },
  info:     { background: "rgba(107,140,174,0.12)", color: "var(--sig-info)",     border: "1px solid rgba(107,140,174,0.3)" },
  accent:   { background: "rgba(200,162,106,0.12)", color: "var(--accent)",       border: "1px solid var(--accent-dim)" },
  default:  { background: "var(--bg-inset)",        color: "var(--fg-3)",         border: "1px solid var(--line-2)" },
};

export function Tag({ tone = "default", children }: { tone?: TagTone; children: ReactNode }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 6px", borderRadius: 2,
      fontSize: 10, fontWeight: 500,
      fontFamily: "var(--font-mono)",
      letterSpacing: "0.06em", textTransform: "uppercase",
      whiteSpace: "nowrap",
      ...TONE[tone],
    }}>
      {children}
    </span>
  );
}
