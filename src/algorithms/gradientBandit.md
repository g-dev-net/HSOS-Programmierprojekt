# Gradient Bandit Algorithm Technical Documentation

## Overview

The `gradientBandit.ts` module implements the Gradient Bandit Algorithm for Multi-Armed Bandit (MAB) problems, supporting both Bernoulli and Gaussian bandit types. This TypeScript implementation uses a Vue.js store-based architecture with Pinia for state management and implements policy gradient methods for action selection.

## Architecture

The implementation leverages two main Pinia stores:
- **`useBanditStore`**: Manages selected stocks, investment parameters, and overall bandit configuration
- **`useAlgorithmStore`**: Handles Gradient Bandit results and progress tracking

## Testing

The tests for this module are located in `/src/tests/gradientBandit.test.js`. They validate the policy gradient implementation, softmax action selection, preference updates, and mathematical correctness using real store instances.

## The Gradient Bandit Approach

The Gradient Bandit algorithm uses a policy gradient method that maintains numerical preferences for each action and selects actions according to a soft-max distribution:

1. **Preference Initialization**: Each arm starts with preference H(a) = 0 (uniform policy)
2. **Softmax Action Selection**: π(a) = exp(H(a)) / Σexp(H(k)) for action probabilities
3. **Preference Updates**: H(a) ← H(a) + α(R - R̄)(1[a=At] - π(a))
4. **Average Reward Tracking**: Maintains running average R̄ as baseline

### Key Advantages:
- **Natural Exploration**: Softmax ensures all actions have non-zero probability
- **Preference Learning**: Learns action preferences rather than value estimates
- **Baseline Adaptation**: Average reward baseline reduces variance
- **Theoretical Foundation**: Proven convergence to optimal policy

## Functions

### `gradientBandit_bernoulli(): void`

Executes Gradient Bandit with Bernoulli bandits using policy gradient updates.

**Dependencies:**
- Requires `banditStore.selectedStocks` with `bernoulli_param: number`
- Updates `algorithmStore.investmentsGradient: AlgoInvestment[]`
- Uses `alpha = 0.1` learning rate for preference updates

**Policy Implementation:**
- **Initialization**: Uniform policy with H(a) = 0 for all arms
- **Action Selection**: Softmax distribution based on preferences
- **Reward Processing**: Boolean results converted to 0/1 for gradient updates

### `gradientBandit_gaussian(): void`

Executes Gradient Bandit with Gaussian bandits using policy gradient updates.

**Dependencies:**
- Requires `banditStore.selectedStocks` with `gaussian_param: number`
- Updates `algorithmStore.investmentsGradient: AlgoInvestment[]`
- Uses `alpha = 0.1` learning rate for preference updates

**Policy Implementation:**
- **Initialization**: Uniform policy with H(a) = 0 for all arms
- **Action Selection**: Softmax distribution based on preferences
- **Reward Processing**: Continuous values used directly in gradient updates

### `gradientBandit(bandit: 'bernoulli' | 'gaussian'): void`

Core implementation of the Gradient Bandit algorithm with policy gradient methods.

**Algorithm Flow:**
1. **Uniform Policy Initialization**: Initialize each stock with `gradientReturn: 0`
2. **Preference Array Setup**: Initialize H = [0, 0, ..., 0] for uniform start
3. **Average Reward Initialization**: Set avgReward = 0
4. Set `algorithmsInProgress: true`
5. For each investment round:
   - **Softmax Calculation**: Compute π(a) = exp(H(a)) / Σexp(H(k))
   - **Action Selection**: Sample from softmax distribution using cumulative probabilities
   - **Reward Calculation**: Execute bandit function and store result in `reward` variable
   - **Average Reward Update**: R̄ ← R̄ + (R - R̄)/(t+1)
   - **Preference Updates**: H(a) ← H(a) + α(R - R̄)(1[a=At] - π(a))
   - **Investment Storage**: Push complete result to store
6. Set `algorithmsInProgress: false`

## Mathematical Implementation

### Softmax Action Selection

```typescript
const expH = H.map(h => Math.exp(h));
const sumExpH = expH.reduce((a, b) => a + b, 0);
const probs = expH.map(v => v / sumExpH);
```

- **Exponential**: exp(H(a)) for numerical stability
- **Normalization**: Σexp(H(k)) ensures valid probabilities
- **Distribution**: π(a) = exp(H(a)) / Σexp(H(k))

### Cumulative Probability Sampling

