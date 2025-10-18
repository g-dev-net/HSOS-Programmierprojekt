# Upper Confidence Bound Algorithm Technical Documentation

## Overview

This module implements the **UCB1 strategy** for multi armed bandits with **Bernoulli** and **Gaussian** reward models.
The implementation follows a **Vue architecture** with **Pinia stores**. Results from UCB runs are kept exclusively in a UCB specific array.
For Gaussian rewards a fixed standard deviation is used
`SIGMA = 0.15`
and a configurable constant `UCB_C = setParamAlgo('ucb')` scales the confidence bonus.

## Architecture

Several stores and helpers are used:

* `useBanditStore` manages the fixed set of selected stocks for a run and the total pull budget.
* `useAlgorithmStore` tracks UCB execution progress, controls Compare mode, and stores UCB pulls in `investmentsUCB`.
* `addUCBResult` writes per step comparison values to the Compare storage.
* `setParamAlgo('ucb')` provides the UCB constant `UCB_C` used to scale the bonus.

## The UCB Approach

UCB balances **exploration** and **exploitation** via an optimistic estimator for each arm *i*.

Definitions:

* `n_i`: number of UCB pulls for arm *i*
* `mean_i`: empirical mean reward of arm *i* based on UCB pulls
* `t`: total number of UCB pulls so far
* `UCB_C`: positive constant that scales the bonus
* `SIGMA = 0.15`: fixed standard deviation for Gaussian rewards

**Bernoulli arms:**

```math
UCB_i(t) = \bar{x}_i + \sqrt{\frac{UCB\_C \cdot \ln t}{n_i}}
```

**Gaussian arms with fixed variance:**

```math
UCB_i(t) = \bar{x}_i + \sqrt{\frac{UCB\_C \cdot \sigma^2 \cdot \ln t}{n_i}}, \quad \sigma = 0.15
```

The algorithm selects the arm with the largest ( UCB_i(t) ).

### Key Advantages

* Built in exploration through a confidence bonus that shrinks with increasing `n_i`
* Deterministic selection rule
* Logarithmic regret bounds under standard assumptions for bounded or sub Gaussian rewards

## Functions

### `upperConfidenceBound_bernoulli(): void`

Wrapper that runs UCB for Bernoulli bandits.

#### Dependencies for Bernoulli

* Expects `banditStore.selectedStocks` with field `bernoulli_param: number`
* Writes results to `algorithmStore.investmentsUCB` or to a temporary array in Compare mode

### `upperConfidenceBound_gaussian(): void`

Wrapper that runs UCB for Gaussian bandits.

#### Dependencies for Gaussian

* Expects `banditStore.selectedStocks` with field `gaussian_param: number | object`
* Uses `SIGMA = 0.15` and `UCB_C` to scale the bonus
* Writes results to `algorithmStore.investmentsUCB` or to a temporary array in Compare mode

### `ucb(bandit: 'bernoulli' | 'gaussian'): void`

Unified runner for both wrappers.

#### Algorithm Flow

1. Set `algorithmsInProgress = true`.

2. **Initialization:** pull each arm exactly once while budget allows.
   If the total budget `T` is smaller than the number of arms `K`, the run ends after initialization.

3. **Main loop:** while `totalUcbPulls() < T`

   * Set `t = totalUcbPulls()`, with `t ≥ K ≥ 1`.

   * For each arm:

     * Compute `n_i` as the number of entries in the UCB history for this arm.

     * Compute `mean_i` as the average of this arm’s `ucbReturn` values.

     * **Bernoulli score:**

       ```math
       score_i = \bar{x}_i + \sqrt{\frac{UCB\_C \cdot \ln t}{n_i}}
       ```

     * **Gaussian score:**

       ```math
       score_i = \bar{x}_i + \sqrt{\frac{UCB\_C \cdot \sigma^2 \cdot \ln t}{n_i}}
       ```

   * Select the arm with the highest score and draw a reward from the corresponding bandit model.

   * Append the result to the UCB history.

   * In Compare mode also call `addUCBResult(UCB_C, compareReward)` where

     * `compareReward = reward`, or
     * if `algorithmStore.optimalActions === true`, then `compareReward = chosen.stock.id`.

4. Set `algorithmsInProgress = false`.

## Statistical Implementation

### Score computation

