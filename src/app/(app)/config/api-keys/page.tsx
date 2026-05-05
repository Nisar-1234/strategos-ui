"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { api, ApiSetting } from "@/lib/api";
import { useApiData } from "@/hooks/use-api-data";
import {
  PlusIcon,
  PlayIcon,
  PencilIcon,
  TrashIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

const SERVICE_OPTIONS = [
  "NEWSAPI_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "POLYGON_API_KEY",
  "ALPHA_VANTAGE_KEY",
  "METALS_API_KEY",
  "OPEN_EXCHANGE_RATES_KEY",
  "CLOUDFLARE_RADAR_TOKEN",
  "MAPBOX_TOKEN",
  "PINECONE_API_KEY",
];

const statusConfig = {
  Active: { dot: "bg-green-500", text: "text-green-600" },
  Empty: { dot: "bg-gray-400", text: "text-gray-500" },
} as const;

export default function ApiKeysPage() {
  const [addExpanded, setAddExpanded] = useState(true);
  const [newService, setNewService] = useState("");
  const [newKey, setNewKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const { data: apiKeys, live, refresh } = useApiData<ApiSetting[]>({
    fetcher: () => api.settingsApiKeys(),
    fallback: [],
    pollInterval: 0,
  });

  const { data: healthData } = useApiData<{ total_signals?: number; layers?: Record<string, string> }>({
    fetcher: () => api.health(),
    fallback: {},
    pollInterval: 30_000,
  });

  const handleSave = useCallback(async () => {
    if (!newService || !newKey) return;
    setSaving(true);
    try {
      await api.saveSetting(newService, newKey, "api_keys");
      setNewService("");
      setNewKey("");
      refresh();
    } catch { /* ignore */ }
    setSaving(false);
  }, [newService, newKey, refresh]);

  const handleDelete = useCallback(async (key: string) => {
    try {
      await api.deleteSetting(key);
      refresh();
    } catch { /* ignore */ }
  }, [refresh]);

  const handleTest = useCallback(async (key: string) => {
    setTesting(key);
    try {
      await api.health();
    } catch { /* ignore */ }
    setTimeout(() => setTesting(null), 1500);
  }, []);

  const displayKeys = SERVICE_OPTIONS.map((service) => {
    const saved = apiKeys.find((k) => k.key === service);
    return {
      service,
      key: saved?.value || "",
      status: saved ? "Active" as const : "Empty" as const,
      updatedAt: saved?.updated_at || "",
    };
  });

  const activeCount = apiKeys.length;
  const totalSignals = (healthData as Record<string, unknown>)?.total_signals ?? 0;

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-bold text-navy">API Keys Management</h1>
          <span className={cn(
            "px-2 py-0.5 rounded text-[9px] font-bold tracking-wider",
            live ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600",
          )}>
            {live ? "CONNECTED" : "OFFLINE"}
          </span>
        </div>
        <button
          onClick={() => setAddExpanded(!addExpanded)}
          className="flex items-center gap-1.5 bg-brand text-white text-[12px] font-medium px-3.5 py-2 rounded-lg hover:bg-brand-mid transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add New API
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0 space-y-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-[9px] font-bold text-muted uppercase tracking-wider px-4 py-3">Service</th>
                    <th className="text-left text-[9px] font-bold text-muted uppercase tracking-wider px-4 py-3">API Key</th>
                    <th className="text-left text-[9px] font-bold text-muted uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left text-[9px] font-bold text-muted uppercase tracking-wider px-4 py-3">Last Updated</th>
                    <th className="text-left text-[9px] font-bold text-muted uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayKeys.map((row) => {
                    const cfg = statusConfig[row.status];
                    return (
                      <tr key={row.service} className="border-b border-border last:border-b-0 hover:bg-muted/5 transition-colors">
                        <td className="px-4 py-3 text-[12px] font-medium text-navy">{row.service}</td>
                        <td className="px-4 py-3 text-[12px] text-muted font-mono">{row.key || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5">
                            <span className={cn("w-2 h-2 rounded-full inline-block", cfg.dot)} />
                            <span className={cn("text-[12px] font-medium", cfg.text)}>{row.status}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-muted">
                          {row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {row.status === "Active" && (
                              <>
                                <button
                                  onClick={() => handleDelete(row.service)}
                                  className="text-[12px] text-red-500 font-medium hover:text-red-600 flex items-center gap-1"
                                >
                                  <TrashIcon className="w-3 h-3" />
                                  Delete
                                </button>
                                <button
                                  onClick={() => handleTest(row.service)}
                                  className="text-[12px] text-brand font-medium hover:text-brand-mid flex items-center gap-1"
                                >
                                  <PlayIcon className="w-3 h-3" />
                                  {testing === row.service ? "OK" : "Test"}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {addExpanded && (
            <div className="bg-card border border-border rounded-lg">
              <button
                onClick={() => setAddExpanded(!addExpanded)}
                className="w-full flex items-center justify-between px-4 py-3"
              >
                <span className="text-[13px] font-semibold text-navy">Add New API Key</span>
                <ChevronDownIcon className={cn("w-4 h-4 text-muted transition-transform", addExpanded && "rotate-180")} />
              </button>
              <div className="px-4 pb-4 border-t border-border pt-3">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-[9px] font-bold text-muted uppercase tracking-wider mb-1">Service</label>
                    <select
                      value={newService}
                      onChange={(e) => setNewService(e.target.value)}
                      className="w-full bg-surface border border-border rounded-md px-2.5 py-1.5 text-[12px] text-navy outline-none focus:border-brand"
                    >
                      <option value="">Select service...</option>
                      {SERVICE_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[9px] font-bold text-muted uppercase tracking-wider mb-1">API Key</label>
                    <input
                      type="password"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      placeholder="Enter API key"
                      className="w-full bg-surface border border-border rounded-md px-2.5 py-1.5 text-[12px] text-navy placeholder:text-muted/50 outline-none focus:border-brand"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving || !newService || !newKey}
                  className="px-3.5 py-1.5 text-[12px] font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Key"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-[280px] shrink-0 space-y-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-[13px] font-semibold text-navy mb-3">API Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted">Configured Keys</span>
                <span className="text-[16px] font-bold text-navy">{activeCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted">Total Required</span>
                <span className="text-[16px] font-bold text-navy">{SERVICE_OPTIONS.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted">Total Signals</span>
                <span className="text-[16px] font-bold text-navy">{Number(totalSignals).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-[13px] font-semibold text-navy mb-3">Layer Coverage</h2>
            <div className="space-y-2">
              {Object.entries((healthData as Record<string, unknown>)?.layers as Record<string, string> ?? {}).map(([layer, status]) => (
                <div key={layer} className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-navy">{layer}</span>
                  <span className={cn(
                    "text-[10px] font-semibold",
                    status === "active" ? "text-green-600" : status === "stale" ? "text-amber-600" : "text-gray-400",
                  )}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
