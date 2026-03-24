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

export const api = {
  health: () => apiFetch("/api/v1/health"),
  signals: () => apiFetch("/api/v1/signals"),
  conflicts: () => apiFetch("/api/v1/conflicts"),
  predictions: () => apiFetch("/api/v1/predictions"),
};
