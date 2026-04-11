/**
 * Set `NEXT_PUBLIC_API_URL` to your Amplify site URL (e.g. https://xxx.amplifyapp.com) so
 * `/api/v1/...` calls hit the same origin; Amplify Hosting rewrite rules proxy them to EC2.
 * Local dev falls back to http://localhost:8000.
 */
function getApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") return "http://localhost:8000";
  return "";
}

const API_BASE = getApiBase();

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

/**
 * Attempt an API call; if the backend is unreachable return the fallback value.
 * This lets every page work in "offline" mode with mock data while seamlessly
 * switching to live data when the API is running.
 */
export async function apiFetchWithFallback<T>(
  fetcher: () => Promise<T>,
  fallback: T,
): Promise<{ data: T; live: boolean }> {
  try {
    const data = await fetcher();
    return { data, live: true };
  } catch {
    return { data: fallback, live: false };
  }
}

/* ------------------------------------------------------------------ */
/*  Shared types                                                       */
/* ------------------------------------------------------------------ */

export interface ApiSignal {
  id: string;
  layer: string;
  source_name: string;
  content: string | null;
  timestamp: string;
  alert_flag: boolean;
  alert_severity: string | null;
  deviation_pct: number | null;
  confidence: number;
  normalized_score?: number;
  raw_value?: number;
  conflict_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ApiLayerStatus {
  layer: string;
  status: "ACTIVE" | "DEGRADED" | "OFFLINE";
  last_signal_at: string | null;
  signal_count_24h: number;
}

export interface ApiConflict {
  id: string;
  name: string;
  region: string;
  status: string;
  description: string | null;
  created_at: string;
}

export interface ApiPrediction {
  id: string;
  conflict_id: string;
  conflict_name: string;
  escalation_prob: number;
  negotiation_prob: number;
  stalemate_prob: number;
  resolution_prob: number;
  confidence: string;
  convergence_score: number;
  created_at: string;
}

export interface ApiGameTheoryResult {
  payoff_matrix: number[][];
  nash_equilibria: Record<string, string>[];
  dominant_strategies: Record<string, string>;
  recommended_strategy: string;
  rationale: string;
  confidence: string;
  actor_labels: Record<string, string[]>;
}

export interface ApiChatResponse {
  analysis: string;
  probabilities: Record<string, number> | null;
  convergence_score: number | null;
  sources: { name: string; layer: string; bias_score: number | null }[];
  confidence: string;
  session_id: string;
}

export interface ApiHealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  layers: Record<string, string>;
}

export interface ApiSetting {
  key: string;
  value: string;
  category: string;
  updated_at: string;
}

export interface ApiTimeseriesBucket {
  timestamp: string;
  layer: string;
  signal_count: number;
  avg_score: number;
  avg_confidence: number;
  alert_count: number;
}

/* ------------------------------------------------------------------ */
/*  API client                                                         */
/* ------------------------------------------------------------------ */

export const api = {
  health: () => apiFetch<ApiHealthResponse>("/api/v1/health"),

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

  signalsTimeseries: (params?: { layer?: string; days?: number; bucket?: string }) => {
    const sp = new URLSearchParams();
    if (params?.layer) sp.set("layer", params.layer);
    if (params?.days) sp.set("days", String(params.days));
    if (params?.bucket) sp.set("bucket", params.bucket);
    const qs = sp.toString();
    return apiFetch<ApiTimeseriesBucket[]>(`/api/v1/signals/timeseries${qs ? `?${qs}` : ""}`);
  },

  conflicts: (params?: { status?: string; region?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set("status", params.status);
    if (params?.region) sp.set("region", params.region);
    const qs = sp.toString();
    return apiFetch<ApiConflict[]>(`/api/v1/conflicts${qs ? `?${qs}` : ""}`);
  },

  conflict: (id: string) => apiFetch<ApiConflict>(`/api/v1/conflicts/${id}`),

  conflictSignals: (id: string, params?: { limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.limit != null) sp.set("limit", String(params.limit));
    const qs = sp.toString();
    return apiFetch<ApiSignal[]>(
      `/api/v1/conflicts/${encodeURIComponent(id)}/signals${qs ? `?${qs}` : ""}`,
    );
  },

  conflictConvergence: (id: string, days = 30) =>
    apiFetch<{ conflict_id: string; scores: { timestamp: string; score: number }[] }>(
      `/api/v1/conflicts/${id}/convergence?days=${days}`,
    ),

  predictions: (params?: { confidence?: string; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.confidence) sp.set("confidence", params.confidence);
    if (params?.limit) sp.set("limit", String(params.limit));
    const qs = sp.toString();
    return apiFetch<ApiPrediction[]>(`/api/v1/predictions${qs ? `?${qs}` : ""}`);
  },

  prediction: (id: string) => apiFetch<ApiPrediction>(`/api/v1/predictions/${id}`),

  gameTheory: (conflictId: string, actors?: string[]) =>
    apiFetch<ApiGameTheoryResult>("/api/v1/game-theory/compute", {
      method: "POST",
      body: JSON.stringify({ conflict_id: conflictId, actors }),
    }),

  chat: (message: string, conflictId?: string, sessionId?: string) =>
    apiFetch<ApiChatResponse>("/api/v1/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        conflict_id: conflictId,
        session_id: sessionId,
      }),
    }),

  layerStatus: () =>
    apiFetch<ApiLayerStatus[]>("/api/v1/signals/layer-status"),

  settings: (category?: string) => {
    const qs = category ? `?category=${category}` : "";
    return apiFetch<ApiSetting[]>(`/api/v1/settings${qs}`);
  },

  settingsApiKeys: () => apiFetch<ApiSetting[]>("/api/v1/settings/api-keys"),

  settingsLlm: () => apiFetch<ApiSetting[]>("/api/v1/settings/llm"),

  settingsPreferences: () => apiFetch<ApiSetting[]>("/api/v1/settings/preferences"),

  saveSetting: (key: string, value: string, category: string) =>
    apiFetch<{ status: string; key: string }>(`/api/v1/settings/${encodeURIComponent(key)}`, {
      method: "PUT",
      body: JSON.stringify({ key, value, category }),
    }),

  deleteSetting: (key: string) =>
    apiFetch<{ status: string; key: string }>(`/api/v1/settings/${encodeURIComponent(key)}`, {
      method: "DELETE",
    }),
};

const LAYER_META: Record<string, { name: string; badgeClass: string; dotColor: string }> = {
  L1:  { name: "MEDIA",   badgeClass: "bg-danger-50 text-danger border-danger/30",     dotColor: "#DC2626" },
  L2:  { name: "SOCIAL",  badgeClass: "bg-purple/10 text-purple border-purple/30",     dotColor: "#4F46E5" },
  L3:  { name: "MARITIME", badgeClass: "bg-teal/10 text-teal border-teal/30",          dotColor: "#0891B2" },
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
