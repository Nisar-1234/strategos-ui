import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PredictionsPanel } from "@/components/dashboard/predictions-panel";

const mockPredictions = [
  { name: "Gaza Conflict", probability: 82, level: "HIGH" as const, color: "#B91C1C" },
  { name: "Ukraine Conflict", probability: 76, level: "HIGH" as const, color: "#1D4ED8" },
  { name: "Taiwan Strait", probability: 61, level: "MED" as const, color: "#0369A1" },
];

describe("PredictionsPanel", () => {
  it("renders panel title", () => {
    render(<PredictionsPanel predictions={mockPredictions} />);
    expect(screen.getByText("Top Active Predictions")).toBeInTheDocument();
  });

  it("renders all prediction names", () => {
    render(<PredictionsPanel predictions={mockPredictions} />);
    expect(screen.getByText("Gaza Conflict")).toBeInTheDocument();
    expect(screen.getByText("Ukraine Conflict")).toBeInTheDocument();
    expect(screen.getByText("Taiwan Strait")).toBeInTheDocument();
  });

  it("renders probabilities as percentages", () => {
    render(<PredictionsPanel predictions={mockPredictions} />);
    expect(screen.getByText("82%")).toBeInTheDocument();
    expect(screen.getByText("76%")).toBeInTheDocument();
    expect(screen.getByText("61%")).toBeInTheDocument();
  });

  it("renders confidence level badges", () => {
    render(<PredictionsPanel predictions={mockPredictions} />);
    const highBadges = screen.getAllByText("HIGH");
    expect(highBadges).toHaveLength(2);
    expect(screen.getByText("MED")).toBeInTheDocument();
  });

  it("renders empty list gracefully", () => {
    const { container } = render(<PredictionsPanel predictions={[]} />);
    expect(container.firstElementChild).toBeTruthy();
  });
});
