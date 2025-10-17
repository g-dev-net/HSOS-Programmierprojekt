# Gradient Bandit Algorithm Technical Documentation

## Overview

The `gradientBandit.ts` module implements **Gradient Bandit** (policy gradient method) for Multi-Armed Bandits using **softmax action selection** and preference learning. Supports Bernoulli and Gaussian bandits with Pinia state management.

**Stores:** `useBanditStore` (stocks/parameters), `useAlgorithmStore` (results/progress)  
**Tests:** `/src/tests/gradientBandit.test.js` (34 tests validating softmax, preference updates, mathematical correctness)

## The Gradient Bandit Approach

**Policy Gradient Method:** Learns numerical preferences H(a) for each arm and selects via softmax distribution.

**Algorithm:**
1. **Initialize**: H(a) = 0 for all arms (uniform policy)
2. **Softmax**: π(a) = exp(H(a)) / Σexp(H(k))
3. **Select**: Sample action from π(a) using cumulative probabilities
4. **Update**: H(a) ← H(a) + α(R - R̄)(1[a=At] - π(a))
5. **Baseline**: R̄ ← R̄ + (R - R̄)/(t+1)

**Parameters:** α = 0.1 (learning rate)  
**Advantages:** Natural exploration via softmax, baseline reduces variance, proven convergence

## Core Implementation

### Algorithm Flow

```typescript
// Initialize
let H = [0, 0, ..., 0];  // Preferences
let avgReward = 0;        // Baseline

for (t = 0; t < possibleInvestments; t++) {
    // 1. Softmax: π(a) = exp(H(a)) / Σexp(H(k))
    probs = softmax(H);
    
    // 2. Sample action using cumulative probabilities
    chosen_arm = sample(probs);
    
    // 3. Execute and observe reward
    reward = bandit(chosen_arm);
    
    // 4. Update baseline: R̄ ← R̄ + (R - R̄)/(t+1)
    avgReward += (reward - avgReward) / (t + 1);
    
    // 5. Update preferences: H(a) ← H(a) + α(R - R̄)(1[a=At] - π(a))
    for (each arm a) {
        if (a == chosen_arm)
            H[a] += α * (reward - avgReward) * (1 - probs[a]);
        else
            H[a] -= α * (reward - avgReward) * probs[a];
    }
}
```

## Mathematical Details

### Softmax Calculation

```typescript
const expH = H.map(h => Math.exp(h));
const probs = expH.map(v => v / expH.reduce((a, b) => a + b, 0));
// π(a) = exp(H(a)) / Σexp(H(k))
```

### Cumulative Probability Sampling

```typescript
let r = Math.random(), cumulativeProb = 0;
for (let i = 0; i < probs.length; i++) {
    cumulativeProb += probs[i];
    if (r < cumulativeProb) { chosen_arm_index = i; break; }
}
```

### Preference Update Formula

```typescript
// Selected action:
H[chosen] += α * (R - R̄) * (1 - π(chosen));

// Other actions:
H[other] -= α * (R - R̄) * π(other);

// Where: R̄ ← R̄ + (R - R̄)/(t+1)
```

**Policy Gradient:** ∇H(a) = α(R - R̄)(1[a=At] - π(a))  
**Learning Rate:** α = 0.1

## Store Integration

**Initialization:** Each stock gets `gradientReturn: 0` (uniform policy)  
**Updates:** `algorithmStore.investmentsGradient` stores rewards with other fields `null`

## Usage Example

```typescript
import { gradientBandit_bernoulli, gradientBandit_gaussian } from '@/algorithms/gradientBandit';

banditStore.selectedStocks = [{ stock: {...}, bernoulli_param: 0.7, gaussian_param: 0.05 }];
banditStore.possibleInvestments = 100;

gradientBandit_bernoulli();   // Policy gradient
gradientBandit_gaussian();    // Policy gradient

console.log(algorithmStore.investmentsGradient);
```

## Dependencies

- **Pinia**: Store management
- **Bandits**: `bernoulli(p)`, `gaussian(σ)`
- **Vue.js**: Reactivity

## Parameters & Limitations

**Parameters:**
- Learning rate α = 0.1
- Baseline: Average reward R̄
- Initialization: H(a) = 0 (uniform)

**Limitations:**
1. Fixed learning rate may not be optimal
2. Simple baseline for stationary environments only
3. No bounds on preference values H(a)
