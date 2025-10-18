// src/tests/evaluation.test.js
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock-States, die wir pro Test befüllen
const banditState = {
  selectedStocks: { value: [] },
  activeBandit: { value: "bernoulli" }
};

const algorithmState = {
  investmentsGreedy: { value: [] },
  investmentsEGreedy: { value: [] },
  investmentsThompson: { value: [] },
  investmentsUCB: { value: [] },
  investmentsGradient: { value: [] },
  investmentsOptimisticInitial: { value: [] },
  investmentsUserAlgorithm: { value: [] }
};

// Module mocks
vi.mock("@/stores/bandit", () => ({
  useBanditStore: () => banditState
}));

vi.mock("@/stores/algorithms", () => ({
  useAlgorithmStore: () => algorithmState
}));

// storeToRefs gibt im Test einfach das Objekt selbst zurück, das bereits .value Felder hat
vi.mock("pinia", () => ({
  storeToRefs: (store) => store
}));

// Import nach den Mocks
import { algorithms_evaluation } from "../assets/utils/evaluation";

// Helper zum Bauen von Testdaten
function stock(id, params = {}) {
  // selectedStock mit .stock.id und optionalen Parametern
  return { stock: { id }, ...params };
}
function inv(selStock) {
  // AlgoInvestment hat ein Feld { stock: selectedStock }
  return { stock: selStock };
}

describe("algorithms_evaluation", () => {
  beforeEach(() => {
    // State zurücksetzen
    banditState.selectedStocks.value = [];
    banditState.activeBandit.value = "bernoulli";
    algorithmState.investmentsGreedy.value = [];
    algorithmState.investmentsEGreedy.value = [];
    algorithmState.investmentsThompson.value = [];
    algorithmState.investmentsUCB.value = [];
    algorithmState.investmentsGradient.value = [];
    algorithmState.investmentsOptimisticInitial.value = [];
    algorithmState.investmentsUserAlgorithm.value = [];
  });

  it("findet die beste Aktie für bernoulli und berechnet die Prozentwerte pro Schritt korrekt", () => {
    // Beste Aktie soll A sein wegen höherem bernoulli_param
    const A = stock("A", { bernoulli_param: 0.7 });
    const B = stock("B", { bernoulli_param: 0.4 });
    banditState.selectedStocks.value = [A, B];
    banditState.activeBandit.value = "bernoulli";

    // Greedy: A, B, A, A
    // Treffer relativ zu A: 1/1=100, 1/2=50, 2/3=66.67, 3/4=75
    algorithmState.investmentsGreedy.value = [inv(A), inv(B), inv(A), inv(A)];

    const out = algorithms_evaluation();

    const greedy = out.find(s => s.algorithm === "greedy");
    expect(greedy).toBeDefined();
    expect(greedy.percentages).toEqual([100, 50, 66.67, 75]);

    // Andere leer
    expect(out.find(s => s.algorithm === "eGreedy").percentages).toEqual([]);
    expect(out.find(s => s.algorithm === "thompson").percentages).toEqual([]);
  });

  it("findet die beste Aktie für gaussian und berechnet die Prozentwerte pro Schritt korrekt", () => {
    // Beste Aktie soll B sein wegen höherem gaussian_param
    const A = stock("A", { gaussian_param: 1.2 });
    const B = stock("B", { gaussian_param: 2.5 });
    banditState.selectedStocks.value = [A, B];
    banditState.activeBandit.value = "gaussian";

    // UCB: B, A, B, B, A
    // Beste ist B, also Prozentwerte: 100, 50, 66.67, 75, 60
    algorithmState.investmentsUCB.value = [inv(B), inv(A), inv(B), inv(B), inv(A)];

    const out = algorithms_evaluation();

    const ucb = out.find(s => s.algorithm === "ucb");
    expect(ucb).toBeDefined();
    expect(ucb.percentages).toEqual([100, 50, 66.67, 75, 60]);

    // Greedy leer
    expect(out.find(s => s.algorithm === "greedy").percentages).toEqual([]);
  });

  it("liefert leere Serien, wenn keine beste Aktie gefunden wird", () => {
    // Keine passenden Parameter für aktiven Bandit
    const A = stock("A"); // keine bernoulli_param
    const B = stock("B"); // keine bernoulli_param
    banditState.selectedStocks.value = [A, B];
    banditState.activeBandit.value = "bernoulli";

    algorithmState.investmentsGreedy.value = [inv(A), inv(B), inv(A)];

    const out = algorithms_evaluation();
    out.forEach(series => {
      expect(series.percentages).toEqual([]);
    });
  });
});