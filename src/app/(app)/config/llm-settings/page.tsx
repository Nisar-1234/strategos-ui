"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { api, ApiSetting } from "@/lib/api";
import { useApiData } from "@/hooks/use-api-data";
import { CogIcon, BeakerIcon } from "@heroicons/react/24/outline";

const promptTemplates: Record<string, string> = {
  "Conflict Analysis":
    'Analyze the provided text for signs of conflict. Identify key actors, their stated positions, underlying interests, and potential points of escalation.\n\nFormat the output as a JSON object with keys: \'conflict_summary\', \'risk_score\', \'key_actors\', and \'escalation_points\'. Ensure the analysis is objective and neutral.',
  "Game Theory":
    'Model the situation as a strategic game. Identify all rational actors, their available strategies, and likely payoffs. Determine if Nash equilibria exist and recommend optimal strategies.\n\nReturn a JSON object with keys: \'players\', \'strategies\', \'payoff_matrix\', \'equilibria\', and \'recommendations\'.',
  "Sentiment Analysis":
    'Perform multi-dimensional sentiment analysis on the input. Score overall sentiment, emotional intensity, and detect propaganda or bias indicators.\n\nReturn a JSON object with keys: \'sentiment_score\', \'emotion_breakdown\', \'bias_indicators\', and \'confidence\'.',
  Custom: "",
};

