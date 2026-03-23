"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Squares2X2Icon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  SignalIcon,
  MagnifyingGlassCircleIcon,
  GlobeAltIcon,
  NewspaperIcon,
  ChartBarSquareIcon,
  CpuChipIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

const navGroups = [
  {
    label: "Main",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: Squares2X2Icon },
      { name: "Predictions", href: "/predictions", icon: ChartBarIcon },
    ],
  },
  {
    label: "Analysis",
    items: [
      { name: "Game Theory", href: "/analysis/game-theory", icon: CpuChipIcon },
      { name: "AI Analysis", href: "/analysis/ai-chat", icon: ChatBubbleLeftRightIcon },
    ],
  },
  {
    label: "Signals",
    items: [
      { name: "Signal Monitor", href: "/signals/monitor", icon: SignalIcon },
      { name: "Cmd Center", href: "/signals/command", icon: MagnifyingGlassCircleIcon },
      { name: "Markets", href: "/signals/markets", icon: ChartBarSquareIcon },
    ],
  },
  {
    label: "Live",
    items: [
      { name: "Geo Map", href: "/live/map", icon: GlobeAltIcon },
      { name: "News Live", href: "/live/news", icon: NewspaperIcon },
    ],
  },
  {
    label: "Config",
    items: [
      { name: "Settings", href: "/config/settings", icon: Cog6ToothIcon },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-navy overflow-y-auto z-50 flex flex-col">
      <div className="px-5 pt-7 pb-6 border-b border-white/[0.07]">
        <div className="text-[16px] font-bold text-white tracking-[0.04em]">
          STRATEGOS
        </div>
        <div className="text-[10px] text-gray-700 uppercase tracking-[0.1em] mt-0.5">
          Intelligence Platform
        </div>
      </div>

      <nav className="flex-1 py-3">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-5 pt-4 pb-1.5 text-[9px] font-bold text-gray-700 uppercase tracking-[0.12em]">
              {group.label}
            </div>
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-5 py-[7px] text-[11.5px] border-l-2 transition-all duration-150",
                    isActive
                      ? "text-white bg-brand/25 border-l-brand-light"
                      : "text-gray-500 border-l-transparent hover:text-white hover:border-l-brand-light hover:bg-white/[0.03]"
                  )}
                >
                  <item.icon className={cn("w-3.5 h-3.5 shrink-0", isActive && "text-blue-400")} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
