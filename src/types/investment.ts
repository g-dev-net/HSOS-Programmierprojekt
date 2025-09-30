import type { selectedStock } from "./bandits";

export interface Investment {
    stock: selectedStock;
    gaussianReturn: number | null;
    bernoulliReturn: boolean | null;
}

export interface AlgoInvestment {
    stock: selectedStock;
    greedyReturn: number | null;
    // Hier können später weitere Algorithmus-spezifische Returns ergänzt werden
}

export interface DisplayDataPoint {
    x: number;
    y: number;
    label: string;
    stock: string;
    portfolioValue: string;
    banditResult: string;
}