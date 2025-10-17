# Upper Confidence Bound Algorithm Technical Documentation

## Overview

The module `UpperConfidenceBound.ts` implements the **UCB1 strategy** for multi-armed bandit problems with **Bernoulli** and **Gaussian** reward models.
The implementation follows a **Vue architecture** using **Pinia stores** and logs UCB-specific results in a dedicated array.
For Gaussian rewards, a fixed standard deviation
`SIGMA = 0.15`
is used to scale the confidence bonus.

## Architecture

Two Pinia stores are used:

* `useBanditStore` manages the fixed set of selected stocks for a run and the total pull budget.
* `useAlgorithmStore` tracks UCB progress and stores only UCB pulls in `investmentsUCB` to keep data isolated.

## The UCB Approach

UCB balances **exploration** and **exploitation** through an optimistic estimate for each arm *i*.

Definitions:

* `n_i`: number of UCB pulls for arm *i*
* `mean_i`: empirical mean reward of arm *i*, computed only from UCB pulls
* `t`: total number of UCB pulls so far

**Bernoulli arms:**

```math
UCB_i(t) = \bar{x}_i + \sqrt{\frac{2 \ln t}{n_i}}
```

**Gaussian arms with fixed variance:**

```math
UCB_i(t) = \bar{x}_i + \sqrt{\frac{2 \cdot \sigma^2 \ln t}{n_i}}, \quad \sigma = 0.15
```

The algorithm selects the arm with the highest $UCB_i(t)$.

### Key Advantages

* Built-in exploration via a confidence bonus that shrinks with the number of pulls
* Deterministic policy (no random sampling)
* Logarithmic regret bounds under standard assumptions for bounded or sub-Gaussian rewards

## Functions

### `upperConfidenceBound_bernoulli(): void`

Executes UCB for Bernoulli bandits.

#### Dependencies for Bernoulli

* Expects `banditStore.selectedStocks` with `bernoulli_param: number`
* Writes results to `algorithmStore.investmentsUCB`

### `upperConfidenceBound_gaussian(): void`

Executes UCB for Gaussian bandits.

#### Dependencies for Gaussian

* Expects `banditStore.selectedStocks` with `gaussian_param: number | object`
* Writes results to `algorithmStore.investmentsUCB`

### `ucb(bandit: 'bernoulli' | 'gaussian'): void`

Shared runner for both wrappers.

#### Algorithm Flow

1. Set `algorithmsInProgress = true`
2. **Initialization:** pull each arm exactly once, while budget allows
   If the total budget `T` is smaller than the number of arms `K`, the run ends after initialization
3. **Main loop:** while `totalUcbPulls() < T`

   * Set `t = totalUcbPulls()`, with `t ≥ K ≥ 1`

   * For each arm:

     * Compute `n_i` = number of entries in `investmentsUCB` for this arm

     * Compute `mean_i` = average of `ucbReturn` for this arm

     * **Bernoulli score:**

       ```math
       score_i = \bar{x}_i + \sqrt{\frac{2 \ln t}{n_i}}
       ```

     * **Gaussian score:**

       ```math
       score_i = \bar{x}_i + \sqrt{\frac{2 \cdot \sigma^2 \ln t}{n_i}}, \quad \sigma = 0.15
       ```

   * Select the arm with the highest score and sample a reward from the respective bandit model

   * Append the result to `investmentsUCB`
4. Set `algorithmsInProgress = false`

## Statistical Implementation

### Score Computation

```ts
const SIGMA = 0.15;

const ucbValue = (mean: number, n: number, t: number, bandit: 'bernoulli' | 'gaussian') =>
  bandit === 'gaussian'
    ? mean + Math.sqrt((2 * SIGMA * SIGMA * Math.log(t)) / n)
    : mean + Math.sqrt((2 * Math.log(t)) / n);
```

* `mean`: empirical average of rewards for that arm
* The square root term is the optimism bonus that decreases with `n` and grows slowly with `t`
* For Gaussian arms, the bonus is scaled by the fixed variance `SIGMA²`

### Bernoulli Reward

```ts
const reward = bernoulli(chosen_arm.bernoulli_param) ? 1 : 0;
```

Returns 0 or 1 and satisfies the bounded reward assumption of UCB1.

### Gaussian Reward

```ts
const reward = gaussian(chosen_arm.gaussian_param);
```

Returns a real-valued reward.
The fixed variance scaling works well for sub-Gaussian cases; for high-variance arms, normalization or a variance-sensitive UCB variant is recommended.

## Data Management

### Store Integration

#### `useBanditStore`

* `selectedStocks`: fixed list of stocks for the entire run
* `possibleInvestments`: total number of allowed pulls `T`

#### `useAlgorithmStore`

* `algorithmsInProgress`: Boolean flag for UI feedback
* `investmentsUCB`: array containing UCB-specific investment entries

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

Only `ucbReturn` is populated for UCB.
This separation ensures that statistics are computed solely from UCB data.

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

These helpers compute per-arm counts and means from the dedicated UCB array and return the global pull counter.

## Usage Example

```ts
import {
  upperConfidenceBound_bernoulli,
  upperConfidenceBound_gaussian
} from '@/algorithms/UpperConfidenceBound';

banditStore.selectedStocks = [
  { bernoulli_param: 0.7, gaussian_param: { mean: 0.1 } },
  { bernoulli_param: 0.5, gaussian_param: { mean: 0.05 } }
];
banditStore.possibleInvestments = 1000;

upperConfidenceBound_bernoulli();
// or
upperConfidenceBound_gaussian();

console.log(algorithmStore.investmentsUCB);
```

## Complexity

* Each iteration filters `investmentsUCB` per arm to compute `n_i` and `mean_i`
* For very large `T`, maintain `count[i]` and `sum[i]` locally and update them incrementally after each pull
  This avoids repeated filtering and keeps per-step complexity linear in the number of arms

## Limitations

1. UCB with fixed variance scaling assumes bounded or sub-Gaussian rewards
2. The policy is deterministic, simplifying debugging
3. Current implementation recomputes statistics from history; incremental updates would improve performance for large runs

## Summary

* `UpperConfidenceBound.ts` implements a **UCB1 strategy** for a fixed stock set and a fixed budget
* Each arm is pulled once initially, then the arm with the highest optimistic estimate is repeatedly selected
* Results are stored exclusively in `investmentsUCB`, isolating UCB data from other algorithms and simplifying analysis
