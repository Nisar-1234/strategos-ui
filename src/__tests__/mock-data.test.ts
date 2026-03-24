import { describe, it, expect } from "vitest";
import {
  kpiCards,
  topPredictions,
  liveSignals,
  gameTheorySummary,
  probabilityData,
} from "@/lib/mock-data";

describe("kpiCards", () => {
  it("has exactly 5 KPI cards", () => {
    expect(kpiCards).toHaveLength(5);
  });

  it("each card has required fields", () => {
    kpiCards.forEach((card) => {
      expect(card).toHaveProperty("label");
      expect(card).toHaveProperty("value");
      expect(card).toHaveProperty("sub");
      expect(card).toHaveProperty("color");
      expect(card.label.length).toBeGreaterThan(0);
    });
  });
});

describe("topPredictions", () => {
  it("has 5 predictions", () => {
    expect(topPredictions).toHaveLength(5);
  });

  it("probabilities are between 0 and 100", () => {
    topPredictions.forEach((p) => {
      expect(p.probability).toBeGreaterThanOrEqual(0);
      expect(p.probability).toBeLessThanOrEqual(100);
    });
  });

  it("levels are valid", () => {
    const validLevels = ["HIGH", "MED", "LOW"];
    topPredictions.forEach((p) => {
      expect(validLevels).toContain(p.level);
    });
  });

  it("predictions are sorted by probability descending", () => {
    for (let i = 1; i < topPredictions.length; i++) {
      expect(topPredictions[i - 1].probability).toBeGreaterThanOrEqual(topPredictions[i].probability);
    }
  });
});

describe("liveSignals", () => {
  it("has at least 5 signals", () => {
    expect(liveSignals.length).toBeGreaterThanOrEqual(5);
  });

  it("each signal has required fields", () => {
    liveSignals.forEach((s) => {
      expect(s).toHaveProperty("id");
      expect(s).toHaveProperty("layer");
      expect(s).toHaveProperty("layerName");
      expect(s).toHaveProperty("source");
      expect(s).toHaveProperty("content");
      expect(s).toHaveProperty("timeAgo");
    });
  });

  it("layer IDs follow L1-L10 format", () => {
    liveSignals.forEach((s) => {
      expect(s.layer).toMatch(/^L\d{1,2}$/);
    });
  });

  it("covers multiple signal layers", () => {
    const layers = new Set(liveSignals.map((s) => s.layer));
    expect(layers.size).toBeGreaterThanOrEqual(4);
  });
});

describe("gameTheorySummary", () => {
  it("has a 2x2 payoff matrix", () => {
    expect(gameTheorySummary.matrix).toHaveLength(2);
    expect(gameTheorySummary.matrix[0]).toHaveLength(2);
    expect(gameTheorySummary.matrix[1]).toHaveLength(2);
  });

  it("has matching row and column headers", () => {
    expect(gameTheorySummary.headers.rows).toHaveLength(2);
    expect(gameTheorySummary.headers.cols).toHaveLength(2);
  });

  it("has valid convergence score (0-10)", () => {
    expect(gameTheorySummary.convergenceScore).toBeGreaterThanOrEqual(0);
    expect(gameTheorySummary.convergenceScore).toBeLessThanOrEqual(10);
  });
});

describe("probabilityData", () => {
  it("has 30 days of data", () => {
    expect(probabilityData).toHaveLength(30);
  });

  it("days are sequential 1-30", () => {
    probabilityData.forEach((d, i) => {
      expect(d.day).toBe(i + 1);
    });
  });

  it("each day has all four outcome fields", () => {
    probabilityData.forEach((d) => {
      expect(d).toHaveProperty("escalation");
      expect(d).toHaveProperty("negotiation");
      expect(d).toHaveProperty("stalemate");
      expect(d).toHaveProperty("resolution");
    });
  });

  it("probabilities are non-negative", () => {
    probabilityData.forEach((d) => {
      expect(d.escalation).toBeGreaterThanOrEqual(0);
      expect(d.negotiation).toBeGreaterThanOrEqual(0);
      expect(d.stalemate).toBeGreaterThanOrEqual(0);
      expect(d.resolution).toBeGreaterThanOrEqual(0);
    });
  });
});
