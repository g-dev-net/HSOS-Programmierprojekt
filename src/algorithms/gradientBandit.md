# Gradient Bandit Algorithm Technical Documentation

## Overview

This module implements the **Gradient Bandit** for multi armed bandits with **Bernoulli** and **Gaussian** reward models.
The implementation follows a **Vue architecture** with **Pinia stores**. Results from gradient runs are stored in a dedicated array or aggregated in Compare mode.
Preferences `H[i]` are converted to selection probabilities via a **softmax policy**. A running **baseline** estimator `avgReward` reduces the variance of gradient updates. The learning rate comes from `setParamAlgo('gradient')` and is used as `alpha`.

## Architecture

Several stores and helpers are used:

* `useBanditStore` manages the fixed set of selected stocks and the total pull budget.
* `useAlgorithmStore` tracks progress, controls Compare mode, and stores gradient pulls in `investmentsGradient`.
* `setParamAlgo('gradient')` returns the learning rate `alpha`.
* `addGradientResult` writes per step comparison values to the Compare storage.

## The Gradient Bandit Approach

The gradient bandit learns preferences `H[i]` for each arm and selects probabilistically according to softmax.

Definitions:

* `H[i]`: preference value of arm `i`
* `p_i`: selection probability of arm `i`
* `R_t`: observed reward at step `t`
* `\bar{R}_t`: running average of the reward through step `t` used as a baseline
* `alpha`: learning rate

**Softmax policy:**

```math
p_i = \frac{e^{H_i}}{\sum_{j=1}^K e^{H_j}}
```

**Baseline update:**

```math
\bar{R}_t = \bar{R}_{t-1} + \frac{R_t - \bar{R}_{t-1}}{t}
```

**Gradient updates:**

For the chosen arm `a`:

```math
H_a \leftarrow H_a + \alpha \cdot (R_t - \bar{R}_t) \cdot (1 - p_a)
```

For all `i \neq a`:

```math
H_i \leftarrow H_i - \alpha \cdot (R_t - \bar{R}_t) \cdot p_i
```

### Key Advantages

* Stochastic selection proportional to learned preference
* Baseline reduces variance and stabilizes learning
* No explicit exploration parameter required because exploration arises from the softmax policy

## Functions

### `gradientBandit_bernoulli(): void`

Wrapper that runs the gradient bandit for Bernoulli bandits.

#### Dependencies for Bernoulli

* Expects `banditStore.selectedStocks` with field `bernoulli_param: number`
* Writes results to `algorithmStore.investmentsGradient` or to the Compare storage

### `gradientBandit_gaussian(): void`

Wrapper that runs the gradient bandit for Gaussian bandits.

#### Dependencies for Gaussian

* Expects `banditStore.selectedStocks` with field `gaussian_param: number | object`
* Writes results to `algorithmStore.investmentsGradient` or to the Compare storage

### `gradientBandit(bandit: 'bernoulli' | 'gaussian'): void`

Unified runner for both wrappers.

#### Algorithm Flow

1. Load `alpha = setParamAlgo('gradient')`
2. Initialize preferences uniformly: `H[i] = 0` for all arms and set `avgReward = 0`
3. Set `algorithmsInProgress = true`
4. For `t = 0` to `< banditStore.possibleInvestments`:

   * Compute `p_i` via softmax from `H`
   * Sample an arm according to `p`
   * Obtain reward:

     * Bernoulli: `reward = bernoulli(param) ? 1 : 0`
     * Gaussian: `reward = gaussian(param)`
   * Update `avgReward` incrementally
   * Apply gradient update to all `H[i]` using the baseline
   * Write result:

     * Standard mode: push into `algorithmStore.investmentsGradient`
     * Compare mode: call `addGradientResult(alpha, compareReward)`
       Use `compareReward = reward` or if `optimalActions === true` use `compareReward = chosen_arm.stock.id`
5. Set `algorithmsInProgress = false`

## Statistical Implementation

### Softmax policy and sampling

```ts
const expH = H.map(h => Math.exp(h));
const sumExpH = expH.reduce((a, b) => a + b, 0);
const probs = expH.map(v => v / sumExpH);

// Categorical draw
let r = Math.random();
let cumulativeProb = 0;
let chosen_arm_index = 0;
for (let i = 0; i < probs.length; i++) {
  cumulativeProb += probs[i];
  if (r < cumulativeProb) {
    chosen_arm_index = i;
    break;
  }
}
```

