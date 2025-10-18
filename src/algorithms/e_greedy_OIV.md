# Greedy, ε-Greedy, and Optimistic Initial Values Technical Documentation

## Overview

This module implements **Greedy**, **ε-Greedy**, and **Optimistic Initial Values (OIV)** for multi-armed bandits with **Bernoulli** and **Gaussian** reward models.
The implementation follows a **Vue architecture** with **Pinia stores**. Results are captured per algorithm in dedicated arrays or, in Compare mode, via aggregators.
Hyperparameters are configured through `setParamAlgo`. For `eGreedy` this is `ε`. For `OIV` this is the optimistic start value.

## Architecture

Several stores and helpers are used:

* `useBanditStore` manages the fixed set of selected stocks and the total pull budget.
* `useAlgorithmStore` tracks progress, controls Compare mode, and stores results in

  * `investmentsGreedy`
  * `investmentsEGreedy`
  * `investmentsOptimisticInitial`
* `setParamAlgo(algorithm)` returns the hyperparameter

  * `eGreedy` returns `ε`
  * `OIV` returns the optimistic start value
* `addGreedyResult`, `addEGreedyResult`, `addOIVResult` write comparison values in Compare mode.

## The Greedy Family Approach

All three variants choose the arm with the highest observed average in each step. Differences:

* **Greedy** deterministically selects the arm with the highest empirical mean.
* **ε-Greedy** selects a random arm with probability `ε`, otherwise greedy.
* **Optimistic Initial Values** initializes unplayed arms with an optimistic start value `v0`. This encourages early exploration.

Definitions:

* `r_{i,1}, …, r_{i,n_i}` are the past rewards of arm `i`.
* Empirical mean

```math
\bar{r}_i =
\begin{cases}
\frac{1}{n_i} \sum_{k=1}^{n_i} r_{i,k}, & n_i > 0 \\
0, & n_i = 0 \text{ and Greedy or ε-Greedy} \\
v_0, & n_i = 0 \text{ and OIV}
\end{cases}
```

### Key Advantages

* Simple and fast baselines
* ε-Greedy enables controlled exploration via `ε`
* OIV promotes initial exploration without an additional randomness component

## Functions

### `greedy_bernoulli(): void`

Wrapper that runs Greedy for Bernoulli bandits.

#### Prerequisites: Greedy Bernoulli

* Expects `banditStore.selectedStocks` with field `bernoulli_param: number`
* Writes results to `investmentsGreedy` or temporarily in Compare mode

### `greedy_gaussian(): void`

Wrapper that runs Greedy for Gaussian bandits.

#### Prerequisites: Greedy Gaussian

* Expects `banditStore.selectedStocks` with field `gaussian_param: number | object`
* Writes results to `investmentsGreedy` or temporarily in Compare mode

### `eGreedy_bernoulli(): void`

Wrapper that runs ε-Greedy for Bernoulli bandits.

#### Prerequisites: eGreedy Bernoulli

* Expects `banditStore.selectedStocks` with field `bernoulli_param: number`
* Uses `ε = setParamAlgo('eGreedy')`
* Writes results to `investmentsEGreedy` or temporarily in Compare mode

### `eGreedy_gaussian(): void`

Wrapper that runs ε-Greedy for Gaussian bandits.

#### Prerequisites: eGreedy Gaussian

* Expects `banditStore.selectedStocks` with field `gaussian_param: number | object`
* Uses `ε = setParamAlgo('eGreedy')`
* Writes results to `investmentsEGreedy` or temporarily in Compare mode

### `OIV_bernoulli(): void`

Wrapper that runs OIV for Bernoulli bandits.

#### Prerequisites: OIV Bernoulli

* Expects `banditStore.selectedStocks` with field `bernoulli_param: number`
* Uses `v0 = setParamAlgo('OIV')`
* Writes results to `investmentsOptimisticInitial` or temporarily in Compare mode

### `OIV_gaussian(): void`

Wrapper that runs OIV for Gaussian bandits.

#### Prerequisites: OIV Gaussian

* Expects `banditStore.selectedStocks` with field `gaussian_param: number | object`
* Uses `v0 = setParamAlgo('OIV')`
* Writes results to `investmentsOptimisticInitial` or temporarily in Compare mode

### `xGreedy(bandit: 'bernoulli' | 'gaussian', algorithm: 'greedy' | 'eGreedy' | 'OIV'): void`

Unified runner for all three variants.

#### Algorithm Flow

1. Load hyperparameter

   * `param = 0` for Greedy
   * `param = setParamAlgo('eGreedy')` for ε-Greedy
   * `param = setParamAlgo('OIV')` for OIV
2. Set `algorithmsInProgress = true`
3. For `t = 0` to `< banditStore.possibleInvestments`:

   * **Arm selection**

     * ε-Greedy: with probability `ε = param` select a random arm, otherwise greedy
     * Greedy or OIV: compute the average of the appropriate returns per arm

       * Greedy: mean of `greedyReturn`, or 0 if no history
       * ε-Greedy: mean of `eGreedyReturn`, or 0 if no history
       * OIV: `v0 = param` if no history, otherwise mean of `optimisticInitialReturn`
     * Choose the arm with the highest average
   * **Draw reward**

     * Bernoulli: `reward = bernoulli(chosen_arm.bernoulli_param) ? 1 : 0`
     * Gaussian: `reward = gaussian(chosen_arm.gaussian_param)`
   * **Persist**

     * Standard mode: write to the respective store array
     * Compare mode: write to `tempInvestments` and call the matching aggregator

       * Greedy: `addGreedyResult('default', compareReward)`
       * ε-Greedy: `addEGreedyResult(param, compareReward)`
       * OIV: `addOIVResult(param, compareReward)`
       * If `optimalActions === true`: `compareReward = chosen_arm.stock.id`, otherwise `compareReward = reward`
