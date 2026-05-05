"use client";

import { useState } from "react";
import { ArrowRightIcon, SignalIcon } from "@heroicons/react/24/outline";
import { Tag } from "@/components/ui/tag";
import { api, type ApiSignal } from "@/lib/api";
import { useApiData } from "@/hooks/use-api-data";

/* ─── Static chokepoint data ─────────────────────────────────── */
type ChokepointStatus = "elevated" | "nominal";

interface Chokepoint {
  id: string;
  x: number;
  y: number;
  label: string;
  sub: string;
  width: string;
  oilFlow: string;
  transitNow: number;
  baseline: number;
  status: ChokepointStatus;
  scenario: string | null;
  convergence: number;
}

const CHOKEPOINTS: Chokepoint[] = [
  {
    id: "hormuz",
    x: 615,
    y: 258,
    label: "Strait of Hormuz",
    sub: "Northern Persian Gulf chokepoint",
    width: "~33 km",
    oilFlow: "~20 Mbbl/d global oil",
    transitNow: 31,
    baseline: 48,
    status: "elevated",
    scenario: "SCN-0147",
    convergence: 0.84,
  },
  {
    id: "bab",
    x: 340,
    y: 470,
    label: "Bab-el-Mandeb",
    sub: "Red Sea — Gulf of Aden chokepoint",
    width: "~29 km",
    oilFlow: "~9 Mbbl/d global oil",
    transitNow: 46,
    baseline: 112,
    status: "elevated",
    scenario: "SCN-0152",
    convergence: 0.71,
  },
  {
    id: "suez",
    x: 165,
    y: 205,
    label: "Suez Canal",
    sub: "Mediterranean — Red Sea artery",
    width: "~205 m canal",
    oilFlow: "~9% of global trade",
    transitNow: 24,
    baseline: 54,
    status: "nominal",
    scenario: null,
    convergence: 0,
  },
];

/* ─── Layer toggle state ─────────────────────────────────────── */
interface LayerVisibility {
  chokepoints: boolean;
  shipping: boolean;
  ais: boolean;
  scenarios: boolean;
  bgp: boolean;
}

/* ─── Color helpers ──────────────────────────────────────────── */
function statusColor(status: ChokepointStatus): string {
  return status === "elevated" ? "var(--sig-critical)" : "var(--sig-positive)";
}

/* ─── AIS traffic dot positions ─────────────────────────────── */
const AIS_DOTS: { x: number; y: number; op: number }[] = [
  { x: 600, y: 250, op: 0.7 },
  { x: 622, y: 263, op: 0.5 },
  { x: 608, y: 270, op: 0.6 },
  { x: 595, y: 258, op: 0.55 },
  { x: 632, y: 248, op: 0.65 },
  { x: 618, y: 242, op: 0.5 },
  { x: 345, y: 465, op: 0.7 },
  { x: 332, y: 474, op: 0.55 },
  { x: 356, y: 468, op: 0.6 },
  { x: 338, y: 480, op: 0.5 },
  { x: 162, y: 200, op: 0.65 },
  { x: 170, y: 212, op: 0.6 },
  { x: 158, y: 215, op: 0.5 },
];

