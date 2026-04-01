"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { api, ApiSetting } from "@/lib/api";
import { useApiData } from "@/hooks/use-api-data";
import {
  Cog6ToothIcon,
  BellIcon,
  GlobeAltIcon,
  ClockIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
} from "@heroicons/react/24/outline";

interface PrefSection {
  icon: React.ElementType;
  title: string;
  items: { key: string; label: string; type: "toggle" | "select" | "number"; options?: string[]; default: string }[];
}

const SECTIONS: PrefSection[] = [
  {
    icon: BellIcon,
    title: "Notifications",
    items: [
      { key: "pref_alert_critical", label: "Critical alert notifications", type: "toggle", default: "true" },
      { key: "pref_alert_warning", label: "Warning alert notifications", type: "toggle", default: "true" },
      { key: "pref_alert_sound", label: "Sound notifications", type: "toggle", default: "false" },
      { key: "pref_alert_email", label: "Email digest", type: "toggle", default: "false" },
    ],
  },
  {
    icon: ClockIcon,
    title: "Data & Refresh",
    items: [
      { key: "pref_poll_interval", label: "Dashboard refresh interval", type: "select", options: ["15s", "30s", "60s", "120s"], default: "30s" },
      { key: "pref_signal_limit", label: "Signal feed max items", type: "number", default: "100" },
      { key: "pref_auto_refresh", label: "Auto-refresh enabled", type: "toggle", default: "true" },
    ],
  },
  {
    icon: GlobeAltIcon,
    title: "Map & Geo",
    items: [
      { key: "pref_map_style", label: "Map theme", type: "select", options: ["Dark", "Light", "Satellite"], default: "Dark" },
      { key: "pref_map_cluster", label: "Cluster map markers", type: "toggle", default: "true" },
      { key: "pref_default_region", label: "Default region", type: "select", options: ["Global", "Middle East", "Europe", "Asia-Pacific", "Africa"], default: "Global" },
    ],
  },
  {
    icon: PaintBrushIcon,
    title: "Display",
    items: [
      { key: "pref_theme", label: "Theme", type: "select", options: ["System", "Light", "Dark"], default: "System" },
      { key: "pref_compact", label: "Compact mode", type: "toggle", default: "false" },
      { key: "pref_show_layer_badges", label: "Show layer badges on signals", type: "toggle", default: "true" },
    ],
  },
  {
    icon: ShieldCheckIcon,
    title: "Security",
    items: [
      { key: "pref_session_timeout", label: "Session timeout (minutes)", type: "number", default: "30" },
      { key: "pref_2fa", label: "Two-factor authentication", type: "toggle", default: "false" },
      { key: "pref_api_logging", label: "API call logging", type: "toggle", default: "true" },
    ],
  },
];

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [localState, setLocalState] = useState<Record<string, string>>({});

  const { data: prefs, live, refresh } = useApiData<ApiSetting[]>({
    fetcher: () => api.settingsPreferences(),
    fallback: [],
    pollInterval: 0,
  });

  const savedMap = Object.fromEntries(prefs.map((p) => [p.key, p.value]));

  const getValue = (key: string, defaultVal: string) => {
    if (key in localState) return localState[key];
    if (key in savedMap) return savedMap[key];
    return defaultVal;
  };

  const setLocal = (key: string, value: string) => {
    setLocalState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = useCallback(async () => {
    setSaving(true);
    try {
      const allItems = SECTIONS.flatMap((s) => s.items);
      const promises = allItems.map((item) => {
        const val = getValue(item.key, item.default);
        return api.saveSetting(item.key, val, "preferences");
      });
      await Promise.all(promises);
      setSaveMsg("Settings saved!");
      refresh();
      setLocalState({});
      setTimeout(() => setSaveMsg(""), 2000);
    } catch {
      setSaveMsg("Error saving");
    }
    setSaving(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localState, savedMap, refresh]);

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Cog6ToothIcon className="w-6 h-6 text-navy" />
          <div>
            <h1 className="text-[22px] font-bold text-navy">Settings</h1>
            <p className="text-[13px] text-muted">Platform preferences and configuration</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn(
            "px-2 py-0.5 rounded text-[9px] font-bold tracking-wider",
            live ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600",
          )}>
            {live ? "SYNCED" : "LOCAL"}
          </span>
          <button onClick={handleSaveAll} disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white text-[12px] font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
            {saving ? "Saving..." : "Save All"}
          </button>
          {saveMsg && <span className="text-[11px] text-green-600 font-medium">{saveMsg}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {SECTIONS.map((section) => (
          <div key={section.title} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <section.icon className="w-4 h-4 text-muted" />
              <h2 className="text-[13px] font-semibold text-navy">{section.title}</h2>
            </div>
            <div className="space-y-4">
              {section.items.map((item) => {
                const value = getValue(item.key, item.default);

                if (item.type === "toggle") {
                  const isOn = value === "true";
                  return (
                    <div key={item.key} className="flex items-center justify-between">
                      <span className="text-[12px] text-navy">{item.label}</span>
                      <button onClick={() => setLocal(item.key, isOn ? "false" : "true")}
                        className={cn("w-9 h-5 rounded-full relative transition-colors", isOn ? "bg-brand" : "bg-gray-300")}>
                        <div className={cn("absolute top-[2px] w-[16px] h-[16px] bg-white rounded-full transition-all shadow-sm", isOn ? "right-[2px]" : "left-[2px]")} />
                      </button>
                    </div>
                  );
                }

                if (item.type === "select") {
                  return (
                    <div key={item.key} className="flex items-center justify-between">
                      <span className="text-[12px] text-navy">{item.label}</span>
                      <select value={value} onChange={(e) => setLocal(item.key, e.target.value)}
                        className="bg-surface border border-border rounded-md px-2 py-1 text-[11px] text-navy">
                        {item.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  );
                }

                return (
                  <div key={item.key} className="flex items-center justify-between">
                    <span className="text-[12px] text-navy">{item.label}</span>
                    <input type="number" value={value} onChange={(e) => setLocal(item.key, e.target.value)}
                      className="w-20 bg-surface border border-border rounded-md px-2 py-1 text-[11px] text-navy text-right" />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