4. Set `algorithmsInProgress = false`

## Statistical Implementation

### Averaging per variant

Greedy

```ts
const items = isCompareMode
  ? tempInvestments.filter(inv => inv.stock === stock[i])
  : algorithmStore.investmentsGreedy.filter(inv => inv.stock === stock[i]);

const avg = items.length > 0
  ? items.reduce((acc, inv) => acc + (inv.greedyReturn || 0), 0) / items.length
  : 0;
```

ε-Greedy

```ts
const items = isCompareMode
  ? tempInvestments.filter(inv => inv.stock === stock[i])
  : algorithmStore.investmentsEGreedy.filter(inv => inv.stock === stock[i]);

const avg = items.length > 0
  ? items.reduce((acc, inv) => acc + (inv.eGreedyReturn || 0), 0) / items.length
  : 0;
```

OIV

```ts
const items = isCompareMode
  ? tempInvestments.filter(inv => inv.stock === stock[i])
  : algorithmStore.investmentsOptimisticInitial.filter(inv => inv.stock === stock[i]);

const avg = items.length === 0
  ? param
  : items.reduce((acc, inv) => acc + (inv.optimisticInitialReturn || 0), 0) / items.length;
```

### Reward models

```ts
// Bernoulli
const reward = bernoulli(chosen_arm.bernoulli_param) ? 1 : 0;

// Gaussian
const reward = gaussian(chosen_arm.gaussian_param);
```

## Data Management

### Store Integration

#### `useBanditStore`

* `selectedStocks`: fixed stock list for the entire run
* `possibleInvestments`: total number of allowed pulls

#### `useAlgorithmStore`

* `algorithmsInProgress`: boolean flag for UI feedback
* Result arrays per algorithm

  * `investmentsGreedy`
  * `investmentsEGreedy`
  * `investmentsOptimisticInitial`
* `algorithmsCompare`: controls Compare mode
* `optimalActions`: optional switch to use `stock.id` as the comparison metric

#### Compare mode

* In-memory history in `tempInvestments`
* Call the matching `add...Result` each step
* Pass `param` to the Compare storage for ε-Greedy and OIV

### Investment entry shape

```ts
{
  stock: chosen_arm,
  greedyReturn: number | null,
  eGreedyReturn: number | null,
  thompsonReturn: null,
  ucbReturn: null,
  gradientReturn: null,
  optimisticInitialReturn: number | null,
  userAlgorithmReturn: null
}
```

Only the field that matches the algorithm is populated. This separation ensures that per-algorithm statistics are computed correctly.

## Key Helpers

Typical pattern for selecting the best stock

```ts
let bestIndex = 0;
let bestValue = -Infinity;
for (let i = 0; i < stock.length; i++) {
  // compute avg_result based on the algorithm
  if (avg_result > bestValue) {
    bestValue = avg_result;
    bestIndex = i;
  }
}
```

Random arm selection for ε-Greedy

```ts
if (algorithm === 'eGreedy' && Math.random() < param) {
  best_arm_index = Math.floor(Math.random() * stock.length);
}
```

## Usage Example

```ts
import {
  greedy_bernoulli,
  eGreedy_bernoulli,
  OIV_bernoulli,
  greedy_gaussian,
  eGreedy_gaussian,
  OIV_gaussian
} from '@/algorithms/GreedyFamily';

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

// Set hyperparameters
setParamAlgo('eGreedy'); // returns ε
setParamAlgo('OIV');     // returns v0

// Runs
eGreedy_bernoulli();
OIV_gaussian();
greedy_gaussian();

// Compare mode
algorithmStore.algorithmsCompare = true;
algorithmStore.optimalActions = false; // or true to log stock.id as comparison value
eGreedy_gaussian();

console.log(algorithmStore.investmentsEGreedy);
```

## Complexity

* Each step computes per arm averages and selects an arm. Naive complexity is `O(T · K)`.
* Optimization: maintain per arm `count` and `sum` and update incrementally. This removes history filters.

## Limitations

1. Greedy can get stuck on suboptimal arms if early randomness is unfavorable.
2. The choice of `ε` in ε-Greedy is critical. Too small reduces exploration, too large hurts asymptotic performance.
3. OIV depends strongly on the start value `v0`. Too large causes excessive early exploration, too small behaves like Greedy.
4. Repeated filtering over histories is inefficient for very large runs. Incremental statistics are preferable.
5. In Compare mode a mapping to `chosen_arm.stock.id` can occur when `optimalActions === true`. This requires a consistent stock structure.

## Summary

* The module implements **Greedy**, **ε-Greedy**, and **Optimistic Initial Values** for Bernoulli and Gaussian bandits.
* Selection uses empirical means. ε-Greedy adds random exploration. OIV enforces early exploration through optimistic initialization.
* Results are stored in the respective store arrays. In Compare mode additional comparison values are logged.
* For high performance keep per arm counters and sums incrementally.
