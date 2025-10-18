# Algorithm Evaluation

## Overview

The module computes per-step hit rates for different multi-armed bandit algorithms based on historical investments.
For a given set of `selectedStock` items and the active bandit type, it picks a single best stock.
It then evaluates each algorithm’s investment history and produces a series of hit percentages over time.

Output shape:

```ts
type AlgorithmEvaluationSeries = {
  algorithm: AlgorithmKey
  percentages: number[] // length equals number of investments for that algorithm
}
```

Typical consumer: a chart component that plots cumulative hit percentage per step for each algorithm.

## Public API

```ts
export function algorithms_evaluation(): AlgorithmEvaluationSeries[]
```

Returns one `AlgorithmEvaluationSeries` per algorithm that has data.
The order is: `greedy`, `eGreedy`, `thompson`, `ucb`, `gradient`, `optimisticInitial`, and optionally `user`.

## How it works

1. **Select the best stock**

   * Uses `getBestSelectedStock(stocks, activeBandit)`.
   * When `activeBandit === "bernoulli"` it looks at `bernoulli_param`.
   * When `activeBandit === "gaussian"` it looks at `gaussian_param`.
   * Picks the stock with the highest parameter among those that have a numeric value.
   * Returns `null` when no valid candidate exists.

2. **Build per-step hit percentages**

   * Uses `buildSeriesFor(algorithm, arr, best)`.
   * Walks the investments array `arr` once.
   * A hit occurs when the invested `stock.id` equals `best.stock.id`.
   * After each step `i`, computes `(hits / (i + 1)) * 100` and rounds to 2 decimals.
   * Returns `{ algorithm, percentages }`. Returns empty percentages when `best` or `arr` is missing.

3. **Aggregate results**

   * Pulls all investment arrays from the Pinia `algorithmStore`.
   * Computes series for each known algorithm.
   * Adds the user algorithm only if it has at least one investment.

## Data expectations

These types are referenced by the code. Your project already defines them. The following is an illustrative sketch only.

```ts
type AlgorithmKey =
  | "greedy"
  | "eGreedy"
  | "thompson"
  | "ucb"
  | "gradient"
  | "optimisticInitial"
  | "user"

type AlgoInvestment = {
  stock: { stock: { id: string } }
  // other fields like reward, timestamp, etc
}

type selectedStock = {
  stock: { id: string }
  bernoulli_param?: number
  gaussian_param?: number
}
```

Store expectations:

* `useBanditStore` exposes `selectedStocks` and `activeBandit` as refs.
* `useAlgorithmStore` exposes one ref array per algorithm with investments.

## Complexity and performance

* `getBestSelectedStock` is O(n) over `selectedStocks`.
* `buildSeriesFor` is O(m) over the investment array of a single algorithm.
* The module is linear in the size of inputs. Suitable for real-time chart updates on typical dataset sizes.

## Edge cases

* No stocks or no valid parameter for the active bandit leads to `best === null`. All series will be empty.
* Empty investment arrays produce empty `percentages`.
* Mixed or incorrect types are filtered out by the `typeof ... === "number"` checks for bandit params.

## Usage example

```ts
import { algorithms_evaluation } from "@/evaluation/algorithms"

const series = algorithms_evaluation()
// Example: feed into a chart
// series looks like:
// [
//   { algorithm: "greedy", percentages: [0, 50, 66.67, ...] },
//   { algorithm: "eGreedy", percentages: [...] },
//   ...
// ]
```

## Displaying the results

You can render the returned series with your favorite chart library.

* X axis: step index starting at 1.
* Y axis: cumulative hit percentage.
* One line per `algorithm`.

Suggested details:

* Tooltip with step, hits so far, and percentage.
* Legend with algorithm names.
* Y axis from 0 to 100.

## Testing tips

* Seed `selectedStocks` with two or more candidates and set `activeBandit` to `"bernoulli"` or `"gaussian"` as needed.
* Create a short synthetic investment sequence where you control which `stock.id` is chosen at each step.
* Verify rounding to 2 decimals is stable across browsers.

## Extensibility

* Add a new bandit flavor

  * Extend `getBestSelectedStock` with a new branch that reads the appropriate parameter.
  * Extend the `AlgorithmKey` union and the store to expose its investments.
  * Push another `buildSeriesFor` call in `algorithms_evaluation`.

* Add different evaluation metrics

  * Create a `buildPrecisionAtKFor(...)` or `buildRewardSeriesFor(...)`.
  * Return parallel series arrays or a richer object.

## Notes on reactivity

* The code uses `storeToRefs` to access `.value`. This keeps things simple inside computed or effect contexts.
* If you call `algorithms_evaluation()` frequently, consider memoizing results based on a hash of inputs, or wrapping it in a computed that depends on the relevant refs.

## Safety and correctness checklist

* Inputs are refs from Pinia. Confirm they are initialized before first call.
* Ensure each `AlgoInvestment` includes a `stock.stock.id` string.
* Confirm `activeBandit` is either `"bernoulli"` or `"gaussian"` when you expect a non-null best stock.
* Unit tests cover both bandit types and the user algorithm branch.
