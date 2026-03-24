"use client";

import { Topbar } from "@/components/layout/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PredictionsPanel } from "@/components/dashboard/predictions-panel";
import { SignalFeed } from "@/components/dashboard/signal-feed";
import { ProbabilityChart } from "@/components/dashboard/probability-chart";
import { GameTheoryMini } from "@/components/dashboard/game-theory-mini";
import {
  kpiCards,
  topPredictions,
  liveSignals,
  gameTheorySummary,
  probabilityData,
} from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <>
      <Topbar
        title="Intelligence Dashboard"
        subtitle="23 active conflicts monitored -- Last sync 47s ago"
      />
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="grid grid-cols-5 gap-2.5 mb-3">
          {kpiCards.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>

        <div className="grid grid-cols-[1.3fr_1fr] gap-2.5" style={{ height: "calc(100vh - 220px)" }}>
          <div className="flex flex-col gap-2.5 overflow-hidden">
            <PredictionsPanel predictions={topPredictions} />
            <div className="flex-1 min-h-0">
              <ProbabilityChart data={probabilityData} />
            </div>
          </div>

          <div className="flex flex-col gap-2.5 overflow-hidden">
            <div className="flex-1 min-h-0">
              <SignalFeed signals={liveSignals} />
            </div>
            <GameTheoryMini data={gameTheorySummary} />
          </div>
        </div>
      </div>
    </>
  );
}
