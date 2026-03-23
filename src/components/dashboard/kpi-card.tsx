import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  sub: string;
  color?: string;
}

export function KpiCard({ label, value, sub, color }: KpiCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="text-[9px] text-muted uppercase tracking-[0.06em] font-semibold mb-1">
        {label}
      </div>
      <div className={cn("text-[22px] font-bold text-navy leading-none", color)}>
        {value}
      </div>
      <div className={cn("text-[9px] mt-1", color || "text-muted")}>{sub}</div>
    </div>
  );
}