```typescript
let r = Math.random();
let cumulativeProb = 0;
for (let i = 0; i < probs.length; i++) {
    cumulativeProb += probs[i];
    if (r < cumulativeProb) {
        chosen_arm_index = i;
        break;
    }
}
```

- **Inverse Transform Sampling**: Maps uniform random to action probabilities
- **Cumulative Distribution**: Progressive probability accumulation
- **Action Selection**: First action where random value falls below cumulative probability

### Average Reward Update

```typescript
avgReward += (reward - avgReward) / (t + 1);
```

- **Incremental Average**: R̄t = R̄t-1 + (Rt - R̄t-1)/t
- **Baseline Function**: Reduces variance in gradient estimates
- **Running Mean**: Efficient online computation without storing all rewards

### Preference Updates

```typescript
for (let i = 0; i < H.length; i++) {
    if (i === chosen_arm_index) {
        H[i] += alpha * (reward - avgReward) * (1 - probs[i]);
    } else {
        H[i] -= alpha * (reward - avgReward) * probs[i];
    }
}
```

- **Policy Gradient**: ∇H(a) = α(R - R̄)(1[a=At] - π(a))
- **Selected Action**: H(At) increases when reward > baseline
- **Non-selected Actions**: H(a) decreases when reward > baseline
- **Learning Rate**: α = 0.1 controls update magnitude

## Data Management

### Store Integration

#### `useBanditStore`
- **`selectedStocks`**: Array of `selectedStock` objects with bandit parameters
- **`possibleInvestments`**: Number of investment rounds

#### `useAlgorithmStore`  
- **`investmentsGradient`**: Array of `AlgoInvestment` objects with Gradient results
- **`algorithmsInProgress`**: Boolean execution flag

### Data Types

```typescript
interface AlgoInvestment {
    stock: selectedStock;
    greedyReturn: number | null;
    thompsonReturn: number | null;
    ucbReturn: number | null;
    gradientReturn: number | null;
    optimisticInitialReturn: number | null;
    userAlgorithmReturn: number | null;
}
```

## Key Implementation Details

### Uniform Policy Initialization

```typescript
stock.forEach(stock => {
    algorithmStore.investmentsGradient.push({
        stock: stock,
        greedyReturn: null,
        thompsonReturn: null,
        ucbReturn: null,
        gradientReturn: 0,  // Initial uniform policy
        optimisticInitialReturn: null,
        userAlgorithmReturn: null
    });
});

let H: number[] = new Array(stock.length).fill(0);  // Preference array
```

### Switch-Case Reward Calculation

```typescript
const chosen_arm = stock[chosen_arm_index];
let reward = 0;
switch (bandit) {
    case 'bernoulli':
        reward = bernoulli(chosen_arm.bernoulli_param) ? 1 : 0;
        break;
    case 'gaussian':
        reward = gaussian(chosen_arm.gaussian_param);
        break;
}
```

## Usage Example

```typescript
import { gradientBandit_bernoulli, gradientBandit_gaussian } from '@/algorithms/gradientBandit';

// Configure stores
banditStore.selectedStocks = [
  { stock: {...}, bernoulli_param: 0.7, gaussian_param: 0.5 }
];
banditStore.possibleInvestments = 1000;

// Run Gradient Bandit
gradientBandit_bernoulli();   // Policy gradient with Bernoulli bandits
gradientBandit_gaussian();    // Policy gradient with Gaussian bandits

// Access policy gradient results (includes uniform init + actual investments)
console.log(algorithmStore.investmentsGradient);
```

## Dependencies

- **Pinia stores**: `useBanditStore` and `useAlgorithmStore` for type-safe state management
- **Bandit functions**: `bernoulli(param: number): boolean` and `gaussian(param: number): number`
- **Vue.js reactivity**: For automatic UI updates and data binding
- **TypeScript types**: `selectedStock`, `AlgoInvestment` interfaces for type safety

## Algorithm Parameters

- **Learning Rate (α)**: 0.1 - Controls preference update magnitude
- **Baseline**: Average reward R̄ - Reduces gradient variance
- **Initialization**: H(a) = 0 for uniform starting policy

## Limitations

1. **Fixed Learning Rate**: α = 0.1 may not be optimal for all scenarios
2. **Average Reward Baseline**: Simple baseline may not be optimal for non-stationary environments
3. **Softmax Computation**: May have numerical issues for very large preference values
4. **Store Dependencies**: Requires properly initialized Pinia stores
5. **No Preference Bounds**: H(a) values can grow arbitrarily large
