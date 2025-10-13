# Upper Confidence Bound Algorithm Technical Documentation

## Overview

The `UpperConfidenceBound.ts` module implements a UCB strategy for Multi Armed Bandit problems with Bernoulli and Gaussian reward models. The module follows a Vue.js architecture with Pinia stores and records UCB specific results in a dedicated array. For Gaussian rewards a fixed standard deviation `σ = 0.15` is used to scale the confidence bonus.

## Architecture

Two Pinia stores are used.

* `useBanditStore` manages the fixed set of selected stocks for a run and the total pull budget.
* `useAlgorithmStore` tracks UCB progress and stores only UCB pulls in `investmentsUCB` to keep data isolated.

## The UCB Approach

UCB balances exploration and exploitation via an optimistic estimate for each arm (i). Let (n_i) be the number of UCB pulls for arm (i), (\hat\mu_i) the empirical mean reward of arm (i) computed from UCB pulls only, and (t) the total number of UCB pulls so far.

**Bernoulli arms**
[
\mathrm{UCB}_i(t)=\hat\mu_i+\sqrt{\frac{2\ln t}{n_i}}
]

**Gaussian arms with fixed variance (\sigma^2)**
[
\mathrm{UCB}_i(t)=\hat\mu_i+\sqrt{\frac{2\sigma^2\ln t}{n_i}},\quad \sigma=0.15
]

The algorithm selects the arm with the largest UCB value.

### Key Advantages

* Built in exploration through a confidence bonus that shrinks with more pulls per arm
* Deterministic policy without random sampling
* Logarithmic regret under standard assumptions for bounded or subgaussian rewards

## Functions

### `upperConfidenceBound_bernoulli(): void`

Runs UCB on Bernoulli bandits.

#### Dependencies for Bernoulli

* Requires `banditStore.selectedStocks` with `bernoulli_param: number`
* Writes results to `algorithmStore.investmentsUCB`

### `upperConfidenceBound_gaussian(): void`

Runs UCB on Gaussian bandits.

#### Dependencies for Gaussian

* Requires `banditStore.selectedStocks` with `gaussian_param: number | object` depending on your `gaussian` helper
* Writes results to `algorithmStore.investmentsUCB`

### `ucb(bandit: 'bernoulli' | 'gaussian'): void`

Core runner shared by both wrappers.

#### Algorithm Flow

1. Set `algorithmsInProgress = true`
2. Initialization Pull each arm once as long as the remaining budget allows it. If the budget (T) is smaller than the arm count (K) the run ends after initialization
3. Main loop While `totalUcbPulls() < T`

   * Set `t = totalUcbPulls()`. After initialization `t ≥ K ≥ 1`
   * For each arm compute

     * (n_i) as the number of entries in `investmentsUCB` for that stock
     * (\text{mean}_i) as the average of `ucbReturn` for that stock
     * For Bernoulli: `score_i = mean_i + sqrt((2 * ln t) / n_i)`
     * For Gaussian: `score_i = mean_i + sqrt((2 * SIGMA * SIGMA * ln t) / n_i)` with `SIGMA = 0.15`
   * Select the arm with the highest score and draw a reward using the bandit model
   * Append the result to `investmentsUCB`
4. Set `algorithmsInProgress = false`

## Statistical Implementation

### Score computation

```ts
const SIGMA = 0.15;

const ucbValue = (mean: number, n: number, t: number, bandit: 'bernoulli' | 'gaussian') =>
  bandit === 'gaussian'
    ? mean + Math.sqrt((2 * SIGMA * SIGMA * Math.log(t)) / n)
    : mean + Math.sqrt((2 * Math.log(t)) / n);
```

* `mean` is the empirical average over UCB returns of the arm
* The square root term is the optimism bonus that decreases with `n` and increases slowly with `t`
* For Gaussian arms the bonus is scaled by the fixed variance proxy `σ^2 = SIGMA^2`

### Bernoulli reward

```ts
const reward = bernoulli(chosen_arm.bernoulli_param) ? 1 : 0;
```

Returns 0 or 1 which fits the bounded reward assumption of UCB1.

### Gaussian reward

```ts
const reward = gaussian(chosen_arm.gaussian_param);
```

Returns a real valued reward. UCB with the fixed variance bonus works well for subgaussian cases. Consider normalization or a variance aware UCB if variance is very high.

## Data Management

### Store Integration

#### `useBanditStore`

* `selectedStocks`: fixed list of stocks for the whole run. No new stocks are added during a run
* `possibleInvestments`: total number of pulls (T)

#### `useAlgorithmStore`

* `algorithmsInProgress`: boolean flag for UI feedback
* `investmentsUCB`: array of UCB specific investment entries

### Investment Entry Shape

```ts
{
  stock: chosen_arm,
  greedyReturn: null,
  eGreedyReturn: null,
  thompsonReturn: null,
  ucbReturn: reward,
  gradientReturn: null,
  optimisticInitialReturn: null,
  userAlgorithmReturn: null
}
```

Only `ucbReturn` is populated for UCB. Keeping UCB results separate guarantees that statistics are computed from UCB data only.

## Key Helpers

```ts
const pullsForStock = (idx: number) =>
  algorithmStore.investmentsUCB.filter(inv => inv.stock === stocks[idx]);

const meanForStock = (idx: number) => {
  const pulls = pullsForStock(idx);
  if (pulls.length === 0) return 0;
  const sum = pulls.reduce((a, b) => a + (b.ucbReturn as number), 0);
  return sum / pulls.length;
};

function totalUcbPulls() {
  return algorithmStore.investmentsUCB.length;
}
```

These helpers compute per arm counts and means from the dedicated UCB array and provide the global pull counter.

## Usage Example

```ts
import {
  upperConfidenceBound_bernoulli,
  upperConfidenceBound_gaussian
} from '@/algorithms/UpperConfidenceBound';

banditStore.selectedStocks = [
  { /* stock object */, bernoulli_param: 0.7, gaussian_param: { /* params or mean */ } },
  { /* another stock */, bernoulli_param: 0.5, gaussian_param: { /* params or mean */ } }
];
banditStore.possibleInvestments = 1000;

upperConfidenceBound_bernoulli();
// or
upperConfidenceBound_gaussian();

console.log(algorithmStore.investmentsUCB);
```

## Complexity

* Each selection step filters `investmentsUCB` per arm to compute (n_i) and (\hat\mu_i). This is simple and clear which is good for moderate budgets
* For very large (T) maintain per arm `count[i]` and `sum[i]` in local arrays and update them incrementally after each pull. This avoids repeated filtering and keeps per step work linear in the number of arms

## Limitations

1. UCB with a fixed variance bonus assumes bounded or subgaussian rewards. This matches Bernoulli rewards. For Gaussian rewards with high variance consider normalization or a tuned, variance aware UCB variant
2. The policy is deterministic which simplifies debugging
3. The current implementation recomputes statistics from history. Incremental statistics can speed up large runs

## Summary

* `UpperConfidenceBound.ts` runs a UCB strategy for a fixed set of stocks and a fixed budget
* It initializes with one pull per arm then repeatedly selects the arm with the largest optimistic estimate
* Results are written only to `investmentsUCB` which keeps UCB separate from other algorithms and simplifies analysis
