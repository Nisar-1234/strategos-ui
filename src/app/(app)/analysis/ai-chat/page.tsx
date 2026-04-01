"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { PaperAirplaneIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { api, type ApiChatResponse } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  probabilities?: Record<string, number> | null;
  convergence_score?: number | null;
  sources?: { name: string; layer: string; bias_score: number | null }[];
  confidence?: string;
}

export default function AiChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Welcome to STRATEGOS AI Analysis. I can help you analyze geopolitical situations, assess conflict probabilities, and provide intelligence-backed insights. Ask me anything about current conflicts, predictions, or signal analysis.",
      confidence: "HIGH",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const resp: ApiChatResponse = await api.chat(text, undefined, sessionId || undefined);
      setSessionId(resp.session_id);
      setLive(true);

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: resp.analysis,
        probabilities: resp.probabilities,
        convergence_score: resp.convergence_score,
        sources: resp.sources,
        confidence: resp.confidence,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setLive(false);
      const fallbackMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: "I'm currently unable to connect to the analysis backend. Please ensure the STRATEGOS API is running on localhost:8000. In the meantime, here's what I can tell you: the system monitors 10 signal layers across geopolitical, economic, and connectivity domains to provide convergence-based predictions.",
        confidence: "LOW",
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "What is the current convergence score for the Gaza conflict?",
    "Analyze the Russia-Ukraine situation using game theory",
    "Which signal layers show the most activity today?",
    "What are the top escalation risks this week?",
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-navy leading-tight">AI Analysis</h1>
          <p className="text-[12px] text-muted mt-0.5">Natural language geopolitical intelligence powered by Claude</p>
        </div>
        <div className="flex items-center gap-2">
          {live ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-[9px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> CONNECTED
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 text-[9px] font-bold">OFFLINE</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[70%] rounded-lg p-4", msg.role === "user" ? "bg-brand text-white" : "bg-card border border-border")}>
              <p className={cn("text-[12px] leading-relaxed whitespace-pre-wrap", msg.role === "user" ? "text-white" : "text-navy")}>{msg.content}</p>

              {msg.probabilities && (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Probabilities</p>
                  <div className="space-y-1.5">
                    {Object.entries(msg.probabilities).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-[10px] text-navy capitalize w-20">{key}</span>
                        <div className="flex-1 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                          <div className="h-full bg-brand rounded-full" style={{ width: `${val * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-semibold text-navy w-10 text-right">{(val * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {msg.convergence_score != null && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] text-muted">Convergence Score:</span>
                  <span className="text-[12px] font-bold text-navy">{msg.convergence_score}/10</span>
                </div>
              )}

              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Sources</p>
                  <div className="flex flex-wrap gap-1">
                    {msg.sources.map((src, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded text-[9px] bg-surface border border-border text-navy">
                        {src.layer}: {src.name}{src.bias_score != null ? ` (${src.bias_score})` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {msg.confidence && msg.role === "assistant" && (
                <div className="mt-2 flex items-center gap-1">
                  <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold border",
                    msg.confidence === "HIGH" ? "bg-green-50 text-green-700 border-green-200" :
                    msg.confidence === "MEDIUM" ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-gray-100 text-gray-500 border-gray-200"
                  )}>
                    {msg.confidence}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-2">
              <ArrowPathIcon className="w-4 h-4 text-brand animate-spin" />
              <span className="text-[11px] text-muted">Analyzing across 10 signal layers...</span>
            </div>
          </div>
        )}

        {messages.length === 1 && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => { setInput(s); }}
                className="text-left p-3 rounded-lg border border-border bg-card hover:border-brand/40 transition-colors"
              >
                <p className="text-[11px] text-navy leading-relaxed">{s}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask about conflicts, predictions, or signal analysis..."
            className="flex-1 border border-border rounded-lg px-4 py-2.5 text-[12px] text-navy placeholder:text-muted focus:outline-none focus:border-brand/50"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className={cn("p-2.5 rounded-lg transition-colors", input.trim() && !loading ? "bg-brand text-white hover:bg-brand-mid" : "bg-gray-100 text-gray-400")}
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[9px] text-muted mt-1.5">AI responses powered by all 10 signal layers. Every source citation includes its bias score.</p>
      </div>
    </div>
  );
}
