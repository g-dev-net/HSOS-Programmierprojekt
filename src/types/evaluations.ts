export type AlgorithmKey =
  | "greedy"
  | "eGreedy"
  | "thompson"
  | "ucb"
  | "gradient"
  | "optimisticInitial"
  | "user";

export interface AlgorithmEvaluationSeries {
  algorithm: AlgorithmKey;
  percentages: number[];
}