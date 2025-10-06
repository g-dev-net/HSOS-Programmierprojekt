// gaussian.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

// Modul vor dem Import des SUT mocken
vi.mock("d3-random", () => ({
  randomNormal: vi.fn(), // wird in den Tests konfiguriert
}));

import { randomNormal } from "d3-random";
import { gaussian } from "../bandits/gaussian.ts";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("gaussian", () => {
  it("liefert eine Zahl und ruft den Sampler genau einmal auf", () => {
    const sampleFn = vi.fn(() => 12.34);
    randomNormal.mockReturnValue(sampleFn);

    const result = gaussian(0.2);

    expect(randomNormal).toHaveBeenCalledTimes(1);
    expect(sampleFn).toHaveBeenCalledTimes(1);
    expect(typeof result).toBe("number");
    expect(result).toBe(12.34);
  });

  it("übergibt mu_percent und sigma 0.5 an randomNormal", () => {
    const sampleFn = vi.fn(() => 0);
    randomNormal.mockReturnValue(sampleFn);

    const mu = 0.75;
    gaussian(mu);

    expect(randomNormal).toHaveBeenCalledWith(mu, 0.5);
  });

  it("propagiert verschiedene Samplerwerte korrekt", () => {
    const sampleFn1 = vi.fn(() => -1.1);
    const sampleFn2 = vi.fn(() => 3.3);

    // zwei Aufrufe von gaussian, daher zwei Rückgaben
    randomNormal
      .mockReturnValueOnce(sampleFn1)
      .mockReturnValueOnce(sampleFn2);

    const r1 = gaussian(0.1);
    const r2 = gaussian(0.9);

    expect(r1).toBe(-1.1);
    expect(r2).toBe(3.3);
    expect(sampleFn1).toHaveBeenCalledTimes(1);
    expect(sampleFn2).toHaveBeenCalledTimes(1);
  });

  it("nutzt den übergebenen Mittelwert für mehrere Aufrufe", () => {
    const sampleFn = vi.fn(() => 0);
    randomNormal
      .mockReturnValueOnce(sampleFn)
      .mockReturnValueOnce(sampleFn);

    gaussian(0.2);
    gaussian(0.8);

    expect(randomNormal.mock.calls[0]).toEqual([0.2, 0.5]);
    expect(randomNormal.mock.calls[1]).toEqual([0.8, 0.5]);
  });
});
