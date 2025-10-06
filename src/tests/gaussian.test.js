// gaussian.test.js
import { describe, it, expect, vi, afterEach } from "vitest";

// Modul vor dem Import der SUT mocken
vi.mock("d3-random", () => ({
  randomNormal: vi.fn(),
}));

import { randomNormal } from "d3-random";
import { gaussian } from "../bandits/gaussian.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

// Hilfsfunktion um den Sampler zu mocken
function mockSamplerReturn(value) {
  const sampler = vi.fn().mockReturnValue(value);
  randomNormal.mockReturnValue(sampler);
  return sampler;
}

describe("gaussian", () => {
  // Grundlegende Funktionalitäten
  it("ruft randomNormal mit mu und fester sigma 0.5 auf", () => {
    mockSamplerReturn(123);
    const mu = 42;
    const out = gaussian(mu);

    expect(randomNormal).toHaveBeenCalledTimes(1);
    expect(randomNormal).toHaveBeenCalledWith(mu, 0.5);
    expect(out).toBe(123);
  });

  it("ruft den zurückgegebenen Sampler genau einmal auf und gibt dessen Wert zurück", () => {
    const sampler = mockSamplerReturn(3.14);
    const res = gaussian(10);

    expect(sampler).toHaveBeenCalledTimes(1);
    expect(typeof res).toBe("number");
    expect(res).toBe(3.14);
  });

  it("bei mehreren Aufrufen wird randomNormal jeweils neu aufgerufen", () => {
    const sampler1 = vi.fn().mockReturnValue(1.23);
    const sampler2 = vi.fn().mockReturnValue(4.56);
    randomNormal
      .mockReturnValueOnce(sampler1)
      .mockReturnValueOnce(sampler2);

    const a = gaussian(5);
    const b = gaussian(7);

    expect(randomNormal).toHaveBeenCalledTimes(2);
    expect(randomNormal).toHaveBeenNthCalledWith(1, 5, 0.5);
    expect(randomNormal).toHaveBeenNthCalledWith(2, 7, 0.5);
    expect(a).toBe(1.23);
    expect(b).toBe(4.56);
    expect(sampler1).toHaveBeenCalledTimes(1);
    expect(sampler2).toHaveBeenCalledTimes(1);
  });

  // Randfälle
  it("mu_percent = NaN wird an randomNormal durchgereicht", () => {
    mockSamplerReturn(NaN);
    const out = gaussian(Number.NaN);

    expect(randomNormal).toHaveBeenCalledWith(Number.NaN, 0.5);
    expect(Number.isNaN(out)).toBe(true);
  });

  it("mu_percent = Infinity wird an randomNormal durchgereicht", () => {
    mockSamplerReturn(99);
    const out = gaussian(Infinity);

    expect(randomNormal).toHaveBeenCalledWith(Infinity, 0.5);
    expect(out).toBe(99);
  });

  it("mu_percent = -Infinity wird an randomNormal durchgereicht", () => {
    mockSamplerReturn(-99);
    const out = gaussian(-Infinity);

    expect(randomNormal).toHaveBeenCalledWith(-Infinity, 0.5);
    expect(out).toBe(-99);
  });

  it("sehr große mu Werte werden ohne Validierung durchgereicht", () => {
    mockSamplerReturn(1e6 + 0.25);
    const mu = 1e12;
    const out = gaussian(mu);

    expect(randomNormal).toHaveBeenCalledWith(mu, 0.5);
    expect(out).toBeCloseTo(1e6 + 0.25, 10);
  });
});
