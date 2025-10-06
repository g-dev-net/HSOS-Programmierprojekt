// bernoulli.test.js
import { describe, it, expect, vi, afterEach } from "vitest";
import { bernoulli } from "../bandits/bernoulli.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("bernoulli", () => {
  it("liefert einen boolean", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.42);
    expect(typeof bernoulli(0.5)).toBe("boolean");
  });

  it("gibt true zurück wenn Math.random kleiner als win_prob ist", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.3);
    expect(bernoulli(0.5)).toBe(true);
  });

  it("gibt true zurück wenn Math.random genau win_prob ist", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(bernoulli(0.5)).toBe(true);
  });

  it("gibt false zurück wenn Math.random größer als win_prob ist", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5000001);
    expect(bernoulli(0.5)).toBe(false);
  });

  it("Randfall win_prob 0 gewinnt nur bei Math.random 0", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(bernoulli(0)).toBe(true);

    vi.spyOn(Math, "random").mockReturnValue(0.0000001);
    expect(bernoulli(0)).toBe(false);
  });

  it("Randfall win_prob 1 gewinnt immer", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(bernoulli(1)).toBe(true);

    vi.spyOn(Math, "random").mockReturnValue(0.9999999);
    expect(bernoulli(1)).toBe(true);
  });

  it("prüft mehrere typische Schwellenwerte", () => {
    const faelle = [
      { p: 0.1, r: 0.05, expected: true },
      { p: 0.1, r: 0.1, expected: true },
      { p: 0.1, r: 0.1000001, expected: false },
      { p: 0.7, r: 0.7, expected: true },
      { p: 0.7, r: 0.700001, expected: false },
      { p: 0.3, r: 0.29, expected: true },
    ];

    for (const { p, r, expected } of faelle) {
      vi.spyOn(Math, "random").mockReturnValue(r);
      expect(bernoulli(p)).toBe(expected);
    }
  });
});
