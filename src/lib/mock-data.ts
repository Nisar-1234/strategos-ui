export const kpiCards = [
  { label: "Active Predictions", value: "47", sub: "12 high confidence", color: "text-brand" },
  { label: "Conflicts Monitored", value: "23", sub: "6 escalating", color: "text-danger" },
  { label: "Signal Layers", value: "10/10", sub: "All nominal", color: "text-success" },
  { label: "Convergence Score", value: "8.4", sub: "Top event - High confidence", color: "text-success" },
  { label: "Pred. Accuracy", value: "84.7%", sub: "Last 30 days", color: "text-muted" },
];

export const topPredictions = [
  { name: "Gaza Conflict", probability: 82, level: "HIGH" as const, color: "#B91C1C" },
  { name: "Ukraine Conflict", probability: 76, level: "HIGH" as const, color: "#1D4ED8" },
  { name: "Taiwan Strait", probability: 61, level: "MED" as const, color: "#0369A1" },
  { name: "Sudan Civil War", probability: 54, level: "MED" as const, color: "#15803D" },
  { name: "Iran Nuclear", probability: 41, level: "LOW" as const, color: "#7C3AED" },
];

export type SignalLayer = "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7" | "L8" | "L9" | "L10";

export interface Signal {
  id: string;
  layer: SignalLayer;
  layerName: string;
  source: string;
  content: string;
  timeAgo: string;
  badgeClass: string;
  dotColor: string;
  biasScore?: number;
}

export const liveSignals: Signal[] = [
  {
    id: "s1",
    layer: "L3",
    layerName: "MARITIME",
    source: "L3 Phase 2",
    content:
      "MarineTraffic AIS not live yet — Phase 2. (Demo placeholder; real signals require AIS integration.)",
    timeAgo: "4m",
    badgeClass: "bg-teal/10 text-teal border-teal/30",
    dotColor: "#0891B2",
  },
  {
    id: "s2",
    layer: "L1",
    layerName: "MEDIA",
    source: "Reuters",
    content: "Israeli cabinet convenes emergency session. Ground offensive expansion confirmed by IDF spokesperson.",
    timeAgo: "7m",
    badgeClass: "bg-danger-50 text-danger border-danger/30",
    dotColor: "#DC2626",
    biasScore: 8.4,
  },
  {
    id: "s3",
    layer: "L5",
    layerName: "COMM",
    source: "Gold API",
    content: "XAU/USD +2.4% to $2,847. Silver +1.8%. Correlates with Hormuz shipping anomaly.",
    timeAgo: "9m",
    badgeClass: "bg-warning-50 text-warning border-warning/30",
    dotColor: "#D97706",
  },
  {
    id: "s4",
    layer: "L4",
    layerName: "AVIATION",
    source: "FlightRadar24",
    content: "NOTAM LLBB issued - Israeli airspace. 14 commercial overflights rerouted to Cyprus corridor.",
    timeAgo: "12m",
    badgeClass: "bg-brand-50 text-brand border-brand/30",
    dotColor: "#0284C7",
  },
  {
    id: "s5",
    layer: "L6",
    layerName: "FX",
    source: "Open FX",
    content: "USD/ILS weakening 1.2%. ILS at 3.74 - 30d low. Capital flight pattern consistent.",
    timeAgo: "15m",
    badgeClass: "bg-purple/10 text-purple border-purple/30",
    dotColor: "#7C3AED",
  },
  {
    id: "s6",
    layer: "L7",
    layerName: "EQUITY",
    source: "Alpha Vantage",
    content: "RTX +2.1%, LMT +1.8%, BAES +2.7%. Defense sector outperforming S&P 500 by 380bps today.",
    timeAgo: "18m",
    badgeClass: "bg-success-50 text-success border-success/30",
    dotColor: "#059669",
  },
  {
    id: "s7",
    layer: "L2",
    layerName: "SOCIAL",
    source: "Telegram",
    content:
      "Primary L2: channel volume spike. Supplementary: Reddit r/worldnews — +340% vs 24h avg. Bot-filter: 18% automated.",
    timeAgo: "21m",
    badgeClass: "bg-purple/10 text-purple border-purple/30",
    dotColor: "#4F46E5",
  },
  {
    id: "s8b",
    layer: "L8",
    layerName: "SAT",
    source: "NASA FIRMS / VIIRS",
    content:
      "Thermal anomalies (FIRMS) + VIIRS VNP46A2 nighttime-lights coverage (CMR) — conflict-zone AOI proxy.",
    timeAgo: "22m",
    badgeClass: "bg-blue-500/10 text-blue-700 border-blue-500/30",
    dotColor: "#2563EB",
  },
  {
    id: "s8",
    layer: "L10",
    layerName: "CONNECT",
    source: "Cloudflare Radar",
    content: "Gaza internet traffic -62% vs baseline. BGP route withdrawals from AS12975 detected.",
    timeAgo: "24m",
    badgeClass: "bg-danger-50 text-danger border-danger/30",
    dotColor: "#DC2626",
  },
];

export const gameTheorySummary = {
  conflict: "Gaza Conflict",
  dominantStrategy: "Ceasefire Negotiation",
  confidence: "HIGH",
  convergenceScore: 8.4,
  nashEquilibrium: true,
  matrix: [
    ["-3,-3", "2,-1"],
    ["1,1", "0,0"],
  ],
  headers: {
    cols: ["Resist", "Negotiate"],
    rows: ["Escalate", "Negotiate"],
  },
};

export const probabilityData = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  escalation: 35 + Math.random() * 20 + i * 0.8,
  negotiation: 25 - Math.random() * 5 - i * 0.2,
  stalemate: 22 - Math.random() * 3,
  resolution: 18 - Math.random() * 4 - i * 0.1,
})).map((d) => {
  const total = d.escalation + d.negotiation + d.stalemate + d.resolution;
  return {
    day: d.day,
    escalation: Math.round((d.escalation / total) * 100),
    negotiation: Math.round((d.negotiation / total) * 100),
    stalemate: Math.round((d.stalemate / total) * 100),
    resolution: Math.round((d.resolution / total) * 100),
  };
});
