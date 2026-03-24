import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiCard } from "@/components/dashboard/kpi-card";

describe("KpiCard", () => {
  it("renders label, value, and sub text", () => {
    render(
      <KpiCard label="Active Predictions" value="47" sub="12 high confidence" color="text-brand" />
    );

    expect(screen.getByText("Active Predictions")).toBeInTheDocument();
    expect(screen.getByText("47")).toBeInTheDocument();
    expect(screen.getByText("12 high confidence")).toBeInTheDocument();
  });

  it("applies color class to the value", () => {
    render(
      <KpiCard label="Score" value="8.4" sub="High" color="text-success" />
    );

    const valueEl = screen.getByText("8.4");
    expect(valueEl.className).toContain("text-success");
  });

  it("has card styling (white bg, border, rounded)", () => {
    const { container } = render(
      <KpiCard label="Test" value="1" sub="test" />
    );

    const card = container.firstElementChild;
    expect(card?.className).toContain("bg-card");
    expect(card?.className).toContain("border");
    expect(card?.className).toContain("rounded-lg");
  });
});
