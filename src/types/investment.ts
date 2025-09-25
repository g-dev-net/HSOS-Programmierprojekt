import type { selectedStock } from "./bandits";

export interface Investment {
    stock: selectedStock;
    gaussianReturn: number | null;
    bernoulliReturn: boolean | null;
}