"use client";

import { Topbar } from "@/components/layout/topbar";
import { cn } from "@/lib/utils";

const telegramChannels = ["@geopolitics_alerts", "@conflict_monitor", "@intel_reports"];
const youtubeChannels = [
  { name: "CNN International", subs: "12.4M" },
  { name: "BBC World News", subs: "8.2M" },
  { name: "Al Jazeera English", subs: "15.1M" },
  { name: "Sky News", subs: "3.6M" },
];
const xAccounts = ["@StateDept", "@UN", "@NATO", "@POTUS", "@BBCWorld"];
const newsApis = [
  { name: "NewsAPI.org", status: "Connected" },
  { name: "Reuters API", status: "Connected" },
  { name: "GDELT API", status: "Pending" },
];

export default function DataSourcesPage() {
  return (
    <>
      <Topbar title="Data Sources" subtitle="Manage connected intelligence sources and channels" />
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-navy">Telegram</div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-50 text-green-700 border border-green-200">{telegramChannels.length} Active</span>
              </div>
            </div>
            <div className="space-y-2.5 mb-4">
              {telegramChannels.map((ch) => (
                <div key={ch} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-navy" />
                  <span className="text-[11px] text-navy">{ch}</span>
                </div>
              ))}
            </div>
            <button className="text-[11px] text-brand font-medium hover:text-brand-mid flex items-center gap-1">
              Manage <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-red-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-navy">YouTube</div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-50 text-green-700 border border-green-200">{youtubeChannels.length} Active</span>
              </div>
            </div>
            <div className="space-y-2.5 mb-4">
              {youtubeChannels.map((ch) => (
                <div key={ch.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-navy" />
                    <span className="text-[11px] text-navy">{ch.name}</span>
                  </div>
                  <span className="text-[10px] text-muted">{ch.subs}</span>
                </div>
              ))}
            </div>
            <button className="text-[11px] text-brand font-medium hover:text-brand-mid flex items-center gap-1">
              Manage <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-navy">X Accounts</div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-50 text-green-700 border border-green-200">{xAccounts.length} Active</span>
              </div>
            </div>
            <div className="space-y-2.5 mb-4">
              {xAccounts.slice(0, 3).map((acc) => (
                <div key={acc} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-navy" />
                    <span className="text-[11px] text-navy">{acc}</span>
                  </div>
                  <div className="w-8 h-[18px] bg-brand rounded-full relative"><div className="absolute right-[2px] top-[2px] w-[14px] h-[14px] bg-white rounded-full" /></div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gray-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-navy">News APIs</div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-50 text-green-700 border border-green-200">{newsApis.length} Connected</span>
              </div>
            </div>
            <div className="space-y-2.5 mb-4">
              {newsApis.map((api) => (
                <div key={api.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-navy" />
                    <span className="text-[11px] text-navy">{api.name}</span>
                  </div>
                  <span className={cn("text-[10px] font-medium", api.status === "Connected" ? "text-green-600" : "text-amber-500")}>{api.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
