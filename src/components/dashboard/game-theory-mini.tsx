import { Fragment } from "react";
import { cn } from "@/lib/utils";
import type { gameTheorySummary } from "@/lib/mock-data";

interface GameTheoryMiniProps {
  data: typeof gameTheorySummary;
}

const cellColors: Record<string, string> = {
  "-3,-3": "bg-red-300 text-red-950",
  "2,-1": "bg-green-300 text-green-950",
  "1,1": "bg-green-500 text-white",
  "0,0": "bg-amber-200 text-amber-900",
};

export function GameTheoryMini({ data }: GameTheoryMiniProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <h3 className="text-[11px] font-semibold text-navy mb-2">
        Game Theory Summary -- {data.conflict}
      </h3>
      <div className="flex gap-3 items-start">
        <div className="flex-1">
          <div className="grid grid-cols-3 gap-[2px] mb-2">
            <div className="bg-surface-100 rounded-[2px] p-1 text-[8px] text-center text-gray-400" />
            {data.headers.cols.map((col) => (
              <div
                key={col}
                className="bg-navy rounded-[2px] p-1 text-[8px] text-center text-gray-400"
              >
                {col}
              </div>
            ))}
            {data.headers.rows.map((row, ri) => (
              <Fragment key={`row-${ri}`}>
                <div className="bg-navy rounded-[2px] p-1 text-[8px] text-center text-gray-400">
                  {row}
                </div>
                {data.matrix[ri].map((cell, ci) => (
                  <div
                    key={`cell-${ri}-${ci}`}
                    className={cn(
                      "rounded-[2px] p-1 text-[9px] text-center font-bold",
                      cellColors[cell] || "bg-surface-100 text-muted"
                    )}
                  >
                    {cell}
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
          {data.nashEquilibrium && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-[3px] bg-success-50 text-success border border-success/30">
              Nash Equilibrium Found
            </span>
          )}
        </div>
        <div className="flex-1">
          <div className="text-[9px] text-muted mb-1">Dominant Strategy</div>
          <div className="text-[10px] font-semibold text-navy mb-1.5">
            {data.dominantStrategy}
          </div>
          <div className="text-[9px] text-muted">
            Confidence: <strong className="text-success">{data.confidence}</strong>
          </div>
          <div className="text-[9px] text-muted">
            Conv. Score:{" "}
            <strong className="text-success">{data.convergenceScore}/10</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
