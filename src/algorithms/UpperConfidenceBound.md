# Upper Confidence Bound Algorithm Technical Documentation

## Overview

The `UpperConfidenceBound.ts` module implements a UCB strategy for Multi Armed Bandit problems with Bernoulli and Gaussian reward models.
The module follows a Vue.js architecture with Pinia stores and records UCB specific results in a dedicated array.

## Architecture

Two Pinia stores are used.

* `useBanditStore` manages the fixed set of selected stocks for a run and the total pull budget.
* `useAlgorithmStore` tracks UCB progress and stores only UCB pulls in `investmentsUCB` to keep data isolated.

## The UCB Approach

UCB balances exploration and exploitation via an optimistic estimate for each arm (i):

[
\mathrm{UCB}_i(t)=\hat\mu_i+c_i(t)
]

The confidence bonus ( c_i(t) ) depends on the reward model:

* **Bernoulli (bounded [0,1])**
  [
  c_i(t)=\sqrt{\frac{2\ln t}{n_i}}
  ]
* **Gaussian (known variance (\sigma^2))**
  [
  c_i(t)=\sqrt{\frac{2\sigma^2\ln t}{n_i}}
  ]

### Parameters

* (\hat\mu_i): empirical mean reward of arm (i)
* (n_i): number of pulls for arm (i)
* (t): total number of UCB pulls so far
* (\sigma): standard deviation of Gaussian rewards, fixed at **0.15**

The algorithm always selects the arm with the largest UCB value.

### Key Advantages

* Built in exploration through a confidence bonus that adapts to the variance of rewards
* Deterministic and easy to debug
* Logarithmic regret under standard assumptions

## Functions

### `upperConfidenceBound_bernoulli(): void`

Runs UCB on Bernoulli bandits.

#### Dependencies for Bernoulli

* Requires `banditStore.selectedStocks` with `bernoulli_param: number`
* Writes results to `algorithmStore.investmentsUCB`

### `upperConfidenceBound_gaussian(): void`

Runs UCB on Gaussian bandits.

#### Dependencies for Gaussian

* Requires `banditStore.selectedStocks` with `gaussian_param: number`
* Writes results to `algorithmStore.investmentsUCB`

### `ucb(bandit: 'bernoulli' | 'gaussian'): void`

Shared core runner for both variants.

#### Algorithm Flow

1. Set `algorithmsInProgress = true`
2. **Initialization:**
   Pull each arm once if the budget allows. If the total budget `T` is smaller than the number of arms `K`, the run ends after initialization.
3. **Main loop:**
   While `totalUcbPulls() < T`:

   * Set `t = totalUcbPulls()`
   * For each arm:

     * Compute `n_i` as the count of UCB pulls for that arm
     * Compute `mean_i` as the average of `ucbReturn` values
     * Compute `score_i` using the model dependent formula:

       ```ts
       if (bandit === "gaussian") {
         score_i = mean_i + Math.sqrt((2 * SIGMA * SIGMA * Math.log(t)) / n_i);
       } else {
         score_i = mean_i + Math.sqrt((2 * Math.log(t)) / n_i);
       }
       ```
   * Select the arm with the highest score
   * Draw a reward and store the result in `investmentsUCB`
4. Set `algorithmsInProgress = false`

## Statistical Implementation

### Gaussian Specifics

The Gaussian UCB uses a known standard deviation of **σ = 0.15**, consistent with the reward generator:

```ts
const SIGMA = 0.15;
const ucbValue = (mean: number, n: number, t: number) =>
  mean + Math.sqrt((2 * SIGMA * SIGMA * Math.log(t)) / n);
```

This ensures the exploration term scales with the expected reward variance.

### Reward Functions

**Bernoulli:**

```ts
const reward = bernoulli(chosen_arm.bernoulli_param) ? 1 : 0;
```

**Gaussian:**

```ts
const reward = gaussian(chosen_arm.gaussian_param);
```

Gaussian rewards are real-valued with mean between -0.1 and 0.1 and standard deviation 0.15.
This setup allows modeling continuous returns while keeping the variance moderate.

## Data Management

### Store Integration

#### `useBanditStore`

* `selectedStocks`: fixed list of stocks during the run
* `possibleInvestments`: total pull budget `T`

#### `useAlgorithmStore`

* `algorithmsInProgress`: UI state flag
* `investmentsUCB`: array holding UCB results only

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

Only `ucbReturn` is used here to ensure isolated UCB statistics.

## Helper Functions

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

These helpers compute per arm statistics directly from the UCB dataset.

## Usage Example

```ts
import {
  upperConfidenceBound_bernoulli,
  upperConfidenceBound_gaussian
} from '@/algorithms/UpperConfidenceBound';

banditStore.selectedStocks = [
  { name: 'AAPL', bernoulli_param: 0.7, gaussian_param: 0.05 },
  { name: 'GOOG', bernoulli_param: 0.5, gaussian_param: -0.02 }
];
banditStore.possibleInvestments = 1000;

upperConfidenceBound_gaussian();
// or
upperConfidenceBound_bernoulli();

console.log(algorithmStore.investmentsUCB);
```

## Complexity

* Each iteration filters `investmentsUCB` per arm to compute statistics.
* For large `T`, maintaining local arrays for counts and sums can reduce overhead.

## Limitations

1. **Bounded reward assumption:**
   UCB1 theory assumes rewards in [0,1]. The Gaussian variant approximates this via the variance-scaled bonus.
2. **Fixed variance:**
   The Gaussian implementation assumes a known and constant σ = 0.15.
3. **Determinism:**
   The policy has no randomness beyond reward draws, making it stable and reproducible.
4. **Performance:**
   Filtering per arm on every iteration is simple but not optimal for very large runs.

## Summary

* `UpperConfidenceBound.ts` implements UCB for Bernoulli and Gaussian bandits.
* Gaussian variant adjusts the exploration term using the known variance σ².
* Results are stored exclusively in `investmentsUCB` for clean separation and analysis.
* The approach is deterministic, transparent, and compatible with the Pinia store pattern in Vue.