* `probs[i]` is the selection probability of arm `i`
* Sampling is proportional to `probs`

### Baseline and gradient update

```ts
avgReward += (reward - avgReward) / (t + 1);

for (let i = 0; i < H.length; i++) {
  if (i === chosen_arm_index) {
    H[i] += alpha! * (reward - avgReward) * (1 - probs[i]);
  } else {
    H[i] -= alpha! * (reward - avgReward) * probs[i];
  }
}
```

* `avgReward` acts as a baseline and reduces variance
* Updates match the policy gradient with softmax parameterization

### Reward models

```ts
// Bernoulli
const reward = bernoulli(chosen_arm.bernoulli_param) ? 1 : 0;

// Gaussian
const reward = gaussian(chosen_arm.gaussian_param);
```

* Bernoulli returns 0 or 1
* Gaussian returns real valued rewards

## Data Management

### Store Integration

#### `useBanditStore`

* `selectedStocks`: fixed stock list for the entire run
* `possibleInvestments`: total number of allowed pulls

#### `useAlgorithmStore`

* `algorithmsInProgress`: boolean flag for UI feedback
* `investmentsGradient`: array with gradient specific entries
* `algorithmsCompare`: controls Compare mode
* `optimalActions`: optional switch to use `stock.id` as the comparison metric

#### Compare mode

* No temporary investment array is needed because only the comparison value is logged
* `addGradientResult(alpha, compareReward)` is called each step

### Investment entry shape

```ts
{
  stock: chosen_arm,
  greedyReturn: null,
  eGreedyReturn: null,
  thompsonReturn: null,
  ucbReturn: null,
  gradientReturn: reward,
  optimisticInitialReturn: null,
  userAlgorithmReturn: null
}
```

Only `gradientReturn` is populated. This separation ensures that statistics are computed solely from gradient data.

## Key Helpers

Core patterns in the code:

```ts
// Softmax probabilities
const expH = H.map(h => Math.exp(h));
const probs = expH.map(v => v / expH.reduce((a, b) => a + b, 0));

// Baseline
avgReward += (reward - avgReward) / (t + 1);

// Policy gradient update
H[i] += (i === chosen_arm_index)
  ? alpha! * (reward - avgReward) * (1 - probs[i])
  : -alpha! * (reward - avgReward) * probs[i];
```

These building blocks define the selection policy and the preference updates.

## Usage Example

```ts
import {
  gradientBandit_bernoulli,
  gradientBandit_gaussian
} from '@/algorithms/GradientBandit';

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

// Configure learning rate
setParamAlgo('gradient'); // provides alpha internally to the algorithm

// Standard runs
gradientBandit_bernoulli();
// or
gradientBandit_gaussian();

// Compare mode
algorithmStore.algorithmsCompare = true;
algorithmStore.optimalActions = false; // or true to log stock.id as comparison value
gradientBandit_bernoulli();

console.log(algorithmStore.investmentsGradient);
```

## Complexity

* Per time step compute softmax probabilities and perform a categorical sample
* The updates over all arms are `O(K)` per step which yields `O(T · K)` overall
* Optimization: maintain `sumExpH` and update it incrementally when numerically safe. For large `K` a Gumbel Max trick can simplify sampling

## Limitations

1. Sensitivity to `alpha`. Values that are too large destabilize learning. Values that are too small slow it down.
2. Softmax can become numerically unstable for large `|H|`. Stabilize by subtracting `max(H)`.
3. The baseline is a simple average. An exponentially weighted baseline can react faster under nonstationary rewards.
4. In Compare mode the evaluation can switch to `stock.id` when `optimalActions === true`. This requires a consistent stock structure.

## Summary

* The module implements the **Gradient Bandit** with a softmax policy and baseline aided policy gradient updates.
* Bernoulli and Gaussian rewards are supported.
* Results are stored in `investmentsGradient`. In Compare mode additional comparison values are logged via `addGradientResult`.
* The learning rate `alpha` is provided by `setParamAlgo('gradient')` and controls the update size.