/* ─── Gulf SVG map component ─────────────────────────────────── */
function GulfSvgMap({
  selected,
  layerVis,
  onSelect,
}: {
  selected: string;
  layerVis: LayerVisibility;
  onSelect: (id: string) => void;
}) {
  const selectedCP = CHOKEPOINTS.find((c) => c.id === selected)!;

  return (
    <svg
      viewBox="0 0 1000 600"
      width="100%"
      height="100%"
      style={{ display: "block" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Graticule pattern */}
        <pattern id="grat" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="var(--line-1)"
            strokeWidth="0.4"
          />
        </pattern>
        {/* Sea glow */}
        <radialGradient id="seaGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(107,143,181,0.05)" />
          <stop offset="100%" stopColor="rgba(107,143,181,0)" />
        </radialGradient>
        {/* Clip for map area */}
        <clipPath id="mapClip">
          <rect width="1000" height="600" />
        </clipPath>
      </defs>

      {/* Sea background */}
      <rect width="1000" height="600" fill="var(--bg-0)" />
      <rect width="1000" height="600" fill="url(#seaGlow)" />
      <rect width="1000" height="600" fill="url(#grat)" opacity="1" />

      {/* ── Landmasses ── */}
      {/* Saudi Arabia / Arabia */}
      <path
        d="M 420 180 L 470 175 L 520 190 L 570 220 L 605 270 L 625 320 L 640 380 L 625 440 L 580 480 L 520 500 L 450 510 L 380 500 L 330 470 L 300 420 L 290 370 L 300 320 L 320 270 L 360 220 L 400 190 Z"
        fill="var(--bg-2)"
        stroke="var(--line-3)"
        strokeWidth="0.8"
      />
      {/* Iran */}
      <path
        d="M 450 90 L 560 80 L 660 100 L 740 130 L 790 170 L 810 220 L 790 260 L 740 280 L 680 275 L 610 255 L 560 225 L 510 200 L 460 170 L 430 130 Z"
        fill="var(--bg-2)"
        stroke="var(--line-3)"
        strokeWidth="0.8"
      />
      {/* Musandam */}
      <path
        d="M 595 240 L 625 235 L 640 255 L 625 275 L 600 272 L 590 260 Z"
        fill="var(--bg-2)"
        stroke="var(--line-3)"
        strokeWidth="0.8"
      />
      {/* Horn of Africa */}
      <path
        d="M 200 440 L 260 430 L 300 450 L 320 490 L 300 530 L 250 545 L 200 540 L 170 510 L 165 475 Z"
        fill="var(--bg-2)"
        stroke="var(--line-3)"
        strokeWidth="0.8"
      />
      {/* Egypt */}
      <path
        d="M 120 140 L 200 135 L 250 160 L 280 200 L 275 260 L 255 310 L 230 360 L 210 420 L 180 430 L 150 410 L 130 370 L 115 310 L 110 240 L 115 180 Z"
        fill="var(--bg-2)"
        stroke="var(--line-3)"
        strokeWidth="0.8"
      />
      {/* Northern landmass (Turkey/Levant) */}
      <path
        d="M 240 60 L 430 55 L 490 80 L 470 120 L 430 140 L 360 150 L 290 140 L 240 120 Z"
        fill="var(--bg-2)"
        stroke="var(--line-3)"
        strokeWidth="0.8"
      />

      {/* ── Water labels ── */}
      <text x="680" y="350" fill="var(--fg-4)" fontSize="10" className="mono" letterSpacing="0.22em" textAnchor="middle" style={{ textTransform: "uppercase" }}>ARABIAN SEA</text>
      <text x="140" y="330" fill="var(--fg-4)" fontSize="10" className="mono" letterSpacing="0.22em" textAnchor="middle" style={{ textTransform: "uppercase" }}>RED SEA</text>
      <text x="520" y="230" fill="var(--fg-4)" fontSize="10" className="mono" letterSpacing="0.22em" textAnchor="middle" style={{ textTransform: "uppercase" }}>PERSIAN GULF</text>
      <text x="340" y="540" fill="var(--fg-4)" fontSize="10" className="mono" letterSpacing="0.22em" textAnchor="middle" style={{ textTransform: "uppercase" }}>GULF OF ADEN</text>
      <text x="130" y="100" fill="var(--fg-4)" fontSize="11" className="mono" letterSpacing="0.22em" textAnchor="middle" style={{ textTransform: "uppercase" }}>MEDITERRANEAN</text>

      {/* ── Country labels ── */}
      <text x="470" y="360" fill="var(--fg-3)" fontSize="10" className="mono" textAnchor="middle" style={{ textTransform: "uppercase" }}>SAUDI ARABIA</text>
      <text x="630" y="185" fill="var(--fg-3)" fontSize="10" className="mono" textAnchor="middle" style={{ textTransform: "uppercase" }}>IRAN</text>
      <text x="370" y="490" fill="var(--fg-3)" fontSize="10" className="mono" textAnchor="middle" style={{ textTransform: "uppercase" }}>YEMEN</text>
      <text x="165" y="280" fill="var(--fg-3)" fontSize="10" className="mono" textAnchor="middle" style={{ textTransform: "uppercase" }}>EGYPT</text>
      <text x="360" y="100" fill="var(--fg-3)" fontSize="10" className="mono" textAnchor="middle" style={{ textTransform: "uppercase" }}>TURKEY</text>
      <text x="600" y="290" fill="var(--fg-3)" fontSize="9" className="mono" textAnchor="middle" style={{ textTransform: "uppercase" }}>UAE</text>
      <text x="620" y="340" fill="var(--fg-3)" fontSize="9" className="mono" textAnchor="middle" style={{ textTransform: "uppercase" }}>OMAN</text>

      {/* ── Cities ── */}
      {[
        { x: 540, y: 285, label: "Dubai" },
        { x: 520, y: 302, label: "Abu Dhabi" },
        { x: 488, y: 245, label: "Tehran" },
        { x: 400, y: 358, label: "Riyadh" },
        { x: 578, y: 305, label: "Muscat" },
        { x: 488, y: 198, label: "Baghdad" },
        { x: 296, y: 496, label: "Aden" },
        { x: 265, y: 455, label: "Sanaa" },
        { x: 448, y: 120, label: "Ankara" },
      ].map((city) => (
        <g key={city.label}>
          <circle cx={city.x} cy={city.y} r="1.5" fill="var(--fg-2)" />
          <text x={city.x + 4} y={city.y + 3} fill="var(--fg-2)" fontSize="9" className="mono">{city.label}</text>
        </g>
      ))}

      {/* ── Shipping lanes ── */}
      {layerVis.shipping && (
        <g>
          {/* Red Sea lane — stressed */}
          <path
            d="M 165 215 C 200 260, 250 330, 300 410 S 330 470, 340 472"
            fill="none"
            stroke="var(--sig-critical)"
            strokeWidth="1.2"
            strokeOpacity="0.55"
          />
          <circle r="3" fill="var(--sig-critical)" opacity="0.8">
            <animateMotion
              dur="6s"
              repeatCount="indefinite"
              path="M 165 215 C 200 260, 250 330, 300 410 S 330 470, 340 472"
            />
          </circle>

          {/* Aden-Hormuz lane — nominal */}
          <path
            d="M 340 472 C 430 490, 540 400, 615 260"
            fill="none"
            stroke="var(--layer-shipping)"
            strokeWidth="1.2"
            strokeOpacity="0.55"
          />
          <circle r="3" fill="var(--layer-shipping)" opacity="0.8">
            <animateMotion
              dur="7s"
              repeatCount="indefinite"
              path="M 340 472 C 430 490, 540 400, 615 260"
            />
          </circle>

          {/* Cape reroute lane — active, dashed */}
          <path
            d="M 340 472 C 280 560, 160 580, 80 540"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.2"
            strokeDasharray="5 4"
            strokeOpacity="0.6"
          />
          <circle r="3" fill="var(--accent)" opacity="0.8">
            <animateMotion
              dur="9s"
              repeatCount="indefinite"
              path="M 340 472 C 280 560, 160 580, 80 540"
            />
          </circle>
        </g>
      )}

      {/* ── AIS traffic dots ── */}
      {layerVis.ais &&
        AIS_DOTS.map((d, i) => (
          <rect
            key={i}
            x={d.x - 1.5}
            y={d.y - 1.5}
            width="3"
            height="3"
            fill="var(--layer-shipping)"
            opacity={d.op}
          />
        ))}

      {/* ── BGP anomaly rings near Tehran ── */}
      {layerVis.bgp && (
        <g>
          <circle
            cx="560"
            cy="170"
            r="26"
            fill="none"
            stroke="var(--layer-connectivity)"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.6"
          />
          <circle
            cx="560"
            cy="170"
            r="40"
            fill="none"
            stroke="var(--layer-connectivity)"
            strokeWidth="0.7"
            strokeDasharray="6 4"
            opacity="0.35"
          />
        </g>
      )}

      {/* ── Chokepoint markers ── */}
      {layerVis.chokepoints &&
        CHOKEPOINTS.map((cp) => {
          const isSel = cp.id === selected;
          const col = statusColor(cp.status);
          const haloR = isSel ? 22 : 14;
          return (
            <g
              key={cp.id}
              style={{ cursor: "pointer" }}
              onClick={() => onSelect(cp.id)}
            >
              {/* Halo */}
              <circle
                cx={cp.x}
                cy={cp.y}
                r={haloR}
                fill={col}
                fillOpacity="0.08"
                stroke={col}
                strokeWidth="0.5"
                strokeOpacity="0.3"
              />
              {/* Outer ring */}
              <circle
                cx={cp.x}
                cy={cp.y}
                r="7"
                fill="none"
                stroke={col}
                strokeWidth="1.5"
              />
              {/* Inner dot */}
              <circle cx={cp.x} cy={cp.y} r="3" fill={col}>
                {cp.status === "elevated" && (
                  <animate
                    attributeName="r"
                    values="2;3.5;2"
                    dur="1.6s"
                    repeatCount="indefinite"
                  />
                )}
              </circle>
              {/* Leader line + label */}
              <line
                x1={cp.x + 8}
                y1={cp.y - 8}
                x2={cp.x + 22}
                y2={cp.y - 22}
                stroke={col}
                strokeWidth="0.8"
                opacity="0.5"
              />
              <rect
                x={cp.x - 44}
                y={cp.y - 50}
                width="88"
                height="18"
                rx="2"
                fill="var(--bg-1)"
                stroke={col}
                strokeWidth="0.6"
                opacity="0.92"
              />
              <text
                x={cp.x}
                y={cp.y - 38}
                fill={col}
                fontSize="7"
                className="mono"
                textAnchor="middle"
                style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
              >
                {cp.status}
              </text>
              <text
                x={cp.x}
                y={cp.y - 45}
                fill="var(--fg-2)"
                fontSize="6.5"
                className="mono"
                textAnchor="middle"
              >
                {cp.label}
              </text>
            </g>
          );
        })}

      {/* ── Scenario markers ── */}
      {layerVis.scenarios &&
        CHOKEPOINTS.filter((cp) => cp.scenario).map((cp) => (
          <g key={`scn-${cp.id}`}>
            <rect
              x={cp.x + 12}
              y={cp.y - 8}
              width="52"
              height="14"
              rx="2"
              fill="rgba(200,162,106,0.12)"
              stroke="var(--accent-dim)"
              strokeWidth="0.5"
            />
            <text
              x={cp.x + 38}
              y={cp.y + 1}
              fill="var(--accent)"
              fontSize="6.5"
              className="mono"
              textAnchor="middle"
              style={{ letterSpacing: "0.06em" }}
            >
              {cp.scenario}
            </text>
          </g>
        ))}
    </svg>
  );
}

/* ─── Layer legend overlay ───────────────────────────────────── */
function LayerLegend({
  layerVis,
  setLayerVis,
}: {
  layerVis: LayerVisibility;
  setLayerVis: React.Dispatch<React.SetStateAction<LayerVisibility>>;
}) {
  const items: { key: keyof LayerVisibility; label: string; color: string }[] = [
    { key: "chokepoints", label: "Chokepoints", color: "var(--sig-critical)" },
    { key: "shipping", label: "Shipping lanes", color: "var(--layer-shipping)" },
    { key: "ais", label: "AIS traffic", color: "var(--layer-shipping)" },
    { key: "scenarios", label: "Scenario markers", color: "var(--accent)" },
    { key: "bgp", label: "BGP anomalies", color: "var(--layer-connectivity)" },
  ];

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        background: "rgba(16,21,27,0.92)",
        backdropFilter: "blur(8px)",
        border: "1px solid var(--line-2)",
        borderRadius: 6,
        padding: "10px 12px",
        minWidth: 172,
        zIndex: 10,
      }}
    >
      {items.map((item) => (
        <label
          key={item.key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginBottom: 6,
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={layerVis[item.key]}
            onChange={(e) =>
              setLayerVis((prev) => ({ ...prev, [item.key]: e.target.checked }))
            }
            style={{ accentColor: "var(--accent)", width: 11, height: 11, cursor: "pointer" }}
          />
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: item.color,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 10,
              color: "var(--fg-2)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.04em",
            }}
          >
            {item.label}
          </span>
        </label>
      ))}
      <div
        style={{
          marginTop: 6,
          paddingTop: 6,
          borderTop: "1px solid var(--line-1)",
          fontSize: 8.5,
          color: "var(--fg-4)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.05em",
        }}
      >
        ILLUSTRATIVE COAST LINES
      </div>
    </div>
  );
}

