import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  bernoulli_bandits,
  bernoulli_zuege,
  generate_bernoulli_bandit,
  fuehre_bernoulli_zug_aus,
} from "../bandits/bernoulli.js";


describe("Bernoulli Bandit", () => {
  beforeEach(() => {
    bernoulli_bandits.length = 0;
    bernoulli_zuege.length = 0;
    vi.restoreAllMocks();
  });

  it("erstellt und aktualisiert Banditen deterministisch", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.3);
    const r1 = generate_bernoulli_bandit("AMAZON");
    expect(r1).toEqual({ aktie: "AMAZON", p_gewinn: 0.3 });
    expect(bernoulli_bandits).toHaveLength(1);

    vi.spyOn(Math, "random").mockReturnValueOnce(0.7);
    const r2 = generate_bernoulli_bandit("AMAZON");
    expect(r2).toEqual({ aktie: "AMAZON", p_gewinn: 0.7 });
    expect(bernoulli_bandits[0]).toEqual({ aktie: "AMAZON", p_gewinn: 0.7 });
  });

  it("gewinnt bei u < p_gewinn und verliert sonst", () => {
    bernoulli_bandits.push({ aktie: "GOOGLE", p_gewinn: 0.5 });

    vi.spyOn(Math, "random").mockReturnValueOnce(0.5);
    const win = fuehre_bernoulli_zug_aus("GOOGLE", bernoulli_bandits);
    expect(win).toMatchObject({ aktie: "GOOGLE", zug: 1, gewonnen: true });

    vi.spyOn(Math, "random").mockReturnValueOnce(0.51);
    const lose = fuehre_bernoulli_zug_aus("GOOGLE", bernoulli_bandits);
    expect(lose).toMatchObject({ aktie: "GOOGLE", zug: 2, gewonnen: false });
  });

  it("inkrementiert die Zugnummern global", () => {
    bernoulli_bandits.push(
      { aktie: "AMAZON", p_gewinn: 1 },
      { aktie: "GOOGLE", p_gewinn: 0 }
    );

    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.0)  // Gewinn für AMAZON
      .mockReturnValueOnce(0.9); // Verlust für GOOGLE

    const r1 = fuehre_bernoulli_zug_aus("AMAZON", bernoulli_bandits);
    const r2 = fuehre_bernoulli_zug_aus("GOOGLE", bernoulli_bandits);

    expect(r1.zug).toBe(1);
    expect(r2.zug).toBe(2);
  });

  it("wirft sinnvolle Fehler", () => {
    expect(() => fuehre_bernoulli_zug_aus("", [])).toThrow(/nichtleere Zeichenkette/);
    expect(() => fuehre_bernoulli_zug_aus("AMAZON", {})).toThrow(/muss ein Array sein/);
    expect(() => fuehre_bernoulli_zug_aus("AMAZON", [])).toThrow(/Keine Gewinnwahrscheinlichkeit/);
  });
});
