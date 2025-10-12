# Thompson Sampling Algorithm Technical Documentation

## Overview

The `thompsonSampling.ts` module implements **Thompson Sampling** (Bayesian approach) for Multi-Armed Bandits, supporting Bernoulli and Gaussian bandits. Uses Pinia stores for state management and **jStat** for statistical sampling.

**Stores:** `useBanditStore` (stocks/parameters), `useAlgorithmStore` (results/progress)  
**Tests:** `/src/tests/thompsonSampling.test.js` (22 tests validating Bayesian inference)

## The Thompson Sampling Approach

**Bayesian Strategy:** Maintains probability distributions for each arm's expected reward.

**Algorithm:**
1. **Prior**: Uninformative prior for each arm (Beta(1,1) or Normal(0,1))
2. **Sample**: Draw sample from each arm's posterior distribution
3. **Select**: Choose arm with highest sampled value
4. **Update**: Update posterior with observed reward (conjugate priors)

**Advantages:** Optimal exploration-exploitation balance, uncertainty quantification, theoretical guarantees  
**Key Feature:** Natural exploration through posterior uncertainty

## Core Implementation

### Bayesian Models

**Bernoulli (Beta-Bernoulli conjugate):**
- Prior: Beta(1,1)
- Posterior: Beta(successes + 1, failures + 1)
- Sampling: `jStat.beta.sample(α, β)`

**Gaussian (Normal-Normal conjugate):**
- Prior: Normal(0, 1)
- Posterior: Normal(sample_mean, sample_variance)
- Sampling: `jStat.normal.sample(μ, σ)`

### Algorithm Flow

```typescript
for (t = 0; t < possibleInvestments; t++) {
    // 1. Sample from each arm's posterior
    for (each arm) {
        arm_investments = filter history for this arm
        sampledValue = sample from posterior
    }
    // 2. Select arm with highest sample
    best_arm = argmax(sampledValues)
    // 3. Execute and update
    reward = bandit(best_arm)
    store investment
}
```

## Statistical Details

### Bernoulli Posterior Update

```typescript
const successes = arm_investments.filter(inv => inv.thompsonReturn === 1).length;
const failures = arm_investments.filter(inv => inv.thompsonReturn === 0).length;
sampledValue = jStat.beta.sample(successes + 1, failures + 1);
```

### Gaussian Posterior Update

```typescript
const returns = arm_investments.map(inv => inv.thompsonReturn!);
const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1);
sampledValue = jStat.normal.sample(mean, Math.sqrt(variance));
```

**Fallbacks:** variance = 1 for single sample, mean = 0 for empty history

## Store Integration

**Updates:** `algorithmStore.investmentsThompson`  
**Structure:** Each investment stores `thompsonReturn` with other algorithm fields set to `null`

## Usage Example

```typescript
import { thompsonSampling_bernoulli, thompsonSampling_gaussian } from '@/algorithms/thompsonSampling';

banditStore.selectedStocks = [{ stock: {...}, bernoulli_param: 0.7, gaussian_param: 0.05 }];
banditStore.possibleInvestments = 100;

thompsonSampling_bernoulli();   // Beta-Bernoulli model
thompsonSampling_gaussian();    // Normal-Normal model

console.log(algorithmStore.investmentsThompson);
```

## Dependencies

- **jStat**: Beta/Normal sampling (`jStat.beta.sample`, `jStat.normal.sample`)
- **Pinia**: Store management
- **Bandits**: `bernoulli(p)`, `gaussian(σ)`

## Limitations

1. Requires jStat library for statistical functions
2. Limited to conjugate prior models (Beta-Bernoulli, Normal-Normal)
3. Higher computational cost than simple algorithms
