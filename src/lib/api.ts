const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export interface ApiSignal {
  id: string;
  layer: string;
  source_name: string;
  content: string | null;
  timestamp: string;
  alert_flag: boolean;
  alert_severity: string | null;
  confidence: number;
  normalized_score?: number;
  raw_value?: number;
  conflict_id?: string | null;
}

export const api = {
  health: () => apiFetch<{
    status: string;
    version: string;
    timestamp: string;
    layers: Record<string, string>;
  }>("/api/v1/health"),

  signals: (params?: { layer?: string; alert_only?: boolean; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.layer) sp.set("layer", params.layer);
    if (params?.alert_only) sp.set("alert_only", "true");
    if (params?.limit) sp.set("limit", String(params.limit));
    const qs = sp.toString();
    return apiFetch<ApiSignal[]>(`/api/v1/signals${qs ? `?${qs}` : ""}`);
  },

  signalsFeed: (limit = 20) =>
    apiFetch<ApiSignal[]>(`/api/v1/signals/feed?limit=${limit}`),

  signalsCount: () =>
    apiFetch<Record<string, number>>("/api/v1/signals/count"),

  conflicts: () => apiFetch("/api/v1/conflicts"),
  predictions: () => apiFetch("/api/v1/predictions"),
};

const LAYER_META: Record<string, { name: string; badgeClass: string; dotColor: string }> = {
  L1:  { name: "MEDIA",   badgeClass: "bg-danger-50 text-danger border-danger/30",     dotColor: "#DC2626" },
  L2:  { name: "SOCIAL",  badgeClass: "bg-purple/10 text-purple border-purple/30",     dotColor: "#4F46E5" },
  L3:  { name: "SHIPPING", badgeClass: "bg-teal/10 text-teal border-teal/30",          dotColor: "#0891B2" },
  L4:  { name: "AVIATION", badgeClass: "bg-brand-50 text-brand border-brand/30",       dotColor: "#0284C7" },
  L5:  { name: "COMM",    badgeClass: "bg-warning-50 text-warning border-warning/30",  dotColor: "#D97706" },
  L6:  { name: "FX",      badgeClass: "bg-purple/10 text-purple border-purple/30",     dotColor: "#7C3AED" },
  L7:  { name: "EQUITY",  badgeClass: "bg-success-50 text-success border-success/30",  dotColor: "#059669" },
  L8:  { name: "SAT",     badgeClass: "bg-brand-50 text-brand border-brand/30",        dotColor: "#2563EB" },
  L9:  { name: "ECON",    badgeClass: "bg-warning-50 text-warning border-warning/30",  dotColor: "#B45309" },
  L10: { name: "CONNECT", badgeClass: "bg-danger-50 text-danger border-danger/30",     dotColor: "#DC2626" },
};

export function mapApiSignal(s: ApiSignal) {
  const meta = LAYER_META[s.layer] || { name: s.layer, badgeClass: "bg-gray-100 text-gray-500 border-gray-200", dotColor: "#6B7280" };
  const ts = new Date(s.timestamp);
  const diffMs = Date.now() - ts.getTime();
  const diffMin = Math.max(1, Math.round(diffMs / 60000));
  const timeAgo = diffMin < 60 ? `${diffMin}m` : diffMin < 1440 ? `${Math.floor(diffMin / 60)}h` : `${Math.floor(diffMin / 1440)}d`;

  return {
    id: s.id,
    layer: s.layer,
    layerName: meta.name,
    source: s.source_name.replace(/^(Polygon|NewsAPI|CloudflareRadar|IODA|AV|OXR)\//, ""),
    content: s.content || "",
    timeAgo,
    badgeClass: meta.badgeClass,
    dotColor: s.alert_flag ? "#DC2626" : meta.dotColor,
    biasScore: s.confidence > 0.8 ? Number((s.confidence * 10).toFixed(1)) : undefined,
    alertFlag: s.alert_flag,
    alertSeverity: s.alert_severity,
    rawValue: s.raw_value,
    normalizedScore: s.normalized_score,
    sourceName: s.source_name,
    timestamp: s.timestamp,
  };
}
