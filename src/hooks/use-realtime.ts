"use client";

/**
 * WebSocket hook for real-time signal delivery.
 *
 * Connects to /api/v1/ws/{conflictId} and appends incoming messages to a
 * capped ring buffer (max 50 entries). Reconnects with exponential back-off
 * on disconnect. On reconnect, the caller's existing REST-polled data fills
 * the gap automatically.
 *
 * Usage:
 *   const { signals, convergenceScore, connected } = useRealtime(conflictId);
 */

import { useEffect, useRef, useState, useCallback } from "react";

export interface RealtimeSignal {
  id: string;
  layer: string;
  source_name: string;
  content: string | null;
  timestamp: string;
  alert_flag: boolean;
  alert_severity: string;
  deviation_pct: number | null;
  normalized_score: number;
  conflict_id: string | null;
}

interface UseRealtimeResult {
  signals: RealtimeSignal[];
  convergenceScore: number | null;
  connected: boolean;
}

const MAX_SIGNALS = 50;
const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 30_000;

function getWsUrl(conflictId: string): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  // Convert https:// → wss://, http:// → ws://
  const wsBase = apiUrl.replace(/^https?/, (m) => (m === "https" ? "wss" : "ws"));
  if (wsBase) return `${wsBase}/api/v1/ws/${conflictId}`;
  // Local dev
  return `ws://localhost:8000/api/v1/ws/${conflictId}`;
}

export function useRealtime(conflictId: string | null): UseRealtimeResult {
  const [signals, setSignals] = useState<RealtimeSignal[]>([]);
  const [convergenceScore, setConvergenceScore] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(true);

  const connect = useCallback(() => {
    if (!conflictId || !activeRef.current) return;

    const url = getWsUrl(conflictId);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      attemptRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg: { type: string; data: unknown } = JSON.parse(event.data);
        if (msg.type === "signal" || msg.type === "alert") {
          setSignals((prev) => [msg.data as RealtimeSignal, ...prev].slice(0, MAX_SIGNALS));
        } else if (msg.type === "convergence") {
          const d = msg.data as { score: number };
          setConvergenceScore(d.score);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      if (!activeRef.current) return;
      // Exponential back-off: 1s, 2s, 4s, 8s, ... max 30s
      const delay = Math.min(BACKOFF_BASE_MS * 2 ** attemptRef.current, BACKOFF_MAX_MS);
      attemptRef.current += 1;
      timerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
  }, [conflictId]);

  useEffect(() => {
    activeRef.current = true;
    connect();
    return () => {
      activeRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { signals, convergenceScore, connected };
}
