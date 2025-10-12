// bernoulli.test.js
import { describe, it, expect, vi, afterEach } from "vitest";
import { bernoulli } from "../bandits/bernoulli.ts";

function mockRandom(v) {
  // v muss im Intervall [0, 1) liegen
  return vi.spyOn(Math, "random").mockReturnValue(v);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("bernoulli", () => {
  it("gibt immer einen boolean zurück", () => {
    const spy = mockRandom(0.42);
    const result = bernoulli(0.5);
    expect(typeof result).toBe("boolean");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("liefert true wenn Math.random <= win_prob ist", () => {
    mockRandom(0.3);
    expect(bernoulli(0.4)).toBe(true);   // 0.3 <= 0.4
  });

  it("liefert false wenn Math.random > win_prob ist", () => {
    mockRandom(0.7);
    expect(bernoulli(0.6)).toBe(false);  // 0.7 > 0.6
  });

  it("Grenzfall Gleichheit: true wenn Math.random genau win_prob ist", () => {
    mockRandom(0.7);
    expect(bernoulli(0.7)).toBe(true);   // <=
  });

  it("win_prob = 1 ergibt immer true", () => {
    mockRandom(0.0);
    expect(bernoulli(1)).toBe(true);
    vi.restoreAllMocks();
    mockRandom(0.999999);
    expect(bernoulli(1)).toBe(true);
  });

  it("win_prob = NaN ergibt false", () => {
    mockRandom(0.5);
    expect(bernoulli(Number.NaN)).toBe(false); // Vergleich mit NaN ist immer false
  });

  it("ruft Math.random genau einmal auf", () => {
    const spy = mockRandom(0.25);
    bernoulli(0.3);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
