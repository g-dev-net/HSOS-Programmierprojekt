import type { AlgoInvestment } from "@/types/investment";
import type { AlgorithmKey, AlgorithmEvaluationSeries } from "@/types/evaluations";
import type { selectedStock } from "@/types/bandits";
import { useBanditStore } from "@/stores/bandit";
import { useAlgorithmStore } from "@/stores/algorithms";
import { storeToRefs } from "pinia";

// Bester Arm wird bestimmt
function getBestSelectedStock(stocks: selectedStock[], activeBandit: string): selectedStock | null {
  if (!stocks || stocks.length === 0) return null;

  if (activeBandit === "bernoulli") {
    const valid = stocks.filter(s => typeof s.bernoulli_param === "number");
    if (valid.length === 0) return null;
    return valid.reduce((best, s) => (s.bernoulli_param > best.bernoulli_param ? s : best), valid[0]);
  }

  if (activeBandit === "gaussian") {
    const valid = stocks.filter(s => typeof s.gaussian_param === "number");
    if (valid.length === 0) return null;
    return valid.reduce((best, s) => (s.gaussian_param > best.gaussian_param ? s : best), valid[0]);
  }

  return null;
}

// Trefferquote wird berechnet pro Schritt
function buildSeriesFor(
  algorithm: AlgorithmKey,
  arr: AlgoInvestment[],
  best: selectedStock | null
): AlgorithmEvaluationSeries {
  const percentages: number[] = [];
  if (!best || !arr) return { algorithm, percentages };

  let hits = 0;
  for (let i = 0; i < arr.length; i++) {
    const chosen = arr[i]?.stock;
    if (chosen && chosen.stock.id === best.stock.id) {
      hits += 1;
    }
    const pct = (hits / (i + 1)) * 100;
    percentages.push(parseFloat(pct.toFixed(2)));
  }

  return { algorithm, percentages };
}

// Öffentliche API
export function algorithms_evaluation(): AlgorithmEvaluationSeries[] {
  const banditStore = useBanditStore();
  const algorithmStore = useAlgorithmStore();

  // echte Refs extrahieren, damit wir .value benutzen können
  const { selectedStocks, activeBandit } = storeToRefs(banditStore);
  const {
    investmentsGreedy,
    investmentsEGreedy,
    investmentsThompson,
    investmentsUCB,
    investmentsGradient,
    investmentsOptimisticInitial,
    investmentsUserAlgorithm
  } = storeToRefs(algorithmStore);

  const best = getBestSelectedStock(selectedStocks.value, activeBandit.value);

  const out: AlgorithmEvaluationSeries[] = [];

  out.push(
    buildSeriesFor("greedy", investmentsGreedy.value, best),
    buildSeriesFor("eGreedy", investmentsEGreedy.value, best),
    buildSeriesFor("thompson", investmentsThompson.value, best),
    buildSeriesFor("ucb", investmentsUCB.value, best),
    buildSeriesFor("gradient", investmentsGradient.value, best),
    buildSeriesFor("optimisticInitial", investmentsOptimisticInitial.value, best)
  );

  if (investmentsUserAlgorithm.value.length > 0) {
    out.push(buildSeriesFor("user", investmentsUserAlgorithm.value, best));
  }

  return out;
}
