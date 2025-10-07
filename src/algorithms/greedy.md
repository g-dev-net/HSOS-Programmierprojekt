# Greedy Algorithm Technical Documentation

## Overview

The `greedy.ts` module implements both standard Greedy and Epsilon-Greedy Algorithms for Multi-Armed Bandit (MAB) problems, supporting both Bernoulli and Gaussian bandit types. This TypeScript implementation uses a Vue.js store-based architecture with Pinia for state management.

## Architecture

The implementation leverages two main Pinia stores:
- **`useBanditStore`**: Manages selected stocks, investment parameters, and overall bandit configuration
- **`useAlgorithmStore`**: Handles algorithm-specific data, progress tracking, and investment results

## Testing

The tests for this module are located in `/src/tests/greedy.test.js`. They validate both the standard greedy and epsilon-greedy implementations by testing store interactions and algorithm behavior without mocks.

## The Greedy Approaches

### Standard Greedy ("Cold Start")

The algorithm starts without prior information and always selects the arm with the highest current performance:

1. **Cold-Start Initialization**: All arms initialized with `greedyReturn: 0`
2. **Pure Exploitation**: Always selects the arm with highest `greedyReturn`
3. **Performance Tracking**: Updates arm performance after each selection

**Advantages**: Simple, immediate exploitation of best-performing arms
**Disadvantages**: May get stuck with suboptimal arms, no exploration

### Epsilon-Greedy

Adds exploration to the standard greedy approach:

1. **Exploration**: With probability ε (0.1), select random arm
2. **Exploitation**: With probability 1-ε (0.9), select best arm
3. **Balance**: Prevents getting stuck while maintaining good performance

**Advantages**: Avoids premature convergence, balanced exploration/exploitation
**Disadvantages**: Fixed exploration rate may be inefficient

## Functions

### `greedy_bernoulli(): void` / `eGreedy_bernoulli(): void`

Execute greedy algorithms with Bernoulli bandits.

**Dependencies:**
- Requires `banditStore.selectedStocks` with `bernoulli_param: number`
- Updates `algorithmStore.investmentsGreedy: AlgoInvestment[]`

**Behavior:**
- Cold-start initialization for all stocks
- Boolean results converted to 0/1 for comparison
- Sets `thompsonReturn: null` in all results

### `greedy_gaussian(): void` / `eGreedy_gaussian(): void`

Execute greedy algorithms with Gaussian bandits.

**Dependencies:**
- Requires `banditStore.selectedStocks` with `gaussian_param: number`
- Updates `algorithmStore.investmentsGreedy: AlgoInvestment[]`

**Behavior:**
- Cold-start initialization for all stocks
- Numeric results stored directly as `greedyReturn`
- Sets `thompsonReturn: null` in all results

### `xGreedy(bandit: 'bernoulli' | 'gaussian', epsilon: boolean): void`

Core implementation handling both bandit types and exploration strategies.

**Algorithm Flow:**
1. **Cold-Start Initialization**: Initialize each stock with `greedyReturn: 0`
2. Set `algorithmsInProgress: true`
3. For each investment round:
   - **Exploration/Exploitation Decision**: Random selection if `epsilon && Math.random() < 0.1`
   - **Best Arm Selection**: Choose arm with highest `greedyReturn` using `findIndex()`
   - **Reward Calculation**: Execute bandit function and store result in `reward` variable
   - **Investment Storage**: Push complete result to store
4. Set `algorithmsInProgress: false`

## Key Implementation Details

### Cold-Start Initialization

```typescript
stock.forEach(stock => {
    algorithmStore.investmentsGreedy.push({
        stock: stock,
        greedyReturn: 0,
        thompsonReturn: null,
        ucbReturn: null,
        gradientReturn: null,
        optimisticInitialReturn: null,
        userAlgorithmReturn: null
    });
});
```

### Epsilon-Greedy Selection

```typescript
if (epsilon && Math.random() < val_epsilon) {
    best_arm_index = Math.floor(Math.random() * stock.length); // Exploration
} else {
    // Exploitation: Find best arm using findIndex()
    for (let i = 0; i < algorithmStore.investmentsGreedy.length; i++) {
        if (current_value > best_arm_value) {
            best_arm_index = stock.findIndex(s => s === algorithmStore.investmentsGreedy[i].stock);
        }
    }
}
```

### Switch-Case Implementation

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

algorithmStore.investmentsGreedy.push({
    stock: chosen_arm,
    greedyReturn: reward,
    thompsonReturn: null,
    // ... all other algorithm returns set to null
});
```

## Data Management

### Store Integration

#### `useBanditStore`
- **`selectedStocks`**: Array of `selectedStock` objects containing stock information and bandit parameters
- **`possibleInvestments`**: Number defining how many investment rounds to execute

#### `useAlgorithmStore`
- **`investmentsGreedy`**: Array of `AlgoInvestment` objects storing algorithm results
- **`algorithmsInProgress`**: Boolean flag indicating algorithm execution status

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

## Usage Example

```typescript
import { greedy_bernoulli, eGreedy_bernoulli, greedy_gaussian, eGreedy_gaussian } from '@/algorithms/greedy';

// Configure stores
banditStore.selectedStocks = [
  { stock: {...}, bernoulli_param: 0.7, gaussian_param: 0.5 }
];
banditStore.possibleInvestments = 1000;

// Run algorithms
greedy_bernoulli();          // Standard greedy with Bernoulli bandits
eGreedy_bernoulli();         // Epsilon-greedy with Bernoulli bandits
greedy_gaussian();           // Standard greedy with Gaussian bandits
eGreedy_gaussian();          // Epsilon-greedy with Gaussian bandits

// Access results (includes cold-start + actual investments)
console.log(algorithmStore.investmentsGreedy);
```

## Dependencies

- **Pinia stores**: `useBanditStore` and `useAlgorithmStore` for type-safe state management
- **Bandit functions**: `bernoulli(param: number): boolean` and `gaussian(param: number): number`
- **Vue.js reactivity**: For automatic UI updates and data binding
- **TypeScript types**: `selectedStock`, `AlgoInvestment` interfaces for type safety

## Limitations

1. **Cold Start Problem**: Early decisions may be suboptimal due to limited data
2. **Fixed Epsilon**: 0.1 exploration rate may not be optimal for all scenarios
3. **No Learning Rate**: Simple averaging without sophisticated learning mechanisms
4. **Store Dependencies**: Requires properly initialized stores with valid stock configurations