import { cn } from "@/lib/utils";

interface Prediction {
  name: string;
  probability: number;
  level: "HIGH" | "MED" | "LOW";
  color: string;
}

const levelStyles = {
  HIGH: "bg-danger-50 text-danger border-danger/30",
  MED: "bg-warning-50 text-warning border-warning/30",
  LOW: "bg-surface-100 text-muted border-border",
};

export function PredictionsPanel({ predictions }: { predictions: Prediction[] }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <h3 className="text-[11px] font-semibold text-navy mb-2">Top Active Predictions</h3>
      <div className="space-y-1.5">
        {predictions.map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 w-[120px] shrink-0">
              <div
                className="w-3 h-2 rounded-[1px] shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-[10px] text-muted truncate">{p.name}</span>
            </div>
            <div className="flex-1 h-[5px] bg-surface-100 rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm"
                style={{ width: `${p.probability}%`, backgroundColor: p.color }}
              />
            </div>
            <span className="text-[10px] font-semibold text-navy w-8 text-right">
              {p.probability}%
            </span>
            <span
              className={cn(
                "text-[9px] font-bold px-1.5 py-0.5 rounded-[3px] border",
                levelStyles[p.level]
              )}
            >
              {p.level}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
