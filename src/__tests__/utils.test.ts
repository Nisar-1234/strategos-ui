import { describe, it, expect } from "vitest";
import { cn, formatTimeAgo, formatNumber, formatCurrency } from "@/lib/utils";

describe("cn (class name merge)", () => {
  it("merges basic classes", () => {
    expect(cn("px-2", "py-3")).toBe("px-2 py-3");
  });

  it("handles conflicting tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", true && "visible")).toBe("base visible");
  });

  it("handles undefined and null", () => {
    expect(cn("base", undefined, null)).toBe("base");
  });
});

describe("formatTimeAgo", () => {
  it("returns minutes for <60", () => {
    expect(formatTimeAgo(5)).toBe("5m");
    expect(formatTimeAgo(59)).toBe("59m");
  });

  it("returns hours for 60-1439", () => {
    expect(formatTimeAgo(60)).toBe("1h");
    expect(formatTimeAgo(120)).toBe("2h");
    expect(formatTimeAgo(1439)).toBe("23h");
  });

  it("returns days for >=1440", () => {
    expect(formatTimeAgo(1440)).toBe("1d");
    expect(formatTimeAgo(2880)).toBe("2d");
  });
});

describe("formatNumber", () => {
  it("returns raw number for <1000", () => {
    expect(formatNumber(42)).toBe("42");
    expect(formatNumber(999)).toBe("999");
  });

  it("returns K format for thousands", () => {
    expect(formatNumber(1000)).toBe("1.0K");
    expect(formatNumber(5400)).toBe("5.4K");
  });

  it("returns M format for millions", () => {
    expect(formatNumber(1000000)).toBe("1.0M");
    expect(formatNumber(2500000)).toBe("2.5M");
  });
});

describe("formatCurrency", () => {
  it("formats USD by default", () => {
    expect(formatCurrency(1000)).toBe("$1,000");
    expect(formatCurrency(2.5)).toMatch(/^\$2\.50?$/);
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });
});
