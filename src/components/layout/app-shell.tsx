"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import {
  TweaksPanel,
  TweaksTrigger,
  useTweaks,
} from "./tweaks-panel";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [tweaks, setTweaks] = useTweaks();

  return (
    <div className="h-full flex">
      <Sidebar />
      <main
        className="ml-[160px] flex-1 flex flex-col min-h-screen"
        style={{ background: "var(--bg-0)" }}
      >
        {children}
      </main>

      {/* Global tweaks trigger (bottom-right floating gear) */}
      <TweaksTrigger onClick={() => setTweaksOpen((v) => !v)} />

      {/* Tweaks panel flyout */}
      {tweaksOpen && (
        <TweaksPanel
          tweaks={tweaks}
          setTweaks={setTweaks}
          onClose={() => setTweaksOpen(false)}
        />
      )}
    </div>
  );
}
