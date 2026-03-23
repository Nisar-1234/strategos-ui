import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/mock-data";

export function SignalFeed({ signals }: { signals: Signal[] }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3 flex flex-col overflow-hidden">
      <h3 className="text-[11px] font-semibold text-navy mb-2 shrink-0">
        Live Signal Feed -- All Layers
      </h3>
      <div className="flex-1 overflow-y-auto space-y-0">
        {signals.map((s) => (
          <div
            key={s.id}
            className="flex items-start gap-2 py-[7px] border-b border-surface-100 last:border-0"
          >
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0 mt-1"
              style={{ backgroundColor: s.dotColor }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-0.5">
                <span
                  className={cn(
                    "text-[9px] font-bold px-1.5 py-0 rounded-[3px] border",
                    s.badgeClass
                  )}
                >
                  {s.layer} {s.layerName}
                </span>
                <span className="text-[9px] font-semibold text-brand">{s.source}</span>
                {s.biasScore && (
                  <span className="text-[9px] text-success font-semibold">
                    {s.biasScore}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted leading-[1.4]">{s.content}</p>
            </div>
            <span className="text-[9px] text-gray-400 shrink-0">{s.timeAgo}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
