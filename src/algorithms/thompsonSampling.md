# Thompson Sampling Algorithm Technical Documentation

## Overview

This module implements **Thompson Sampling** for multi armed bandits with **Bernoulli** and **Gaussian** reward models.
The implementation follows a **Vue architecture** with **Pinia stores**. Results from Thompson runs are stored in a dedicated array.
For Bernoulli arms the sampler draws from a **Beta distribution**. For Gaussian arms it uses **jStat** to sample from a **normal distribution** with empirically estimated parameters.

## Architecture

Several stores and helpers are used:

* `useBanditStore` manages the fixed set of selected stocks and the total pull budget.
* `useAlgorithmStore` tracks progress, controls Compare mode, and stores Thompson pulls in `investmentsThompson`.
* `addThompsonResult` writes per step comparison values to the Compare storage.
* `jStat` provides the samplers `beta.sample` and `normal.sample`.

## The Thompson Sampling Approach

Thompson Sampling balances **exploration** and **exploitation** by stochastically drawing a parametric sample per arm and selecting the arm with the largest sample.

Definitions for arm *i*:

* `history_i`: list of previous Thompson outcomes for arm *i*
* `t`: global time step or number of pulls so far

**Bernoulli arms:**
The posterior is Beta with parameters `alpha = successes + 1` and `beta = failures + 1`.

```math
\theta_i \sim \mathrm{Beta}(\alpha_i, \beta_i),\quad \alpha_i = s_i + 1,\ \beta_i = f_i + 1
```

**Gaussian arms:**
We do not use the exact conjugate posterior. Instead we estimate mean and variance from past rewards and sample from that normal model.

```math
\mu_i = \frac{1}{n_i} \sum_{r \in history_i} r,\quad
s^2_i = \begin{cases}
1, & n_i \le 1 \\
\frac{1}{n_i - 1}\sum_{r \in history_i}(r - \mu_i)^2, & n_i > 1
\end{cases}
```

Sampling:

```math
\theta_i \sim \mathcal{N}(\mu_i,\ s_i)
```

The algorithm selects in each step the arm with the largest sampled value `θ_i`.

### Key Advantages

* Stochastic exploration proportional to uncertainty
* Simple Beta posterior for Bernoulli arms
* Strong practical performance with minimal tuning

## Functions

### `thompsonSampling_bernoulli(): void`

Wrapper that runs Thompson Sampling for Bernoulli bandits.

#### Dependencies for Bernoulli

* Expects `banditStore.selectedStocks` with field `bernoulli_param: number`
* Writes results to `algorithmStore.investmentsThompson` or to a temporary array in Compare mode

### `thompsonSampling_gaussian(): void`

Wrapper that runs Thompson Sampling for Gaussian bandits.

#### Dependencies for Gaussian

* Expects `banditStore.selectedStocks` with field `gaussian_param: number | object`
* Estimates `mean` and `variance` from past returns
* Uses `jStat.normal.sample(mean, std)`

### `thompsonSampling(bandit: 'bernoulli' | 'gaussian'): void`

Unified runner for both wrappers.

#### Algorithm Flow

1. Set `algorithmsInProgress = true`
2. For `t = 0` to `< banditStore.possibleInvestments`:

   * For each arm `i`:

     * Retrieve past investments `arm_investments` for arm `i` from `investmentsThompson` or from `tempInvestments` in Compare mode
     * **Bernoulli:**

       * `successes = count(thompsonReturn === 1)`
       * `failures = count(thompsonReturn === 0)`
       * `alpha = successes + 1`, `beta = failures + 1`
       * `sampledValue_i = jStat.beta.sample(alpha, beta)`
     * **Gaussian:**

       * `returns = thompsonReturn` values of this arm
       * `mean = average(returns)`, if empty then `0`
       * `variance = sampleVariance(returns)`, if fewer than 2 observations then `1`
       * `sampledValue_i = jStat.normal.sample(mean, sqrt(variance))`
   * Choose the arm with the highest `sampledValue`
   * Draw a reward:

     * **Bernoulli:** `reward = bernoulli(chosen.bernoulli_param) ? 1 : 0`
     * **Gaussian:** `reward = gaussian(chosen.gaussian_param)`
   * Write the result:

     * **Standard mode:** push into `algorithmStore.investmentsThompson`
     * **Compare mode:** push into `tempInvestments` and call
       `addThompsonResult('default', compareReward)` where
       `compareReward = reward` or, if `optimalActions === true`,
       `compareReward = chosen.stock.id`
3. Set `algorithmsInProgress = false`

## Statistical Implementation

### Bernoulli posterior and sampling

