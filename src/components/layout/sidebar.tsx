"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Squares2X2Icon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  CpuChipIcon,
  ChartBarIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

const NAV_ITEMS = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Squares2X2Icon,
    color: "#C8A26A",
    bg: "rgba(200,162,106,0.18)",
  },
  {
    name: "Map",
    href: "/live/map",
    icon: GlobeAltIcon,
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.18)",
  },
  {
    name: "AI Chat",
    href: "/analysis/ai-chat",
    icon: ChatBubbleLeftRightIcon,
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.18)",
  },
  {
    name: "Signal Command",
    href: "/signals/command",
    icon: CpuChipIcon,
    color: "#14B8A6",
    bg: "rgba(20,184,166,0.18)",
  },
  {
    name: "Predictions",
    href: "/predictions",
    icon: ChartBarIcon,
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.18)",
  },
  {
    name: "Source Registry",
    href: "/config/source-registry",
    icon: DocumentTextIcon,
    color: "#94A3B8",
    bg: "rgba(148,163,184,0.18)",
  },
];

function StrategosMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path
        d="M10 1.5L17.5 5.5v5c0 5-3.5 7.5-7.5 8.5-4-1-7.5-3.5-7.5-8.5v-5z"
        stroke="var(--accent)" strokeWidth="1.2"
      />
      <path
        d="M10 5l3.5 2v3.5c0 2.5-1.75 3.5-3.5 4-1.75-.5-3.5-1.5-3.5-4V7z"
        fill="var(--accent)" fillOpacity="0.3" stroke="var(--accent)" strokeWidth="1"
      />
      <circle cx="10" cy="9" r="1" fill="var(--accent)" />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-50 flex flex-col"
      style={{
        width: 160,
        background: "var(--bg-1)",
        borderRight: "1px solid var(--line-2)",
      }}
    >
      {/* Brand */}
      <div
        className="px-4 pt-5 pb-4"
        style={{ borderBottom: "1px solid var(--line-1)" }}
      >
        <div className="flex items-center gap-2">
          <StrategosMark size={16} />
          <span
            className="mono"
            style={{
              fontWeight: 600,
              letterSpacing: "0.2em",
              fontSize: 11,
              color: "var(--fg-1)",
            }}
          >
            STRATEGOS
          </span>
        </div>
        <div
          className="mono caps mt-1"
          style={{ color: "var(--fg-4)", fontSize: 8.5, letterSpacing: "0.06em" }}
        >
          GCC Intelligence · V0.9 PILOT
        </div>
      </div>

      {/* Workspaces */}
      <nav className="flex-1 py-3">
        <div
          className="mono caps px-4 pb-2"
          style={{ color: "var(--fg-4)", fontSize: 8.5, letterSpacing: "0.1em" }}
        >
          Workspaces
        </div>

        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-[6px] mx-2 rounded transition-all duration-150"
              style={{
                background: isActive ? "rgba(200,162,106,0.10)" : "transparent",
                borderLeft: isActive
                  ? "2px solid var(--accent)"
                  : "2px solid transparent",
                color: isActive ? "var(--fg-1)" : "var(--fg-3)",
                fontWeight: isActive ? 500 : 400,
                fontSize: 11.5,
              }}
            >
              {/* Colored square badge */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  background: isActive ? item.bg : "rgba(255,255,255,0.04)",
                  flexShrink: 0,
                  transition: "background 0.15s",
                }}
              >
                <item.icon
                  style={{
                    width: 12,
                    height: 12,
                    color: isActive ? item.color : "var(--fg-4)",
                  }}
                />
              </span>
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-4 py-3"
        style={{ borderTop: "1px solid var(--line-1)" }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--sig-warn)" }}
          />
          <span
            className="mono caps"
            style={{ color: "var(--fg-3)", fontSize: 8, letterSpacing: "0.08em" }}
          >
            Pilot · Restricted
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #4a5568 0%, #2d3748 100%)",
              border: "1px solid var(--line-3)",
              fontSize: 8,
              fontWeight: 600,
              color: "var(--fg-1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            N
          </div>
          <div style={{ lineHeight: 1.3, minWidth: 0 }}>
            <div style={{ color: "var(--fg-1)", fontSize: 10.5, fontWeight: 500 }}>
              Analyst
            </div>
            <div
              className="mono"
              style={{
                color: "var(--fg-4)",
                fontSize: 8,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Named User · 1 of 3
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
