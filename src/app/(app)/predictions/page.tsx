"use client";

import { Topbar } from "@/components/layout/topbar";
import { cn } from "@/lib/utils";
import {
  FunnelIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";

const predictions = [
  { name: "Russia-Ukraine Conflict", probability: 73, confidence: "HIGH" as const, status: "Active", updated: "2m ago" },
  { name: "Taiwan Strait Tensions", probability: 62, confidence: "MEDIUM" as const, status: "Active", updated: "5m ago" },
  { name: "Sudan Civil Conflict", probability: 58, confidence: "HIGH" as const, status: "Monitoring", updated: "12m ago" },
  { name: "Iran Nuclear Deal", probability: 45, confidence: "MEDIUM" as const, status: "Active", updated: "18m ago" },
  { name: "South China Sea Dispute", probability: 41, confidence: "LOW" as const, status: "Monitoring", updated: "25m ago" },
  { name: "Kashmir Border Tensions", probability: 38, confidence: "MEDIUM" as const, status: "Active", updated: "32m ago" },
  { name: "Yemen Civil War", probability: 35, confidence: "LOW" as const, status: "Monitoring", updated: "45m ago" },
];

const confidenceBadge = {
  HIGH: "bg-green-50 text-green-700 border border-green-200",
  MEDIUM: "bg-amber-50 text-amber-700 border border-amber-200",
  LOW: "bg-gray-100 text-gray-500 border border-gray-200",
};

const accuracyTrend = [78, 80, 82, 81, 84, 83, 84.7];

export default function PredictionsPage() {
  return (
    <>
      <Topbar title="Predictions" subtitle="Active prediction tracking and confidence analysis" />
      <div className="flex-1 flex gap-4 p-4 overflow-auto">
        <div className="flex-1 flex flex-col gap-4">
          <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 border border-border rounded-md px-2.5 py-1.5 text-[11px] text-navy">
              <FunnelIcon className="w-3.5 h-3.5 text-muted" />
              All Regions
              <svg className="w-3 h-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            <label className="flex items-center gap-2 text-[11px] text-navy cursor-pointer">
              <div className="w-8 h-[18px] bg-gray-200 rounded-full relative">
                <div className="absolute left-[2px] top-[2px] w-[14px] h-[14px] bg-white rounded-full" />
              </div>
              High Confidence Only
            </label>
            <div className="flex items-center gap-1.5 border border-border rounded-md px-2.5 py-1.5 text-[11px] text-navy">
              <CalendarIcon className="w-3.5 h-3.5 text-muted" />
              Jan 1, 2024 -- Jan 31, 2024
            </div>
            <div className="flex items-center gap-1.5 border border-border rounded-md px-2.5 py-1.5 text-[11px] text-muted ml-auto">
              <MagnifyingGlassIcon className="w-3.5 h-3.5" />
              Search predictions...
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2.5 text-[9px] font-bold text-muted uppercase tracking-wider">Conflict Name</th>
                  <th className="text-left px-4 py-2.5 text-[9px] font-bold text-muted uppercase tracking-wider">Probability</th>
                  <th className="text-left px-4 py-2.5 text-[9px] font-bold text-muted uppercase tracking-wider">Confidence</th>
                  <th className="text-left px-4 py-2.5 text-[9px] font-bold text-muted uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-2.5 text-[9px] font-bold text-muted uppercase tracking-wider">Last Updated</th>
                  <th className="text-left px-4 py-2.5 text-[9px] font-bold text-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((p) => (
                  <tr key={p.name} className="border-b border-border last:border-b-0 hover:bg-surface transition-colors">
                    <td className="px-4 py-3 text-[12px] font-medium text-navy">{p.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-navy w-8">{p.probability}%</span>
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand rounded-full" style={{ width: `${p.probability}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase", confidenceBadge[p.confidence])}>
                        {p.confidence}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted">{p.status}</td>
                    <td className="px-4 py-3 text-[11px] text-muted">{p.updated}</td>
                    <td className="px-4 py-3">
                      <button className="flex items-center gap-1 text-[11px] text-brand hover:text-brand-mid transition-colors">
                        <EyeIcon className="w-3.5 h-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="w-[240px] shrink-0 flex flex-col gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-[11px] font-semibold text-navy mb-3">Prediction Stats</h3>
            <div className="text-center mb-4">
              <div className="text-[36px] font-bold text-navy leading-none">47</div>
              <div className="text-[9px] text-muted uppercase tracking-wider mt-1">Total Predictions</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ArrowTrendingUpIcon className="w-3 h-3 text-green-600" />
                  <span className="text-[11px] text-navy">High Confidence</span>
                </div>
                <span className="text-[12px] font-bold text-navy">12</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-[2px] bg-amber-500 rounded" />
                  <span className="text-[11px] text-navy">Medium Confidence</span>
                </div>
                <span className="text-[12px] font-bold text-navy">18</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                  <span className="text-[11px] text-navy">Low Confidence</span>
                </div>
                <span className="text-[12px] font-bold text-navy">17</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-[11px] font-semibold text-navy mb-3">Accuracy Trend</h3>
            <div className="flex items-end gap-1 h-[40px] mb-3">
              {accuracyTrend.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className="w-2 h-2 rounded-full bg-brand" style={{ marginBottom: `${((v - 75) / 15) * 30}px` }} />
                </div>
              ))}
            </div>
            <div className="text-center">
              <div className="text-[28px] font-bold text-navy leading-none">84.7%</div>
              <div className="text-[9px] text-muted mt-0.5">Current Accuracy</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