```ts
const successes = arm_investments.filter(inv => inv.thompsonReturn === 1).length;
const failures  = arm_investments.filter(inv => inv.thompsonReturn === 0).length;

const alpha = successes + 1; // uninformative initialization
const beta  = failures + 1;

const sampledValue = jStat.beta.sample(alpha, beta);
```

* The Beta posterior is conjugate to the Bernoulli likelihood
* The `+1` pseudocounts stabilize early steps

### Gaussian parameter estimation and sampling

```ts
const returns = arm_investments.map(inv => inv.thompsonReturn!);
const mean = returns.length > 0
  ? returns.reduce((a, b) => a + b, 0) / returns.length
  : 0;

const variance = returns.length > 1
  ? returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1)
  : 1;

const sampledValue = jStat.normal.sample(mean, Math.sqrt(variance));
```

* An empirical normal model is used
* For `n ≤ 1` we set `variance = 1` to enable sensible sampling
* For a strictly Bayesian approach a Normal Inverse Gamma prior would be recommended

## Data Management

### Store Integration

#### `useBanditStore`

* `selectedStocks`: fixed stock list for the entire run
* `possibleInvestments`: total number of allowed pulls

#### `useAlgorithmStore`

* `algorithmsInProgress`: boolean flag for UI feedback
* `investmentsThompson`: array with Thompson specific investment entries
* `algorithmsCompare`: controls Compare mode with a temporary history
* `optimalActions`: if enabled the Compare metric can switch to `stock.id`

#### Compare mode

* When `algorithmsCompare === true` the algorithm uses a local `tempInvestments` array
* Additionally `addThompsonResult('default', compareReward)` is called each step

### Investment entry shape

```ts
{
  stock: chosen_arm,
  greedyReturn: null,
  eGreedyReturn: null,
  thompsonReturn: reward,
  ucbReturn: null,
  gradientReturn: null,
  optimisticInitialReturn: null,
  userAlgorithmReturn: null
}
```

Only `thompsonReturn` is populated. This separation ensures that statistics are computed solely from Thompson data.

## Key Helpers

The following patterns are used per arm:

```ts
const arm_investments = isCompareMode
  ? tempInvestments.filter(inv => inv.stock === stock[i])
  : algorithmStore.investmentsThompson.filter(inv => inv.stock === stock[i]);

// Bernoulli posterior parameters
const successes = arm_investments.filter(inv => inv.thompsonReturn === 1).length;
const failures  = arm_investments.filter(inv => inv.thompsonReturn === 0).length;

// Gaussian estimators
const returns = arm_investments.map(inv => inv.thompsonReturn!);
```

These helpers provide the required per arm statistics for sampling and selection.

## Usage Example

```ts
import {
  thompsonSampling_bernoulli,
  thompsonSampling_gaussian
} from '@/algorithms/ThompsonSampling';

import { useBanditStore } from '@/stores/bandit';
import { useAlgorithmStore } from '@/stores/algorithms';

const banditStore = useBanditStore();
const algorithmStore = useAlgorithmStore();

banditStore.selectedStocks = [
  { id: 1, bernoulli_param: 0.7, gaussian_param: { mean: 0.1 } },
  { id: 2, bernoulli_param: 0.5, gaussian_param: { mean: 0.05 } }
];

banditStore.possibleInvestments = 1000;

// Standard run
thompsonSampling_bernoulli();
// or
thompsonSampling_gaussian();

// Compare mode
algorithmStore.algorithmsCompare = true;
algorithmStore.optimalActions = false; // or true to log stock.id as comparison value
thompsonSampling_bernoulli();

console.log(algorithmStore.investmentsThompson);
```

## Complexity

* Per time step the code computes filters and statistics per arm
* Total cost over `T` steps is typically `O(T · K)` with naive filtering
* Optimization: maintain per arm `count`, `successes`, `sum`, and `sumSquares` and update incrementally after each pull. This yields `O(K)` work per step without filtering the full history

## Limitations

1. The Gaussian variant uses an empirical normal model rather than a conjugate posterior. Under strong heteroscedasticity or very sparse arms sampling can be suboptimal.
2. For `n ≤ 1` the algorithm uses `variance = 1`. This is conservative and can affect early decisions.
3. Repeated filtering over history is inefficient for very large runs. Incremental statistics are preferable.
4. In Compare mode the metric can switch to `chosen_arm.stock.id` when `optimalActions === true`. This requires a consistent stock structure.

## Summary

* The module implements **Thompson Sampling** for Bernoulli and Gaussian bandits.
* Bernoulli uses a Beta posterior with pseudocounts. Gaussian samples from a normal distribution with empirically estimated parameters.
* Results are stored in `investmentsThompson`. In Compare mode `addThompsonResult` is populated in addition.
* For high performance you should maintain incremental statistics.
