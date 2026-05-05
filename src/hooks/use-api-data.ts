"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseApiDataOptions<T> {
  fetcher: () => Promise<T>;
  fallback: T;
  /** Polling interval in ms. 0 = no polling. Default 30_000. */
  pollInterval?: number;
  /** Skip initial fetch (useful when dependencies aren't ready). */
  skip?: boolean;
  /** Extra values that trigger an immediate re-fetch when they change. */
  deps?: unknown[];
}

interface UseApiDataResult<T> {
  data: T;
  loading: boolean;
  /** True when data came from the live API (not fallback). */
  live: boolean;
  error: string | null;
  refresh: () => void;
}

export function useApiData<T>({
  fetcher,
  fallback,
  pollInterval = 30_000,
  skip = false,
  deps,
}: UseApiDataOptions<T>): UseApiDataResult<T> {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(!skip);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      setData(result);
      setLive(true);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "API unreachable";
      setError(msg);
      setLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Serialize deps to a stable string so the effect can react to value changes
  // without requiring a fixed-length dependency array.
  const depsKey = JSON.stringify(deps ?? []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (skip) return;
    load();
    if (pollInterval > 0) {
      const id = setInterval(load, pollInterval);
      return () => clearInterval(id);
    }
  }, [load, pollInterval, skip, depsKey]);

  return { data, loading, live, error, refresh: load };
}
