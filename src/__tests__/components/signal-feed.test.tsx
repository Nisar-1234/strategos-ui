import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SignalFeed } from "@/components/dashboard/signal-feed";
import { liveSignals } from "@/lib/mock-data";

describe("SignalFeed", () => {
  it("renders feed title", () => {
    render(<SignalFeed signals={liveSignals} />);
    expect(screen.getByText("Live Signal Feed -- All Layers")).toBeInTheDocument();
  });

  it("renders all signal items", () => {
    render(<SignalFeed signals={liveSignals} />);
    liveSignals.forEach((s) => {
      expect(screen.getByText(s.source)).toBeInTheDocument();
    });
  });

  it("renders layer badges for each signal", () => {
    render(<SignalFeed signals={liveSignals.slice(0, 3)} />);
    expect(screen.getByText("L3 MARITIME")).toBeInTheDocument();
    expect(screen.getByText("L1 MEDIA")).toBeInTheDocument();
    expect(screen.getByText("L5 COMM")).toBeInTheDocument();
  });

  it("renders signal content text", () => {
    render(<SignalFeed signals={liveSignals.slice(0, 1)} />);
    expect(screen.getByText(/MarineTraffic AIS not live yet/)).toBeInTheDocument();
  });

  it("renders time ago labels", () => {
    render(<SignalFeed signals={liveSignals.slice(0, 2)} />);
    expect(screen.getByText("4m")).toBeInTheDocument();
    expect(screen.getByText("7m")).toBeInTheDocument();
  });

  it("handles empty signals array", () => {
    const { container } = render(<SignalFeed signals={[]} />);
    expect(screen.getByText("Live Signal Feed -- All Layers")).toBeInTheDocument();
    expect(container.firstElementChild).toBeTruthy();
  });
});