/* ─── Scale bar ──────────────────────────────────────────────── */
function Scalebar() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        left: 16,
        display: "flex",
        flexDirection: "column",
        gap: 3,
        zIndex: 10,
      }}
    >
      <div style={{ display: "flex" }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 18,
              height: 5,
              background: i % 2 === 0 ? "var(--fg-1)" : "var(--fg-4)",
            }}
          />
        ))}
      </div>
      <div
        style={{
          fontSize: 8,
          color: "var(--fg-4)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.04em",
          display: "flex",
          justifyContent: "space-between",
          width: 72,
        }}
      >
        <span>0</span>
        <span>500 km</span>
      </div>
    </div>
  );
}

/* ─── Compass rose ───────────────────────────────────────────── */
function Compass() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        right: 16,
        zIndex: 10,
      }}
    >
      <svg width="36" height="36" viewBox="0 0 36 36">
        {/* N */}
        <polygon points="18,2 21,16 18,14 15,16" fill="var(--accent)" />
        {/* S */}
        <polygon points="18,34 21,20 18,22 15,20" fill="var(--fg-3)" />
        {/* E */}
        <polygon points="34,18 20,15 22,18 20,21" fill="var(--fg-4)" />
        {/* W */}
        <polygon points="2,18 16,15 14,18 16,21" fill="var(--fg-4)" />
        {/* center dot */}
        <circle cx="18" cy="18" r="2.5" fill="var(--bg-2)" stroke="var(--line-3)" strokeWidth="0.8" />
        <text x="18" y="10" fontSize="6" fill="var(--accent)" textAnchor="middle" fontFamily="var(--font-mono)" fontWeight="600">N</text>
        <text x="18" y="32.5" fontSize="6" fill="var(--fg-3)" textAnchor="middle" fontFamily="var(--font-mono)">S</text>
      </svg>
    </div>
  );
}

