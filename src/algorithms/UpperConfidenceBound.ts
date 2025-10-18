import { bernoulli } from "../bandits/bernoulli.js";
import { gaussian } from "../bandits/gaussian.js";
import { useBanditStore } from "@/stores/bandit";
import { useAlgorithmStore } from "@/stores/algorithms";
import { addUCBResult } from '@/stores/compare_algos_store';
import { setParamAlgo } from '@/stores/parameter_algos.ts';

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
  const UCB_C = setParamAlgo('ucb');

  const stocks = banditStore.selectedStocks;
  const K = stocks.length;
  const T = banditStore.possibleInvestments;

  if (K === 0 || T <= 0) return;

  algorithmStore.algorithmsInProgress = true;

  // Im Compare-Modus: Nutze lokales temporäres Array statt Pinia Store
  const isCompareMode = algorithmStore.algorithmsCompare;
  const tempInvestments: any[] = [];

  // Nur nach Stock filtern, da investmentsUCB ausschließlich UCB-Einträge enthält
  // feste Standardabweichung für Gaussian Belohnungen
  const SIGMA = 0.15;

  // Nur nach Stock filtern, da investmentsUCB ausschließlich UCB Einträge enthält
  const pullsForStock = (idx: number) =>
    isCompareMode 
      ? tempInvestments.filter(inv => inv.stock === stocks[idx])
      : algorithmStore.investmentsUCB.filter(inv => inv.stock === stocks[idx]);

  const meanForStock = (idx: number) => {
    const pulls = pullsForStock(idx);
    if (pulls.length === 0) return 0;
    const sum = pulls.reduce((a, b) => a + (b.ucbReturn as number), 0);
    return sum / pulls.length;
  };

 // const ucbValue = (mean: number, n: number, t: number) =>
 //   mean + Math.sqrt((UCB_C * Math.log(t)) / n);

 const totalUcbPulls = () => isCompareMode ? tempInvestments.length : algorithmStore.investmentsUCB.length;

 const pushInvestment = (chosen_arm: any, reward: number) => {
   if (isCompareMode) {
     tempInvestments.push({
       stock: chosen_arm,
       greedyReturn: null,
       eGreedyReturn: null,
       thompsonReturn: null,
       ucbReturn: reward,
       gradientReturn: null,
       optimisticInitialReturn: null,
       userAlgorithmReturn: null
     });
   } else {
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
  };
  
  // UCB je nach Banditentyp
  const ucbValue = (mean: number, n: number, t: number) => {
    if (bandit === "gaussian") {
      // bekannte Varianz: σ = SIGMA
      return mean + Math.sqrt((UCB_C * SIGMA * SIGMA * Math.log(t)) / n);
    } else {
      // Bernoulli in [0, 1]
      return mean + Math.sqrt((UCB_C * Math.log(t)) / n);
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
    let reward = drawReward(bandit, chosen);
    
    if (algorithmStore.algorithmsCompare === false) {
      pushInvestment(chosen, reward);
    } else {
      pushInvestment(chosen, reward);  // Auch im Compare-Modus für nächste Iteration
      
      let compareReward = reward;
      if (algorithmStore.optimalActions === true) {
        compareReward = chosen.stock.id;
      }
      addUCBResult(UCB_C, compareReward);
    }
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
}