```ts
const SIGMA = 0.15;
const UCB_C = setParamAlgo('ucb');

const ucbValue = (mean: number, n: number, t: number, bandit: 'bernoulli' | 'gaussian') =>
  bandit === 'gaussian'
    ? mean + Math.sqrt((UCB_C * SIGMA * SIGMA * Math.log(t)) / n)
    : mean + Math.sqrt((UCB_C * Math.log(t)) / n);
```

* `mean`: empirical average reward of the arm
* The square root term is the optimism bonus that decreases with `n` and grows slowly with `t`
* For Gaussian arms the bonus is scaled by the fixed variance `SIGMA²`
* `UCB_C` allows fine tuning of exploration strength

### Bernoulli reward

```ts
const reward = bernoulli(chosen_arm.bernoulli_param) ? 1 : 0;
```

Returns 0 or 1 and satisfies the UCB1 bounded reward assumption.

### Gaussian reward

```ts
const reward = gaussian(chosen_arm.gaussian_param);
```

Returns real valued rewards.
The fixed variance scaling suits sub Gaussian cases. For highly variable arms consider normalization or variance sensitive UCB variants.

## Data Management

### Store Integration

#### `useBanditStore`

* `selectedStocks`: fixed stock list for the entire run
* `possibleInvestments`: total number of allowed pulls `T`

#### `useAlgorithmStore`

* `algorithmsInProgress`: boolean flag for UI feedback
* `investmentsUCB`: array with UCB specific investment entries
* `algorithmsCompare`: controls Compare mode with a temporary UCB history
* `optimalActions`: if enabled, Compare mode can evaluate optimal actions instead of rewards

#### Compare mode

* When `algorithmsCompare === true` the algorithm uses a local `tempInvestments` array during runtime
* Additionally `addUCBResult(UCB_C, compareReward)` is called each step

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

Only `ucbReturn` is populated. This separation ensures that statistics are computed solely from UCB data.

## Key Helpers

```ts
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

const totalUcbPulls = () =>
  isCompareMode ? tempInvestments.length : algorithmStore.investmentsUCB.length;
```

These helpers compute per arm pull counts and means from the UCB history and provide the global pull counter.

## Usage Example

```ts
import {
  upperConfidenceBound_bernoulli,
  upperConfidenceBound_gaussian
} from '@/algorithms/UpperConfidenceBound';

import { useBanditStore } from '@/stores/bandit';
import { useAlgorithmStore } from '@/stores/algorithms';
import { setParamAlgo } from '@/stores/parameter_algos';

const banditStore = useBanditStore();
const algorithmStore = useAlgorithmStore();

banditStore.selectedStocks = [
  { id: 1, bernoulli_param: 0.7, gaussian_param: { mean: 0.1 } },
  { id: 2, bernoulli_param: 0.5, gaussian_param: { mean: 0.05 } }
];

banditStore.possibleInvestments = 1000;

// optional tuning
setParamAlgo('ucb'); // provides UCB_C internally to the algorithm

// Standard run
upperConfidenceBound_bernoulli();
// or
upperConfidenceBound_gaussian();

// Compare mode
algorithmStore.algorithmsCompare = true;
algorithmStore.optimalActions = false; // or true to log stock.id as comparison value
upperConfidenceBound_bernoulli();

console.log(algorithmStore.investmentsUCB);
```

## Complexity

* Per iteration the code computes `n_i` and `mean_i` via filter and reduce for each arm
* For very large `T` maintain local arrays `count[i]` and `sum[i]` and update them incrementally after each pull
  This removes repeated filtering and keeps the per step complexity linear in the number of arms

## Limitations

1. UCB with a fixed variance assumption relies on bounded or sub Gaussian rewards.
2. The deterministic policy simplifies debugging but may not break ties when scores are identical.
3. Statistics are currently recomputed from history. Incremental updates would be more efficient.
4. In Compare mode evaluation can switch to `chosen.stock.id` when `optimalActions === true`. This requires a consistent stock structure.

## Summary

* The module implements a **UCB1 strategy** for a fixed stock set and a fixed budget.
* Each arm is pulled once for initialization, then the arm with the highest optimistic estimate is selected.
* `UCB_C` scales exploration strength. `SIGMA` scales the Gaussian bonus.
* Results are stored exclusively in a UCB history and in Compare mode also logged via `addUCBResult`.
