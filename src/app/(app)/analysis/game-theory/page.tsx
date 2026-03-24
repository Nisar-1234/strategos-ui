"use client";

import { Fragment } from "react";
import { Topbar } from "@/components/layout/topbar";
import { cn } from "@/lib/utils";
import {
  PlayIcon,
  InformationCircleIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

const matrix = [
  { row: "Escalate", values: [{ v: "(-3, -3)", highlight: false }, { v: "(-5, 2)", highlight: false }, { v: "(-2, 1)", highlight: false }] },
  { row: "Negotiate", values: [{ v: "(2, -5)", highlight: false }, { v: "(2, 2)", highlight: true }, { v: "(1, -1)", highlight: false }] },
  { row: "Maintain", values: [{ v: "(1, -2)", highlight: false }, { v: "(-1, 1)", highlight: false }, { v: "(0, 0)", highlight: false }] },
];
const cols = ["Resist", "Negotiate", "Concede"];

const outcomes = [
  { name: "Full Ceasefire", pct: 62, color: "bg-brand" },
  { name: "Frozen Conflict", pct: 18, color: "bg-brand-light" },
  { name: "Escalation to War", pct: 8, color: "bg-danger" },
  { name: "Negotiated Settlement", pct: 6, color: "bg-success" },
  { name: "Withdrawal", pct: 4, color: "bg-gray-400" },
  { name: "Capitulation", pct: 2, color: "bg-pink-500" },
];

export default function GameTheoryPage() {
  return (
    <>
      <Topbar title="Game Theory Analysis" subtitle="Strategic analysis and Nash equilibrium computation" />
      <div className="flex-1 overflow-auto p-4">
        <div className="flex items-center gap-1.5 text-[10px] text-muted mb-2">
          <span className="hover:text-navy cursor-pointer">Home</span>
          <ChevronRightIcon className="w-2.5 h-2.5" />
          <span className="hover:text-navy cursor-pointer">Analysis</span>
          <ChevronRightIcon className="w-2.5 h-2.5" />
          <span className="hover:text-navy cursor-pointer">Game Theory</span>
          <ChevronRightIcon className="w-2.5 h-2.5" />
          <span className="text-navy font-medium">Russia-Ukraine Conflict</span>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <h1 className="text-[22px] font-bold">
            <span className="text-brand">Game Theory Analysis</span>
            <span className="text-navy"> — Russia-Ukraine Conflict</span>
          </h1>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 text-[12px] text-navy bg-card">
            Russia-Ukraine Conflict
            <svg className="w-3.5 h-3.5 text-muted ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
          <button className="flex items-center gap-1.5 bg-brand text-white px-4 py-2 rounded-lg text-[12px] font-medium hover:bg-brand-mid transition-colors">
            <PlayIcon className="w-4 h-4" />
            Run New Analysis
          </button>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="text-[13px] font-semibold text-navy mb-4">Strategic Payoff Matrix</h3>
              <div className="grid grid-cols-4 gap-2 max-w-[480px]">
                <div />
                {cols.map((c) => (
                  <div key={c} className="text-center text-[10px] font-medium text-muted py-1">{c}</div>
                ))}
                {matrix.map((row) => (
                  <Fragment key={row.row}>
                    <div className="flex items-center text-[10px] font-medium text-muted pr-2">{row.row}</div>
                    {row.values.map((cell, ci) => (
                      <div
                        key={`${row.row}-${ci}`}
                        className={cn(
                          "text-center py-3 rounded-lg text-[13px] font-semibold border",
                          cell.highlight
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-surface text-navy border-border"
                        )}
                      >
                        {cell.v}
                        {cell.highlight && <span className="ml-1 text-amber-500">&#9733;</span>}
                      </div>
                    ))}
                  </Fragment>
                ))}
              </div>

              <div className="mt-5 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 max-w-[480px]">
                <InformationCircleIcon className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <div className="text-[11px] text-navy leading-relaxed">
                  <strong>Nash Equilibrium:</strong> Both actors achieve optimal outcome (2,2) when choosing Negotiate-Negotiate. Neither actor can improve their position by unilaterally changing strategy.
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="text-[13px] font-semibold text-navy mb-2">Decision Tree — Next 90 Days</h3>
              <div className="h-[120px] flex items-center justify-center text-[11px] text-muted">
                Decision tree visualization will render here
              </div>
            </div>
          </div>

          <div className="w-[280px] shrink-0 flex flex-col gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-[12px] font-semibold text-navy mb-4">Outcome Probability Distribution</h3>
              <div className="space-y-3">
                {outcomes.map((o) => (
                  <div key={o.name}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-navy">{o.name}</span>
                      <span className="font-bold text-navy">{o.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", o.color)} style={{ width: `${o.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-4 flex flex-col items-center">
              <div className="relative w-[100px] h-[100px] mb-3">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#E2E8F0" strokeWidth="2.5" />
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#1B4FD8" strokeWidth="2.5" strokeDasharray={`${78} ${100 - 78}`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[18px] font-bold text-navy">78%</span>
                </div>
              </div>
              <div className="text-[9px] font-bold text-muted uppercase tracking-wider">Model Confidence</div>
              <div className="text-[10px] text-muted mt-0.5">847 signals analyzed</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
