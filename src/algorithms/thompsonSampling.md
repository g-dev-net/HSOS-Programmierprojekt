# Thompson Sampling Algorithm Technical Documentation

## Overview

The `thompsonSampling.ts` module implements Thompson Sampling for Multi-Armed Bandit (MAB) problems, supporting both Bernoulli and Gaussian bandit types. This TypeScript implementation uses a Vue.js store-based architecture with Pinia for state management and integrates jStat for statistical sampling functions.

## Architecture

The implementation leverages two main Pinia stores:
- **`useBanditStore`**: Manages selected stocks, investment parameters, and overall bandit configuration
- **`useAlgorithmStore`**: Handles Thompson Sampling results and progress tracking

## Testing

The tests for this module are located in `/src/tests/thompsonSampling.test.js`. They validate the Bayesian inference implementation, jStat integration, and statistical correctness using real store instances and statistical functions.

## The Thompson Sampling Approach

Thompson Sampling is a Bayesian approach to the multi-armed bandit problem that maintains probability distributions over the expected rewards of each arm:

1. **Prior Initialization**: Each arm starts with an uninformative prior distribution
2. **Posterior Updates**: After each pull, the arm's distribution is updated based on the observed reward
3. **Sampling & Selection**: In each round, sample from each arm's distribution and select the arm with the highest sample
4. **Bayesian Learning**: The algorithm naturally balances exploration and exploitation through uncertainty

### Key Advantages:
- **Optimal Exploration**: Automatically balances exploration vs exploitation
- **Uncertainty Quantification**: Maintains full posterior distributions
- **Theoretical Guarantees**: Proven regret bounds and convergence properties

## Functions

### `thompsonSampling_bernoulli(): void`

Executes Thompson Sampling with Bernoulli bandits using Beta-Bernoulli conjugate priors.

**Dependencies:**
- Requires `banditStore.selectedStocks` with `bernoulli_param: number`
- Updates `algorithmStore.investmentsThompson: AlgoInvestment[]`
- Uses `jStat.beta.sample(alpha, beta)` for sampling

**Bayesian Implementation:**
- **Prior**: Beta(1,1) uninformative prior for each arm
- **Likelihood**: Bernoulli distribution based on stock parameters
- **Posterior**: Beta(successes + 1, failures + 1)
- **Sampling**: Sample from Beta distribution for arm selection

### `thompsonSampling_gaussian(): void`

Executes Thompson Sampling with Gaussian bandits using Normal-Normal conjugate priors.

**Dependencies:**
- Requires `banditStore.selectedStocks` with `gaussian_param: number`
- Updates `algorithmStore.investmentsThompson: AlgoInvestment[]`
- Uses `jStat.normal.sample(mean, stddev)` for sampling

**Bayesian Implementation:**
- **Prior**: Normal(0, 1) uninformative prior for each arm
- **Likelihood**: Gaussian distribution based on stock parameters
- **Posterior**: Normal(sample_mean, sample_variance)
- **Sampling**: Sample from Normal distribution for arm selection

### `thompsonSampling(bandit: 'bernoulli' | 'gaussian'): void`

Core implementation handling both bandit types with Bayesian inference.

**Algorithm Flow:**
1. Set `algorithmsInProgress` to true
2. For each investment round:
   - **Filter History**: Get arm-specific investment history using `filter(inv => inv.stock === stock[i])`
   - **Bayesian Update**: Calculate posterior parameters based on historical data
   - **Statistical Sampling**: Sample from posterior distributions using jStat
   - **Arm Selection**: Choose arm with highest sampled value
   - **Reward Calculation**: Execute bandit function and store result in `reward` variable
   - **Investment Storage**: Push complete result to store
3. Set `algorithmsInProgress` to false

## Statistical Implementation

### Switch-Case Reward Calculation

```typescript
const chosen_arm = stock[best_arm_index];
let reward = 0;
switch (bandit) {
    case 'bernoulli':
        reward = bernoulli(chosen_arm.bernoulli_param) ? 1 : 0;
        break;
    case 'gaussian':
        reward = gaussian(chosen_arm.gaussian_param);
        break;
}

algorithmStore.investmentsThompson.push({
    stock: chosen_arm,
    greedyReturn: null,
    thompsonReturn: reward,
    // ... all other algorithm returns set to null
});
```

### Bernoulli Case (Beta-Bernoulli)

```typescript
const successes = arm_investments.filter(inv => inv.thompsonReturn === 1).length;
const failures = arm_investments.filter(inv => inv.thompsonReturn === 0).length;
const alpha = successes + 1; // Beta prior parameter
const beta = failures + 1;   // Beta prior parameter
sampledValue = jStat.beta.sample(alpha, beta);
```

- **Uninformative Prior**: Beta(1,1) = Uniform(0,1)
- **Posterior Update**: Beta(α + successes, β + failures)
- **Sampling**: jStat.beta.sample() for Thompson sampling

### Gaussian Case (Normal-Normal)

```typescript
const returns = arm_investments.map(inv => inv.thompsonReturn!);
const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1);
sampledValue = jStat.normal.sample(mean, Math.sqrt(variance));
```

- **Sample Statistics**: Empirical mean and variance from historical data
- **Posterior**: Normal(sample_mean, sample_variance)
- **Fallback**: variance = 1 for single samples, mean = 0 for empty history

## Data Management

### Store Integration

#### `useBanditStore`
- **`selectedStocks`**: Array of `selectedStock` objects with bandit parameters
- **`possibleInvestments`**: Number of investment rounds

#### `useAlgorithmStore`  
- **`investmentsThompson`**: Array of `AlgoInvestment` objects with Thompson results
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

## Dependencies

- **jStat Library**: Statistical functions for Beta and Normal sampling
- **Pinia Stores**: Reactive state management
- **Bandit Functions**: `bernoulli(param)` and `gaussian(param)` for reward generation
- **TypeScript Types**: Type safety for statistical operations

## Key Features

1. **Bayesian Inference**: Proper posterior updates with conjugate priors
2. **jStat Integration**: Professional statistical sampling functions
3. **Uninformative Priors**: Beta(1,1) and Normal(0,1) for unbiased initialization
4. **Store-Based Architecture**: Reactive UI updates and centralized state
5. **Type Safety**: Full TypeScript support for statistical operations

## Usage Example

```typescript
import { thompsonSampling_bernoulli, thompsonSampling_gaussian } from '@/algorithms/thompsonSampling';

// Configure stores
banditStore.selectedStocks = [
  { stock: {...}, bernoulli_param: 0.7, gaussian_param: 0.5 }
];
banditStore.possibleInvestments = 1000;

// Run Thompson Sampling
thompsonSampling_bernoulli();   // Bayesian Bernoulli bandits
thompsonSampling_gaussian();    // Bayesian Gaussian bandits

// Access Bayesian results
console.log(algorithmStore.investmentsThompson);
```

## Limitations

1. **Conjugate Priors**: Limited to Beta-Bernoulli and Normal-Normal models
2. **jStat Dependency**: Requires external statistical library
3. **Store Dependencies**: Needs properly initialized Pinia stores
4. **Computational Cost**: Higher overhead than simple greedy algorithms
