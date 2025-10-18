import { bernoulli } from "../bandits/bernoulli.js";
import { gaussian } from "../bandits/gaussian.js";
import { useBanditStore } from "@/stores/bandit";
import { useAlgorithmStore } from "@/stores/algorithms";

type BanditKind = "bernoulli" | "gaussian";

export function upperConfidenceBound_bernoulli() {
  ucb("bernoulli");
}
export function upperConfidenceBound_gaussian() {
  ucb("gaussian");
}

function ucb(bandit: BanditKind) {
  const banditStore = useBanditStore();
  const algorithmStore = useAlgorithmStore();

  const stocks = banditStore.selectedStocks;
  const K = stocks.length;
  const T = banditStore.possibleInvestments;

  if (K === 0 || T <= 0) return;

  algorithmStore.algorithmsInProgress = true;

  // feste Standardabweichung für Gaussian Belohnungen
  const SIGMA = 0.15;

  // Nur nach Stock filtern, da investmentsUCB ausschließlich UCB Einträge enthält
  const pullsForStock = (idx: number) =>
    algorithmStore.investmentsUCB.filter(inv => inv.stock === stocks[idx]);

  const meanForStock = (idx: number) => {
    const pulls = pullsForStock(idx);
    if (pulls.length === 0) return 0;
    const sum = pulls.reduce((a, b) => a + (b.ucbReturn as number), 0);
    return sum / pulls.length;
  };

  // UCB je nach Banditentyp
  const ucbValue = (mean: number, n: number, t: number) => {
    if (bandit === "gaussian") {
      // bekannte Varianz: σ = SIGMA
      return mean + Math.sqrt((2 * SIGMA * SIGMA * Math.log(t)) / n);
    } else {
      // Bernoulli in [0, 1]
      return mean + Math.sqrt((2 * Math.log(t)) / n);
    }
  };

  // Initialisierung: jeden Arm genau einmal ziehen, solange Budget vorhanden
  for (let i = 0; i < K && totalUcbPulls() < T; i++) {
    if (pullsForStock(i).length === 0) {
      const r = drawReward(bandit, stocks[i]);
      pushInvestment(stocks[i], r);
    }
  }

  // Hauptschleife: läuft nur, wenn nach der Initialisierung noch Budget übrig ist
  // jetzt hat jeder Arm mindestens 1 Zug
  while (totalUcbPulls() < T) {
    const t = totalUcbPulls(); // t ≥ K ≥ 1

    const scores = stocks.map((_, i) => {
      const n_i = pullsForStock(i).length; // n_i ≥ 1
      const mean = meanForStock(i);
      return ucbValue(mean, n_i, t);
    });

    // besten Arm wählen
    let best = 0;
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] > scores[best]) best = i;
    }

    const chosen = stocks[best];
    const reward = drawReward(bandit, chosen);
    pushInvestment(chosen, reward);
  }

  algorithmStore.algorithmsInProgress = false;

  function drawReward(kind: BanditKind, chosen_arm: any): number {
    switch (kind) {
      case "bernoulli":
        return bernoulli(chosen_arm.bernoulli_param) ? 1 : 0;
      case "gaussian":
        return gaussian(chosen_arm.gaussian_param);
    }
  }

  function pushInvestment(chosen_arm: any, reward: number) {
    algorithmStore.investmentsUCB.push({
      stock: chosen_arm,
      greedyReturn: null,
      eGreedyReturn: null,
      thompsonReturn: null,
      ucbReturn: reward,
      gradientReturn: null,
      optimisticInitialReturn: null,
      userAlgorithmReturn: null
    });
  }

  function totalUcbPulls() {
    return algorithmStore.investmentsUCB.length;
  }
}
