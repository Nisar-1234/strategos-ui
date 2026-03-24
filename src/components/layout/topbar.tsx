"use client";

import { useState, useEffect } from "react";
import { UserCircleIcon } from "@heroicons/react/24/outline";

interface TopbarProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function Topbar({ title, subtitle, children }: TopbarProps) {
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    function update() {
      const now = new Date();
      const date = now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const time = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZoneName: "short",
      });
      setTimeStr(`${date} ${time}`);
    }
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="bg-card border-b border-border px-5 py-2.5 flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-[15px] font-semibold text-navy">{title}</h1>
        {subtitle && (
          <p className="text-[11px] text-muted mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {timeStr && (
          <div className="text-[10px] text-muted bg-surface border border-border rounded-md px-2.5 py-1 font-mono">
            {timeStr}
          </div>
        )}
        <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center">
          <UserCircleIcon className="w-4 h-4 text-white" />
        </div>
      </div>
    </header>
  );
}
