"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { probabilityData } from "@/lib/mock-data";

interface ProbabilityChartProps {
  data: typeof probabilityData;
}

export function ProbabilityChart({ data }: ProbabilityChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="bg-card border border-border rounded-lg p-3 flex flex-col">
      <h3 className="text-[11px] font-semibold text-navy mb-2 shrink-0">
        Conflict Outcome Probability -- 30 Days
      </h3>
      <div className="flex-1 min-h-[180px]" style={{ minWidth: 0 }}>
        {mounted ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 8, fill: "#94A3B8" }}
                tickLine={false}
                axisLine={{ stroke: "#E2E8F0" }}
                tickFormatter={(v) => (v === 1 ? "Day 1" : v === 15 ? "Day 15" : v === 30 ? "Day 30" : "")}
              />
              <YAxis
                tick={{ fontSize: 8, fill: "#94A3B8" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  background: "#0F172A",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 10,
                  color: "#CBD5E1",
                }}
                labelFormatter={(v) => `Day ${v}`}
                formatter={(value) => [`${value}%`]}
              />
              <Legend
                wrapperStyle={{ fontSize: 9, paddingTop: 4 }}
                iconType="line"
                iconSize={10}
              />
              <Line
                type="monotone"
                dataKey="escalation"
                stroke="#DC2626"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                name="Escalation"
              />
              <Line
                type="monotone"
                dataKey="negotiation"
                stroke="#1B4FD8"
                strokeWidth={1.5}
                dot={false}
                name="Negotiation"
              />
              <Line
                type="monotone"
                dataKey="stalemate"
                stroke="#94A3B8"
                strokeWidth={1.2}
                dot={false}
                name="Stalemate"
              />
              <Line
                type="monotone"
                dataKey="resolution"
                stroke="#059669"
                strokeWidth={1.2}
                dot={false}
                name="Resolution"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[180px] flex items-center justify-center text-[10px] text-muted">
            Loading chart...
          </div>
        )}
      </div>
    </div>
  );
}
