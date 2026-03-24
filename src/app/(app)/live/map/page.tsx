"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

const categories = ["All Conflicts", "Armed Conflicts", "Political Crisis", "Economic Tensions", "Cyber Threats"];

const conflicts = [
  { name: "Russia-Ukraine", type: "Armed Conflict", duration: "2 years, 3 months", parties: "Russian Federation, Ukraine", intensity: "HIGH", nash: "Negotiate-Negotiate", ceasefire: 62, color: "red", x: 55, y: 30 },
  { name: "Taiwan Strait", type: "Political Crisis", duration: "1 year, 6 months", parties: "China, Taiwan, USA", intensity: "MEDIUM", nash: "Maintain-Maintain", ceasefire: 41, color: "orange", x: 75, y: 35 },
  { name: "Sudan", type: "Armed Conflict", duration: "10 months", parties: "SAF, RSF", intensity: "HIGH", nash: "Escalate-Resist", ceasefire: 28, color: "red", x: 48, y: 50 },
  { name: "South China Sea", type: "Economic Tensions", duration: "3 years", parties: "China, Philippines, Vietnam", intensity: "MEDIUM", nash: "Negotiate-Concede", ceasefire: 55, color: "yellow", x: 72, y: 45 },
  { name: "Iran Nuclear", type: "Political Crisis", duration: "5 years", parties: "Iran, USA, IAEA", intensity: "MEDIUM", nash: "Negotiate-Negotiate", ceasefire: 38, color: "orange", x: 52, y: 35 },
];

const intensityColors: Record<string, string> = { red: "bg-red-500", orange: "bg-orange-500", yellow: "bg-yellow-500", green: "bg-green-500" };
const intensityLabels = [
  { color: "bg-red-500", label: "Critical" },
  { color: "bg-orange-500", label: "High" },
  { color: "bg-yellow-500", label: "Medium" },
  { color: "bg-green-500", label: "Low" },
];

export default function GeoMapPage() {
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState(0);
  const c = conflicts[selected];

  return (
    <>
      <Topbar title="Live Feed — Geopolitical Map" subtitle="Interactive conflict monitoring and analysis" />
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {categories.map((cat, i) => (
            <button
              key={cat}
              onClick={() => setActive(i)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors border",
                active === i
                  ? "bg-brand text-white border-brand"
                  : "bg-card text-navy border-border hover:border-brand/40"
              )}
            >
              {cat}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 border border-border rounded-md px-2.5 py-1.5 text-[11px] text-navy bg-card">
              <CalendarIcon className="w-3.5 h-3.5 text-muted" />
              Mar 2026
            </div>
            <div className="flex items-center gap-1.5 border border-border rounded-md px-2.5 py-1.5 text-[11px] text-navy bg-card">
              All Intensities
              <svg className="w-3 h-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            <button className="flex items-center gap-1.5 border border-border rounded-md px-2.5 py-1.5 text-[11px] text-navy bg-card hover:bg-surface-100 transition-colors">
              <ArrowDownTrayIcon className="w-3.5 h-3.5 text-muted" />
              Export Map
            </button>
          </div>
        </div>

        <div className="flex-1 flex gap-4 min-h-0">
          <div className="flex-1 bg-surface-100 border border-border rounded-lg relative overflow-hidden">
            {conflicts.map((conf, i) => (
              <button
                key={conf.name}
                onClick={() => setSelected(i)}
                className={cn("absolute rounded-full transition-all", intensityColors[conf.color], selected === i ? "ring-2 ring-navy ring-offset-2" : "")}
                style={{ left: `${conf.x}%`, top: `${conf.y}%`, width: conf.intensity === "HIGH" ? 20 : 14, height: conf.intensity === "HIGH" ? 20 : 14 }}
                title={conf.name}
              />
            ))}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-[14px] font-semibold text-navy/30">Interactive Map Component</div>
                <div className="text-[11px] text-muted">Mapbox GL or Leaflet integration</div>
              </div>
            </div>
            <div className="absolute left-3 bottom-3 bg-card/90 border border-border rounded-lg p-2.5">
              <div className="text-[10px] font-semibold text-navy mb-1.5">Intensity Level</div>
              {intensityLabels.map((il) => (
                <div key={il.label} className="flex items-center gap-1.5 mb-1 last:mb-0">
                  <div className={cn("w-2.5 h-2.5 rounded-full", il.color)} />
                  <span className="text-[9px] text-navy">{il.label}</span>
                </div>
              ))}
              <div className="text-[8px] text-muted mt-1 italic">Size indicates intensity</div>
            </div>
          </div>

          <div className="w-[260px] shrink-0 bg-card border border-border rounded-lg p-4 overflow-y-auto">
            <div className="inline-block px-2 py-0.5 rounded text-[9px] font-bold text-white bg-red-500 mb-2">{c.type}</div>
            <h3 className="text-[15px] font-bold text-navy mb-4">{c.name} Conflict</h3>
            <div className="space-y-3 text-[11px]">
              <div><div className="text-muted text-[9px] uppercase tracking-wider mb-0.5">Duration</div><div className="font-medium text-navy">{c.duration}</div></div>
              <div><div className="text-muted text-[9px] uppercase tracking-wider mb-0.5">Parties Involved</div><div className="font-medium text-navy">{c.parties}</div></div>
              <div>
                <div className="text-muted text-[9px] uppercase tracking-wider mb-1.5">Intensity</div>
                <div className="h-2 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 via-orange-400 to-red-500 mb-1" />
                <div className={cn("text-[12px] font-bold", c.intensity === "HIGH" ? "text-red-500" : "text-amber-500")}>{c.intensity}</div>
              </div>
              <div><div className="text-muted text-[9px] uppercase tracking-wider mb-0.5">Game Theory Status</div><div className="font-medium text-navy">Nash Equilibrium: {c.nash}</div></div>
              <div><div className="text-muted text-[9px] uppercase tracking-wider mb-0.5">Probability Breakdown</div><div className="font-medium text-navy">Ceasefire {c.ceasefire}%</div></div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {conflicts.map((conf, i) => (
            <button
              key={conf.name}
              onClick={() => setSelected(i)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-md text-[11px] border transition-colors",
                selected === i ? "bg-navy text-white border-navy" : "bg-card text-navy border-border hover:bg-surface-100"
              )}
            >
              {conf.name}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
