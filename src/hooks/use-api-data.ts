"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseApiDataOptions<T> {
  fetcher: () => Promise<T>;
  fallback: T;
  /** Polling interval in ms. 0 = no polling. Default 30_000. */
  pollInterval?: number;
  /** Skip initial fetch (useful when dependencies aren't ready). */
  skip?: boolean;
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

  useEffect(() => {
    if (skip) return;
    load();
    if (pollInterval > 0) {
      const id = setInterval(load, pollInterval);
      return () => clearInterval(id);
    }
  }, [load, pollInterval, skip]);

  return { data, loading, live, error, refresh: load };
}
