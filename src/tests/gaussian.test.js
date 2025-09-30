// gaussian.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("d3-random", () => {
  return {
    randomNormal: vi.fn((mu, sigma) => {
      return () => 0; // default sampler returns 0
    }),
  };
});

import { randomNormal } from "d3-random";

import {
  gaussian_arms,
  gaussian_pulls,
  gaussian_generate_arm,
  gaussian_pull_arm,
} from "../bandits/gaussian.js";

describe("gaussian bandit utils", () => {
  beforeEach(() => {
    gaussian_arms.length = 0;
    gaussian_pulls.length = 0;

    // keep the mock but reset call history and default implementation
    randomNormal.mockClear();
    randomNormal.mockImplementation((mu, sigma) => () => 0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("gaussian_generate_arm", () => {
    it("creates a new arm with correct fields and values", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.25); // r = -0.1 + 0.25*0.2 = -0.05
      const arm = gaussian_generate_arm("A", 100);

      expect(arm).toEqual({
        arm_id: "A",
        investment_volume: 100,
        mu_percent: -0.05,
        mu_absolute: 95,
      });

      expect(gaussian_arms).toHaveLength(1);
      expect(gaussian_arms[0]).toEqual(arm);
    });

    it("accepts numeric strings for investment_volume and coerces to number", () => {
      vi.spyOn(Math, "random").mockReturnValue(0); // r = -0.1
      const arm = gaussian_generate_arm("B", "200");
      expect(arm.investment_volume).toBe(200);
      expect(arm.mu_percent).toBeCloseTo(-0.1, 10);
      expect(arm.mu_absolute).toBeCloseTo(180, 10);
    });

    it("mu_percent stays in [-0.1, 0.1)", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.999999);
      const arm = gaussian_generate_arm("C", 50);
      expect(arm.mu_percent).toBeGreaterThanOrEqual(-0.1);
      expect(arm.mu_percent).toBeLessThan(0.1);
      expect(arm.mu_absolute).toBeCloseTo(50 * (1 + arm.mu_percent), 10);
    });

    it("overwrites an existing arm with the same id", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5); // r = 0
      const first = gaussian_generate_arm("X", 100);
      expect(gaussian_arms).toHaveLength(1);

      vi.spyOn(Math, "random").mockReturnValue(0.0); // r = -0.1
      const second = gaussian_generate_arm("X", 150);

      expect(gaussian_arms).toHaveLength(1);
      expect(gaussian_arms[0]).toEqual(second);
      expect(second.investment_volume).toBe(150);
      expect(second.mu_percent).toBeCloseTo(-0.1, 10);
      expect(first).not.toEqual(second);
    });

    it("throws for invalid arm_id", () => {
      expect(() => gaussian_generate_arm(undefined, 100)).toThrow(
        "Parameter 'arm_id' must be a nonempty string."
      );
      expect(() => gaussian_generate_arm("", 100)).toThrow(
        "Parameter 'arm_id' must be a nonempty string."
      );
      expect(() => gaussian_generate_arm("   ", 100)).toThrow(
        "Parameter 'arm_id' must be a nonempty string."
      );
    });

    it("throws for invalid investment_volume", () => {
      expect(() => gaussian_generate_arm("A", 0)).toThrow(
        "Parameter 'investment_volume' must be a positive number."
      );
      expect(() => gaussian_generate_arm("A", -5)).toThrow(
        "Parameter 'investment_volume' must be a positive number."
      );
      expect(() => gaussian_generate_arm("A", null)).toThrow(
        "Parameter 'investment_volume' must be a positive number."
      );
      expect(() => gaussian_generate_arm("A", NaN)).toThrow(
        "Parameter 'investment_volume' must be a positive number."
      );
    });
  });

  describe("gaussian_pull_arm", () => {
    it("throws if arm_id is invalid", () => {
      expect(() => gaussian_pull_arm(undefined)).toThrow(
        "Parameter 'arm_id' must be a nonempty string."
      );
      expect(() => gaussian_pull_arm("")).toThrow(
        "Parameter 'arm_id' must be a nonempty string."
      );
      expect(() => gaussian_pull_arm("   ")).toThrow(
        "Parameter 'arm_id' must be a nonempty string."
      );
    });

    it("throws if gaussian_arms_array is not an array", () => {
      expect(() => gaussian_pull_arm("A", null)).toThrow(
        "Parameter 'gaussian_arms_array' must be an array."
      );
      expect(() => gaussian_pull_arm("A", {})).toThrow(
        "Parameter 'gaussian_arms_array' must be an array."
      );
    });

    it("throws if the arm does not exist", () => {
      const other = [{ arm_id: "B", investment_volume: 100, mu_percent: 0, mu_absolute: 100 }];
      expect(() => gaussian_pull_arm("A", other)).toThrow(
        "No parameters found for Gaussian arm 'A'."
      );
    });

    it("uses randomNormal(mu_percent, 0.5) and its sample to compute value", () => {
      const arms = [{ arm_id: "A", investment_volume: 100, mu_percent: 0.05, mu_absolute: 105 }];

      randomNormal.mockImplementationOnce((mu, sigma) => {
        expect(mu).toBe(0.05);
        expect(sigma).toBe(0.5);
        return () => 0.12; // z
      });

      const res = gaussian_pull_arm("A", arms);

      expect(res).toMatchObject({
        arm_id: "A",
        pull_number: 1,
        mu_percent: 0.05,
        mu_absolute: 105,
      });

      expect(res.value).toBeCloseTo(0.12 * 100 + 100, 10);
      expect(res.value_percent).toBeCloseTo(0.12, 10);

      expect(gaussian_pulls).toHaveLength(1);
      expect(gaussian_pulls[0]).toEqual(res);
      expect(randomNormal).toHaveBeenCalledTimes(1);
    });

    it("increments pull_number globally and uses provided arms", () => {
      expect(gaussian_arms).toHaveLength(0);

      const arms = [
        { arm_id: "A", investment_volume: 50, mu_percent: -0.02, mu_absolute: 49 },
        { arm_id: "B", investment_volume: 200, mu_percent: 0.10, mu_absolute: 220 },
      ];

      const zSeq = [0, -0.1, 0.5];
      let i = 0;
      randomNormal.mockImplementation((_mu, _sigma) => {
        const z = zSeq[i++];
        return () => z;
      });

      const r1 = gaussian_pull_arm("A", arms); // z 0
      const r2 = gaussian_pull_arm("B", arms); // z -0.1
      const r3 = gaussian_pull_arm("B", arms); // z 0.5

      expect(r1.pull_number).toBe(1);
      expect(r2.pull_number).toBe(2);
      expect(r3.pull_number).toBe(3);

      expect(r1.value).toBeCloseTo(50, 10);
      expect(r2.value).toBeCloseTo(-0.1 * 200 + 200, 10);
      expect(r3.value).toBeCloseTo(0.5 * 200 + 200, 10);

      expect(gaussian_pulls).toHaveLength(3);
      expect(gaussian_arms).toHaveLength(0);
    });

    it("works with default global arms", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5); // r 0
      const arm = gaussian_generate_arm("G", 100);

      randomNormal.mockImplementationOnce((mu, sigma) => {
        expect(mu).toBeCloseTo(0, 10);
        expect(sigma).toBe(0.5);
        return () => 0.2;
      });

      const res = gaussian_pull_arm("G");

      expect(res.value).toBeCloseTo(120, 10);
      expect(res.value_percent).toBeCloseTo(0.2, 10);
      expect(res.mu_percent).toBeCloseTo(arm.mu_percent, 10);
      expect(res.mu_absolute).toBeCloseTo(arm.mu_absolute, 10);
      expect(gaussian_pulls).toHaveLength(1);
    });
  });
});
