// bernoulli.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  bernoulli_arms,
  bernoulli_generate_arm,
  bernoulli_pulls,
  bernoulli_pull_arm,
} from "../bandits/bernoulli.js";

describe("bernoulli bandit utils", () => {
  beforeEach(() => {
    bernoulli_arms.length = 0;
    bernoulli_pulls.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("bernoulli_generate_arm", () => {
    it("creates a new arm with a valid win probability", () => {
      const arm = bernoulli_generate_arm("A");
      expect(arm.arm_id).toBe("A");
      expect(typeof arm.win_prob).toBe("number");
      expect(arm.win_prob).toBeGreaterThanOrEqual(0.01);
      expect(arm.win_prob).toBeLessThan(0.99);
      expect(bernoulli_arms).toHaveLength(1);
      expect(bernoulli_arms[0]).toEqual(arm);
    });

    it("sets the minimum probability when Math.random is 0", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);
      const arm = bernoulli_generate_arm("B");
      expect(arm.win_prob).toBeCloseTo(0.01, 10);
    });

    it("stays just below 0.99 for very large Math.random values", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.999999);
      const arm = bernoulli_generate_arm("C");
      expect(arm.win_prob).toBeLessThan(0.99);
      expect(arm.win_prob).toBeGreaterThan(0.98);
    });

    it("updates an existing arm when the same id is used", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.1);
      const first = bernoulli_generate_arm("X");
      expect(bernoulli_arms).toHaveLength(1);

      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const second = bernoulli_generate_arm("X");
      expect(bernoulli_arms).toHaveLength(1);
      expect(second.arm_id).toBe("X");
      expect(second.win_prob).not.toBeCloseTo(first.win_prob);
      expect(bernoulli_arms[0]).toEqual(second);
    });

    it("always generates probabilities within the allowed range across many runs", () => {
      for (let i = 0; i < 1000; i++) {
        const arm = bernoulli_generate_arm(`arm-${i}`);
        expect(arm.win_prob).toBeGreaterThanOrEqual(0.01);
        expect(arm.win_prob).toBeLessThan(0.99);
      }
      expect(bernoulli_arms).toHaveLength(1000);
    });
  });

  describe("bernoulli_pull_arm", () => {
    it("throws if arm_id is invalid", () => {
      expect(() => bernoulli_pull_arm(undefined, [])).toThrow(
        "Parameter 'arm_id' must be a nonempty string."
      );
      expect(() => bernoulli_pull_arm("", [])).toThrow(
        "Parameter 'arm_id' must be a nonempty string."
      );
      expect(() => bernoulli_pull_arm("   ", [])).toThrow(
        "Parameter 'arm_id' must be a nonempty string."
      );
      expect(() => bernoulli_pull_arm(123, [])).toThrow(
        "Parameter 'arm_id' must be a nonempty string."
      );
    });

    it("throws if bernoulli_arms_array is not an array", () => {
      expect(() => bernoulli_pull_arm("A", null)).toThrow(
        "Parameter 'bernoulli_arms_array' must be an array."
      );
      expect(() => bernoulli_pull_arm("A", {})).toThrow(
        "Parameter 'bernoulli_arms_array' must be an array."
      );
    });

    it("throws if no arm with the given id exists", () => {
      const otherArms = [{ arm_id: "B", win_prob: 0.5 }];
      expect(() => bernoulli_pull_arm("A", otherArms)).toThrow(
        "No win probability found for arm 'A'."
      );
    });

    it("returns a win when Math.random is less than or equal to win_prob", () => {
      const arms = [{ arm_id: "A", win_prob: 0.7 }];
      vi.spyOn(Math, "random").mockReturnValue(0.7);
      const r = bernoulli_pull_arm("A", arms);
      expect(r).toEqual({ arm_id: "A", pull_number: 1, won: true });
      expect(bernoulli_pulls).toHaveLength(1);
      expect(bernoulli_pulls[0]).toEqual(r);
    });

    it("returns a loss when Math.random is greater than win_prob", () => {
      const arms = [{ arm_id: "A", win_prob: 0.7 }];
      vi.spyOn(Math, "random").mockReturnValue(0.7000001);
      const r = bernoulli_pull_arm("A", arms);
      expect(r).toEqual({ arm_id: "A", pull_number: 1, won: false });
      expect(bernoulli_pulls).toHaveLength(1);
    });

    it("increments pull_number globally across pulls", () => {
      const arms = [{ arm_id: "A", win_prob: 0.3 }, { arm_id: "B", win_prob: 0.9 }];
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.2)
        .mockReturnValueOnce(0.95)
        .mockReturnValueOnce(0.9);

      const r1 = bernoulli_pull_arm("A", arms);
      const r2 = bernoulli_pull_arm("B", arms);
      const r3 = bernoulli_pull_arm("B", arms);

      expect(r1.pull_number).toBe(1);
      expect(r2.pull_number).toBe(2);
      expect(r3.pull_number).toBe(3);
      expect(bernoulli_pulls).toHaveLength(3);
      expect(bernoulli_pulls.map(x => x.won)).toEqual([true, false, true]);
    });

    it("uses the provided arms array instead of the global list", () => {
      expect(bernoulli_arms).toHaveLength(0);

      const localArms = [{ arm_id: "L1", win_prob: 0.5 }];
      vi.spyOn(Math, "random").mockReturnValue(0.49);
      const r = bernoulli_pull_arm("L1", localArms);
      expect(r.won).toBe(true);
      expect(bernoulli_pulls).toHaveLength(1);
      expect(bernoulli_arms).toHaveLength(0);
    });
  });
});
