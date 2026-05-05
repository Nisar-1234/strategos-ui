"use client";

import { useState, useEffect } from "react";
import { BellIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";

interface TopbarProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  live?: boolean;
}

function DualClock() {
  const [gst, setGst] = useState("");
  const [utc, setUtc] = useState("");

  useEffect(() => {
    function update() {
      const now = new Date();
      setGst(
        now.toLocaleTimeString("en-GB", {
          timeZone: "Asia/Dubai",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setUtc(
        now.toLocaleTimeString("en-GB", {
          timeZone: "UTC",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-3">
      <ClockBlock label="GST" value={gst} />
      <ClockBlock label="UTC" value={utc} />
    </div>
  );
}

function ClockBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.1 }}>
      <span className="mono" style={{ fontSize: 12.5, color: "var(--fg-1)", letterSpacing: "0.04em" }}>
        {value}
      </span>
      <span className="mono caps" style={{ fontSize: 9, color: "var(--fg-4)" }}>
        {label}
      </span>
    </div>
  );
}

export function Topbar({ title, subtitle, children, live }: TopbarProps) {
  return (
    <header
      className="flex items-center gap-4 px-5 shrink-0"
      style={{
        height: 50,
        background: "var(--bg-1)",
        borderBottom: "1px solid var(--line-2)",
      }}
    >
      {/* Title + breadcrumb */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-baseline gap-2.5">
          <h1 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--fg-1)", letterSpacing: "0.01em" }}>
            {title}
          </h1>
          <span
            className="mono"
            style={{
              fontSize: 9,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--fg-4)",
              padding: "1px 5px",
              border: "1px dashed var(--line-2)",
              borderRadius: 1,
            }}
          >
            PILOT · illustrative
          </span>
        </div>
        {subtitle && (
          <div className="mono" style={{ fontSize: 10, color: "var(--fg-4)", letterSpacing: "0.06em" }}>
            {subtitle}
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Slot for page-specific controls */}
      {children}

      {/* Dual clocks */}
      <DualClock />

      {/* Live indicator */}
      <div
        className="flex items-center gap-1.5"
        style={{
          padding: "4px 9px",
          border: "1px solid var(--line-2)",
          borderRadius: 2,
          background: "var(--bg-inset)",
        }}
      >
        <span
          className={live !== false ? "live-dot" : ""}
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: live !== false ? "var(--sig-positive)" : "var(--fg-4)",
          }}
        />
        <span className="mono caps" style={{ color: "var(--fg-2)", fontSize: 9 }}>
          {live !== false ? "Live" : "Polling"}
        </span>
      </div>

      {/* Notification + settings icons */}
      <IconButton icon={<BellIcon className="w-3.5 h-3.5" />} />
      <IconButton icon={<Cog6ToothIcon className="w-3.5 h-3.5" />} />
    </header>
  );
}

function IconButton({ icon, onClick }: { icon: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center"
      style={{
        width: 30,
        height: 30,
        background: "transparent",
        border: "1px solid var(--line-2)",
        borderRadius: 2,
        color: "var(--fg-3)",
        cursor: "pointer",
      }}
    >
      {icon}
    </button>
  );
}
