import type { selectedStock } from "./bandits";

export interface Investment {
    stock: selectedStock;
    gaussianReturn: number | null;
    bernoulliReturn: boolean | null;
}

export interface AlgoInvestment {
    stock: selectedStock;
    greedyReturn: number | null;
    eGreedyReturn: number | null;
    thompsonReturn: number | null;
    ucbReturn: number | null;
    gradientReturn: number | null;
    optimisticInitialReturn: number | null;
    userAlgorithmReturn: number | null;
}

export interface DisplayDataPoint {
    x: number;
    y: number;
    label: string;
    stock: string;
    portfolioValue: string;
    banditResult: string;
}