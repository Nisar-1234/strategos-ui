"use client";

import { Topbar } from "./topbar";

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  phase: string;
}

export function PlaceholderPage({ title, subtitle, phase }: PlaceholderPageProps) {
  return (
    <>
      <Topbar title={title} subtitle={subtitle} />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-[40px] font-display text-navy/20 mb-3">
            {title}
          </div>
          <div className="text-[12px] text-muted max-w-[320px] mx-auto leading-relaxed">
            This screen is part of <strong>{phase}</strong> and will be built
            when signal ingestion and convergence engine are wired up.
          </div>
          <div className="mt-4 inline-block text-[9px] font-bold uppercase tracking-[0.1em] px-3 py-1.5 rounded-md bg-brand-50 text-brand border border-brand/20">
            Coming Soon
          </div>
        </div>
      </div>
    </>
  );
}
