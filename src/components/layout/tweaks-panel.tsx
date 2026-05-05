"use client";

import { useState, useEffect } from "react";
import { XMarkIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";

// ── Tweaks state persisted to localStorage + applied via html data attributes

export interface Tweaks {
  density: "comfortable" | "dense" | "ultra";
  convergenceThreshold: number;
}

const DEFAULTS: Tweaks = {
  density: "comfortable",
  convergenceThreshold: 0.65,
};

export function useTweaks(): [Tweaks, (t: Tweaks) => void] {
  const [tweaks, setTweaksState] = useState<Tweaks>(DEFAULTS);

  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("strategos.tweaks") || "null"
      );
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setTweaksState({ ...DEFAULTS, ...stored });
    } catch {}
  }, []);

  const setTweaks = (t: Tweaks) => {
    setTweaksState(t);
    localStorage.setItem("strategos.tweaks", JSON.stringify(t));
    document.documentElement.setAttribute("data-density", t.density);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-density", tweaks.density);
  }, [tweaks.density]);

  return [tweaks, setTweaks];
}

interface TweaksPanelProps {
  tweaks: Tweaks;
  setTweaks: (t: Tweaks) => void;
  onClose: () => void;
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; l: string }[];
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        background: "var(--bg-inset)",
        border: "1px solid var(--line-2)",
        borderRadius: 2,
        padding: 2,
        gap: 2,
      }}
    >
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className="mono"
          style={{
            padding: "4px 12px",
            fontSize: 11,
            background: value === o.v ? "var(--bg-3)" : "transparent",
            color: value === o.v ? "var(--fg-1)" : "var(--fg-3)",
            border: "none",
            borderRadius: 2,
            cursor: "pointer",
            fontWeight: value === o.v ? 500 : 400,
            transition: "background .1s",
          }}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function TweakRow({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span
          className="mono caps"
          style={{ color: "var(--fg-3)", fontSize: 10 }}
        >
          {label}
        </span>
        {sub && (
          <span
            className="mono"
            style={{ color: "var(--fg-2)", fontSize: 10.5 }}
          >
            {sub}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export function TweaksPanel({ tweaks, setTweaks, onClose }: TweaksPanelProps) {
  const set = <K extends keyof Tweaks>(k: K, v: Tweaks[K]) =>
    setTweaks({ ...tweaks, [k]: v });

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        top: 58,
        width: 300,
        zIndex: 100,
        background: "var(--bg-1)",
        border: "1px solid var(--line-3)",
        borderRadius: 3,
        boxShadow: "var(--shadow-2)",
        fontSize: 12,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "1px solid var(--line-1)",
        }}
      >
        <span
          className="mono caps"
          style={{ color: "var(--accent)" }}
        >
          Display Settings
        </span>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--fg-3)",
            cursor: "pointer",
            padding: 2,
          }}
        >
          <XMarkIcon style={{ width: 13, height: 13 }} />
        </button>
      </div>

      <div
        style={{
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {/* Data density */}
        <TweakRow label="Data density">
          <Segmented
            value={tweaks.density}
            onChange={(v) => set("density", v)}
            options={[
              { v: "comfortable", l: "Std" },
              { v: "dense", l: "Dense" },
              { v: "ultra", l: "Ultra" },
            ]}
          />
        </TweakRow>

        {/* Convergence threshold */}
        <TweakRow
          label="Convergence threshold"
          sub={`${Math.round(tweaks.convergenceThreshold * 100)}%`}
        >
          <input
            type="range"
            min={0.4}
            max={0.95}
            step={0.01}
            value={tweaks.convergenceThreshold}
            onChange={(e) =>
              set("convergenceThreshold", parseFloat(e.target.value))
            }
            style={{ width: "100%", accentColor: "var(--accent)" }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 4,
            }}
          >
            <span
              className="mono"
              style={{ fontSize: 9.5, color: "var(--fg-4)" }}
            >
              40% — watch
            </span>
            <span
              className="mono"
              style={{ fontSize: 9.5, color: "var(--fg-4)" }}
            >
              95% — critical
            </span>
          </div>
        </TweakRow>

        {/* About */}
        <div
          style={{
            borderTop: "1px solid var(--line-1)",
            paddingTop: 12,
          }}
        >
          <p
            className="mono"
            style={{ fontSize: 10, color: "var(--fg-4)", lineHeight: 1.6 }}
          >
            Threshold filters which conflicts appear in the active scenarios
            panel. Density controls row height and spacing across all views.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Floating trigger button (appended to AppShell) ── */
export function TweaksTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Display settings"
      style={{
        position: "fixed",
        right: 16,
        bottom: 20,
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "var(--bg-2)",
        border: "1px solid var(--line-3)",
        color: "var(--fg-3)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 90,
        boxShadow: "var(--shadow-1)",
        transition: "border-color .15s, color .15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.color = "var(--accent)";
        (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.color = "var(--fg-3)";
        (e.currentTarget as HTMLElement).style.borderColor = "var(--line-3)";
      }}
    >
      <Cog6ToothIcon style={{ width: 16, height: 16 }} />
    </button>
  );
}
