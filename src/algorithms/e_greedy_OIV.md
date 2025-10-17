# Greedy, Epsilon-Greedy & OIV Algorithm Technical Documentation

## Overview

The `e_greedy_OIV.ts` module implements three exploration strategies for Multi-Armed Bandit problems: **Greedy** (pure exploitation), **Epsilon-Greedy** (ε-exploration), and **Optimistic Initial Values** (OIV). All strategies support both Bernoulli and Gaussian bandits using Pinia stores for state management.

## Architecture

**Stores:**
- **`useBanditStore`**: Selected stocks and investment parameters
- **`useAlgorithmStore`**: Algorithm results and progress tracking

**Tests:** Located in `/src/tests/e_greedy_OIV.test.js` (20 tests validating core functionality)

## The Three Algorithms

### 1. Greedy (Pure Exploitation)

**Strategy:** Always select the arm with highest average reward  
**Cold-Start:** Untried arms initialized with `avg = 0`, comparison starts at `-Infinity`  

**Behavior:**
- All untried arms get equal chance (avg = 0)
- After first trial, arm with highest average is selected
- Works correctly with negative rewards (Gaussian)
- No exploration after initial selection
- Fast convergence but may miss better arms

**Advantages:** Simple, immediate exploitation  
**Disadvantages:** Premature convergence, no exploration

### 2. Epsilon-Greedy (ε = 0.1)

**Strategy:** Exploration with probability ε, exploitation otherwise  

**Behavior:**
- 10% random arm selection (exploration)
- 90% best arm selection (exploitation)
- Balances exploration and exploitation

**Advantages:** Avoids getting stuck, consistent exploration  
**Disadvantages:** Fixed exploration rate may be inefficient

### 3. Optimistic Initial Values (OIV)

**Strategy:** Initialize all arms with optimistic value (5), encouraging early exploration  
**Formula:** First trial: `avg = optimistic_value`, afterwards: `avg = sum_of_rewards / count`

**Behavior:**
- All arms start with high expected value (5)
- Reality check lowers estimates after trials
- Automatic exploration in early phase
- Exploitation after exploration phase

**Advantages:** No extra parameters, front-loaded exploration  
**Disadvantages:** Only explores initially, parameter-sensitive

## Core Implementation

### xGreedy Function

**Signature:** `xGreedy(bandit: 'bernoulli' | 'gaussian', algorithm: 'greedy' | 'eGreedy' | 'OIV')`

**Algorithm Flow:**
1. Set `algorithmsInProgress = true`
2. For each investment round (`t = 0` to `possibleInvestments`):
   - **Epsilon-Greedy**: Random selection if `Math.random() < 0.1`
   - **Greedy/OIV**: Find best arm by comparing average rewards
   - Execute bandit function, store reward
3. Set `algorithmsInProgress = false`

### Average Reward Calculation

```typescript
// Initialize comparison value
let best_arm_value = -Infinity;  // Allows negative averages to win

switch (algorithm) {
    case 'greedy':
        if (stock_investments.length > 0) {
            sum = stock_investments.reduce((acc, inv) => acc + (inv.greedyReturn || 0), 0);
            avg_result = sum / stock_investments.length;  // Standard average
        } else {
            avg_result = 0;  // Cold-start value
        }
        break;
    
    case 'OIV':
        if (stock_investments.length === 0) {
            avg_result = OIV_value;  // Optimistic initial value
        } else {
            sum = stock_investments.reduce((acc, inv) => acc + (inv.optimisticInitialReturn || 0), 0);
            avg_result = sum / stock_investments.length;  // Standard average after first trial
        }
        break;
}

// Select best arm
if (avg_result > best_arm_value) {
    best_arm_value = avg_result;
    best_arm_index = i;
}
```

### Key Constants

- `val_epsilon = 0.1`: Exploration probability for Epsilon-Greedy
- `OIV_value = 5`: Optimistic initial value for OIV algorithm

## Store Integration

### Data Structures

```typescript
interface AlgoInvestment {
    stock: selectedStock;
    greedyReturn: number | null;
    eGreedyReturn: number | null;
    optimisticInitialReturn: number | null;
    // ... other algorithm returns
}
```

### Store Updates

- **Greedy**: Updates `algorithmStore.investmentsGreedy`
- **Epsilon-Greedy**: Updates `algorithmStore.investmentsEGreedy`
- **OIV**: Updates `algorithmStore.investmentsOptimisticInitial`

Each investment stores the chosen stock and reward, with other algorithm fields set to `null`.

## Usage Example

```typescript
import { greedy_bernoulli, eGreedy_gaussian, OIV_bernoulli } from '@/algorithms/e_greedy_OIV';

// Configure bandit store
banditStore.selectedStocks = [
  { stock: {...}, bernoulli_param: 0.7, gaussian_param: 0.05 }
];
banditStore.possibleInvestments = 100;

// Run algorithms
greedy_bernoulli();          // Pure exploitation
eGreedy_gaussian();          // ε-exploration
OIV_bernoulli();             // Optimistic initialization

// Access results
console.log(algorithmStore.investmentsGreedy);
console.log(algorithmStore.investmentsEGreedy);
console.log(algorithmStore.investmentsOptimisticInitial);
```

## Dependencies

- **Pinia stores**: `useBanditStore`, `useAlgorithmStore`
- **Bandit functions**: `bernoulli(p)`, `gaussian(σ)`
- **Vue.js**: Reactivity system
- **TypeScript**: Type safety

## Limitations

1. **Greedy**: No exploration after first trials (all arms tried once in cold-start)
2. **Epsilon-Greedy**: Fixed ε may not be optimal for all scenarios
3. **OIV**: Exploration only in early phase, sensitive to initial value choice (default: 5)
4. **All**: Simple averaging without learning rate or decay mechanisms

## Handling Negative Rewards (Gaussian Bandits)

All algorithms correctly handle negative rewards:
- **Comparison**: Uses `-Infinity` as initial best value, allowing negative averages to win
- **Cold-Start**: Untried arms default to `avg = 0`
- **OIV**: Optimistic value (5) ensures exploration even when all rewards are negative
- **Selection**: Always picks arm with highest average, regardless of sign