export default function LlmSettingsPage() {
  const [activeTab, setActiveTab] = useState("Conflict Analysis");
  const [temperature, setTemperature] = useState(0.3);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [confidence, setConfidence] = useState(75);
  const [rateLimiting, setRateLimiting] = useState(true);
  const [caching, setCaching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const { data: llmSettings, live, refresh } = useApiData<ApiSetting[]>({
    fetcher: () => api.settingsLlm(),
    fallback: [],
    pollInterval: 0,
  });

  const settingsMap = Object.fromEntries(llmSettings.map((s) => [s.key, s.value]));

  const displayTemp = settingsMap["llm_temperature"] ? parseFloat(settingsMap["llm_temperature"]) : temperature;
  const displayTopP = settingsMap["llm_top_p"] ? parseFloat(settingsMap["llm_top_p"]) : topP;
  const displayModel = settingsMap["llm_primary_model"] || "claude-sonnet-4-6";
  const displayFallback = settingsMap["llm_fallback_model"] || "gpt-4o";

  const handleSaveAll = useCallback(async () => {
    setSaving(true);
    try {
      await Promise.all([
        api.saveSetting("llm_temperature", temperature.toString(), "llm"),
        api.saveSetting("llm_top_p", topP.toString(), "llm"),
        api.saveSetting("llm_max_tokens", maxTokens.toString(), "llm"),
        api.saveSetting("llm_confidence_threshold", confidence.toString(), "llm"),
        api.saveSetting("llm_rate_limiting", rateLimiting.toString(), "llm"),
        api.saveSetting("llm_caching", caching.toString(), "llm"),
      ]);
      setSaveMsg("Saved!");
      refresh();
      setTimeout(() => setSaveMsg(""), 2000);
    } catch {
      setSaveMsg("Error saving");
    }
    setSaving(false);
  }, [temperature, topP, maxTokens, confidence, rateLimiting, caching, refresh]);

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="mb-5 flex items-center gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-navy">LLM Configuration</h1>
          <p className="text-[13px] text-muted mt-0.5">
            Manage AI models and language processing settings
          </p>
        </div>
        <span className={cn(
          "px-2 py-0.5 rounded text-[9px] font-bold tracking-wider ml-auto",
          live ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600",
        )}>
          {live ? "SYNCED" : "LOCAL ONLY"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* LEFT COLUMN — Model Selection */}
        <div className="space-y-4">
          <h2 className="text-[13px] font-semibold text-navy">Model Selection</h2>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <CogIcon className="w-4 h-4 text-muted" />
              <span className="text-[13px] font-semibold text-navy">Primary Analysis Model</span>
              <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-50 text-green-700 border border-green-200">
                Active
              </span>
            </div>
            <div className="text-[12px] text-navy mb-1.5 font-medium">{displayModel}</div>
            <p className="text-[10px] text-muted mb-3">Provider: Anthropic</p>

            <label className="text-[11px] text-navy font-medium">Temperature</label>
            <div className="flex items-center gap-2 mt-1 mb-3">
              <input type="range" min={0} max={1} step={0.01} value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="flex-1 h-1.5 accent-brand cursor-pointer" />
              <span className="text-[11px] text-navy font-medium w-7 text-right">{temperature.toFixed(1)}</span>
            </div>

            <label className="text-[11px] text-navy font-medium">Max tokens</label>
            <input type="number" value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value) || 4096)}
              className="w-full bg-surface-100 border border-border rounded-md px-2.5 py-1 text-[12px] text-navy mt-1 mb-3" />

            <label className="text-[11px] text-navy font-medium">Top-p</label>
            <div className="flex items-center gap-2 mt-1 mb-3">
              <input type="range" min={0} max={1} step={0.01} value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="flex-1 h-1.5 accent-brand cursor-pointer" />
              <span className="text-[11px] text-navy font-medium w-7 text-right">{topP.toFixed(1)}</span>
            </div>

            <button className="bg-brand hover:bg-brand-mid text-white text-[11px] font-medium px-3 py-1 rounded-md flex items-center gap-1">
              <BeakerIcon className="w-3.5 h-3.5" />
              Test
            </button>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-4 rounded-full border-2 border-muted" />
              <span className="text-[13px] font-semibold text-navy">Fallback Model</span>
              <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-500">
                Standby
              </span>
            </div>
            <div className="text-[12px] text-navy mb-1.5 font-medium">{displayFallback}</div>
            <p className="text-[10px] text-muted mb-3">Provider: OpenAI</p>
          </div>
        </div>

        {/* MIDDLE COLUMN — System Prompts */}
        <div className="space-y-4">
          <h2 className="text-[13px] font-semibold text-navy">System Prompts</h2>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-[13px] font-semibold text-navy mb-3">Prompt Templates</h3>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.keys(promptTemplates).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                    activeTab === tab ? "bg-brand text-white" : "bg-surface-100 text-navy hover:bg-surface-200"
                  )}>
                  {tab}
                </button>
              ))}
            </div>
            <textarea value={promptTemplates[activeTab]} readOnly rows={12}
              className="w-full bg-surface-100 border border-border rounded-md px-3 py-2 text-[11px] text-navy leading-relaxed resize-none mb-3" />
            <div className="flex gap-2">
              <button className="bg-brand hover:bg-brand-mid text-white text-[11px] font-medium px-3 py-1.5 rounded-md">Save</button>
              <button className="border border-border text-navy text-[11px] font-medium px-3 py-1.5 rounded-md hover:bg-surface-100">Preview</button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — Performance */}
        <div className="space-y-4">
          <h2 className="text-[13px] font-semibold text-navy">Current Config</h2>

          <div className="bg-card border border-border rounded-lg p-4 space-y-5">
            <div>
              <h3 className="text-[12px] font-semibold text-navy mb-2.5">Stored LLM Settings</h3>
              <div className="space-y-2">
                {llmSettings.length === 0 && (
                  <p className="text-[11px] text-muted">No settings saved yet. Configure and save below.</p>
                )}
                {llmSettings.map((s) => (
                  <div key={s.key} className="flex items-center justify-between">
                    <span className="text-[11px] text-muted">{s.key.replace("llm_", "")}</span>
                    <span className="text-[11px] font-semibold text-navy">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[12px] font-semibold text-navy mb-2.5">Confidence Threshold</h3>
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={100} step={1} value={confidence}
                  onChange={(e) => setConfidence(parseInt(e.target.value))}
                  className="flex-1 h-1.5 accent-brand cursor-pointer" />
                <span className="text-[11px] text-navy font-medium w-8 text-right">{confidence}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW — Advanced Settings */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <CogIcon className="w-4 h-4 text-muted" />
          <h2 className="text-[13px] font-semibold text-navy">Advanced Settings</h2>
        </div>
        <div className="flex items-end gap-6">
          <div className="flex-1">
            <label className="text-[11px] text-navy font-medium mb-1 block">Rate limiting</label>
            <button onClick={() => setRateLimiting(!rateLimiting)}
              className={cn("w-9 h-5 rounded-full relative transition-colors", rateLimiting ? "bg-brand" : "bg-gray-300")}>
              <div className={cn("absolute top-[2px] w-[16px] h-[16px] bg-white rounded-full transition-all shadow-sm", rateLimiting ? "right-[2px]" : "left-[2px]")} />
            </button>
          </div>
          <div className="flex-1">
            <label className="text-[11px] text-navy font-medium mb-1 block">Caching</label>
            <button onClick={() => setCaching(!caching)}
              className={cn("w-9 h-5 rounded-full relative transition-colors", caching ? "bg-brand" : "bg-gray-300")}>
              <div className={cn("absolute top-[2px] w-[16px] h-[16px] bg-white rounded-full transition-all shadow-sm", caching ? "right-[2px]" : "left-[2px]")} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSaveAll} disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white text-[11px] font-medium px-4 py-1.5 rounded-md whitespace-nowrap disabled:opacity-50">
              {saving ? "Saving..." : "Save All Settings"}
            </button>
            {saveMsg && <span className="text-[11px] text-green-600 font-medium">{saveMsg}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
