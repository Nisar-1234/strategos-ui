"use client";

import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex">
      <Sidebar />
      <main className="ml-[220px] flex-1 flex flex-col min-h-screen bg-surface">
        {children}
      </main>
    </div>
  );
}