/* ─── Side panel ─────────────────────────────────────────────── */
function SidePanel({
  cp,
  signals,
}: {
  cp: Chokepoint;
  signals: ApiSignal[];
}) {
  const transitPct = Math.round((cp.transitNow / cp.baseline) * 100);
  const barColor = transitPct < 70 ? "var(--sig-critical)" : "var(--sig-positive)";

  const relevant = signals
    .filter(
      (s) =>
        s.content?.includes("Yemen") ||
        s.content?.includes("Iran") ||
        s.content?.includes("Red Sea") ||
        s.layer === "L3"
    )
    .slice(0, 6);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 16px 12px",
          borderBottom: "1px solid var(--line-2)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--fg-1)",
                marginBottom: 3,
                lineHeight: 1.3,
              }}
            >
              {cp.label}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--fg-3)",
                fontFamily: "var(--font-mono)",
                marginBottom: 8,
              }}
            >
              {cp.sub}
            </div>
          </div>
          <Tag tone={cp.status === "elevated" ? "critical" : "positive"}>
            {cp.status}
          </Tag>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        {/* Transits section */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 9,
              color: "var(--fg-4)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Daily transits
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
            <span
              style={{
                fontSize: 32,
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                color: "var(--accent)",
                lineHeight: 1,
              }}
            >
              {cp.transitNow}
            </span>
            <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
              / {cp.baseline} baseline
            </span>
          </div>
          {/* Progress bar */}
          <div
            style={{
              height: 4,
              background: "var(--bg-inset)",
              border: "1px solid var(--line-1)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min(transitPct, 100)}%`,
                height: "100%",
                background: barColor,
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 9,
              color: "var(--fg-4)",
              fontFamily: "var(--font-mono)",
              marginTop: 4,
            }}
          >
            {transitPct}% of baseline capacity
          </div>
        </div>

        {/* Fact grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 1,
            background: "var(--line-1)",
            border: "1px solid var(--line-2)",
            borderRadius: 4,
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          {[
            { label: "Narrowest", value: cp.width },
            { label: "Global flow", value: cp.oilFlow },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: "var(--bg-inset)",
                padding: "8px 10px",
              }}
            >
              <div
                style={{
                  fontSize: 8.5,
                  color: "var(--fg-4)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 3,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--fg-1)",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 500,
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Linked scenario */}
        {cp.scenario && (
          <div
            style={{
              border: "1px solid var(--line-3)",
              borderRadius: 6,
              padding: "12px",
              marginBottom: 16,
              background: "rgba(200,162,106,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 9,
                  color: "var(--fg-4)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Linked scenario
              </span>
              <Tag tone="accent">{cp.scenario}</Tag>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 10 }}>
              <span
                style={{
                  fontSize: 32,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  color: "var(--accent)",
                  lineHeight: 1,
                }}
              >
                {Math.round(cp.convergence * 100)}
              </span>
              <span style={{ fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
                / 100 convergence
              </span>
            </div>
            <button
              style={{
                width: "100%",
                padding: "6px 10px",
                border: "1px solid var(--line-3)",
                borderRadius: 4,
                background: "transparent",
                color: "var(--accent)",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.06em",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              Open scenario
              <ArrowRightIcon style={{ width: 11, height: 11 }} />
            </button>
          </div>
        )}

        {/* Recent signals */}
        <div>
          <div
            style={{
              fontSize: 9,
              color: "var(--fg-4)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Recent signals
          </div>
          {relevant.length === 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px",
                border: "1px solid var(--line-1)",
                borderRadius: 4,
                color: "var(--fg-4)",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
              }}
            >
              <SignalIcon style={{ width: 14, height: 14, flexShrink: 0 }} />
              No matching signals
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {relevant.map((sig) => (
                <div
                  key={sig.id}
                  style={{
                    padding: "7px 9px",
                    background: "var(--bg-inset)",
                    border: "1px solid var(--line-1)",
                    borderRadius: 3,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span
                      style={{
                        fontSize: 8,
                        fontFamily: "var(--font-mono)",
                        color: "var(--accent-dim)",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      {sig.layer}
                    </span>
                    <span style={{ fontSize: 8, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
                      {sig.source_name}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--fg-2)",
                      lineHeight: 1.4,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {sig.content ?? sig.source_name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function GeoMapPage() {
  const [selected, setSelected] = useState<string>("hormuz");
  const [layerVis, setLayerVis] = useState<LayerVisibility>({
    chokepoints: true,
    shipping: true,
    ais: true,
    scenarios: true,
    bgp: true,
  });

  const { data: signals } = useApiData<ApiSignal[]>({
    fetcher: () => api.signals({ limit: 200 }),
    fallback: [],
    pollInterval: 30_000,
  });

  const selectedCP = CHOKEPOINTS.find((c) => c.id === selected) ?? CHOKEPOINTS[0];

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "grid",
        gridTemplateColumns: "1fr 320px",
        gap: 0,
      }}
    >
      {/* Map canvas */}
      <div
        style={{
          position: "relative",
          background: "var(--bg-0)",
          borderRight: "1px solid var(--line-2)",
          overflow: "hidden",
        }}
      >
        <GulfSvgMap
          selected={selected}
          layerVis={layerVis}
          onSelect={setSelected}
        />
        <LayerLegend layerVis={layerVis} setLayerVis={setLayerVis} />
        <Scalebar />
        <Compass />
      </div>

      {/* Side panel */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-1)",
          minHeight: 0,
          borderLeft: "none",
        }}
      >
        <SidePanel cp={selectedCP} signals={signals} />
      </div>
    </div>
  );
}
