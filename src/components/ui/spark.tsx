"use client";

interface SparkProps {
  values: number[];
  w?: number;
  h?: number;
  stroke?: string;
  fill?: string;
}

export function Spark({ values, w = 80, h = 24, stroke = "var(--accent)", fill }: SparkProps) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pStr = pts.join(" ");
  const last = pts[pts.length - 1];
  const areaPath = fill
    ? `M${pts[0]} ${pts.slice(1).map((p) => `L${p}`).join(" ")} L${w},${h} L0,${h} Z`
    : undefined;
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      {fill && areaPath && <path d={areaPath} fill={fill} opacity={0.12} />}
      <polyline points={pStr} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {last && (
        <circle cx={last.split(",")[0]} cy={last.split(",")[1]} r="2" fill={stroke} />
      )}
    </svg>
  );
}
