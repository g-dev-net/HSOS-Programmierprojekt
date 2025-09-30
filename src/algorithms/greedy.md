# Greedy Algorithm Technical Documentation

## Overview

The `greedy.js` module implements both standard Greedy and Epsilon-Greedy Algorithms for Multi-Armed Bandit (MAB) problems, supporting both Bernoulli and Gaussian bandit types. This implementation uses a Vue.js store-based architecture with Pinia for state management, eliminating the need for parameter passing and providing a reactive, centralized data management approach.

## Architecture

The implementation leverages two main Pinia stores:
- **`useBanditStore`**: Manages selected stocks, investment parameters, and overall bandit configuration
- **`useAlgorithmStore`**: Handles algorithm-specific data, progress tracking, and investment results

## Testing

The tests for this module are located in the directory `/src/tests/greedy.test.js`. They validate both the standard greedy and epsilon-greedy implementations by testing store interactions and algorithm behavior without mocks.

## The Greedy and Epsilon-Greedy Approaches

### Standard Greedy Approach

The "Cold Start" standard greedy approach refers to starting the decision-making process without any prior information about the arms' performance. The algorithm works as follows:

1. All arms are initialized with a default performance metric (bandit_result = 0).
2. In each trial, the algorithm selects the arm with the highest current bandit_result.
3. The selected arm is played, and its result is recorded.
4. The arm's bandit_result is updated based on its cumulative performance.

This approach is characterized by:
- **No initial exploration phase**: Unlike epsilon-greedy or UCB algorithms, there's no explicit exploration parameter.
- **Purely greedy selection**: Always selects the arm that currently appears best.
- **Performance-based adaptation**: As trials progress, the algorithm naturally builds a performance profile for each arm.

The main advantage is simplicity, while the disadvantage is that it may get stuck with suboptimal arms if they perform well in their initial trials.

### Epsilon-Greedy Approach

The epsilon-greedy approach adds an exploration component to the standard greedy algorithm:

1. With probability ε (epsilon), the algorithm selects a random arm (exploration).
2. With probability 1-ε, the algorithm selects the arm with the highest current bandit_result (exploitation).

This approach is characterized by:
- **Explicit exploration parameter**: The epsilon value (default 0.1) controls the exploration-exploitation balance.
- **Occasional random selection**: Prevents getting stuck with suboptimal arms.
- **Balance between exploration and exploitation**: More balanced than pure greedy approach.

The main advantage is avoiding premature convergence to suboptimal solutions, while potentially sacrificing some short-term performance for better long-term results.

## Functions

### `greedy_bernoulli()`

Executes the standard greedy algorithm with Bernoulli bandits using store-managed data.

**Dependencies:**
- Requires `banditStore.selectedStocks` to contain stock configurations with `bernoulli_param`
- Requires `banditStore.possibleInvestments` to define the number of investment rounds
- Updates `algorithmStore.investmentsGreedy` with results

**Behavior:**
- Sets `algorithmsInProgress` to true during execution
- For each investment round, selects the stock with the highest `greedyReturn`
- Calls the `bernoulli()` function with the selected stock's `bernoulli_param`
- Stores results in `algorithmStore.investmentsGreedy` as `AlgoInvestment` objects

### `eGreedy_bernoulli()`

Executes the epsilon-greedy algorithm with Bernoulli bandits using store-managed data.

**Dependencies:**
- Same as `greedy_bernoulli()`
- Uses `val_epsilon` (0.1) for exploration probability

**Behavior:**
- Same as `greedy_bernoulli()` but with 10% probability of random arm selection
- Exploration: Random stock selection when `Math.random() < val_epsilon`
- Exploitation: Best performing stock selection otherwise

### `greedy_gaussian()`

Executes the standard greedy algorithm with Gaussian bandits using store-managed data.

**Dependencies:**
- Requires `banditStore.selectedStocks` to contain stock configurations with `gaussian_param`
- Requires `banditStore.possibleInvestments` to define the number of investment rounds
- Updates `algorithmStore.investmentsGreedy` with results

**Behavior:**
- Sets `algorithmsInProgress` to true during execution
- For each investment round, selects the stock with the highest `greedyReturn`
- Calls the `gaussian()` function with the selected stock's `gaussian_param`
- Stores results in `algorithmStore.investmentsGreedy` as `AlgoInvestment` objects

### `eGreedy_gaussian()`

Executes the epsilon-greedy algorithm with Gaussian bandits using store-managed data.

**Dependencies:**
- Same as `greedy_gaussian()`
- Uses `val_epsilon` (0.1) for exploration probability

**Behavior:**
- Same as `greedy_gaussian()` but with 10% probability of random arm selection
- Exploration: Random stock selection when `Math.random() < val_epsilon`
- Exploitation: Best performing stock selection otherwise

### `xGreedy(bandit, epsilon)`

The core implementation of both the standard greedy and epsilon-greedy algorithms that handles both Bernoulli and Gaussian bandits using store-managed data.

**Parameters:**
- `bandit`: String indicating the bandit type ('bernoulli' or 'gaussian')
- `epsilon`: Boolean indicating whether to use epsilon-greedy (true) or standard greedy (false)

**Dependencies:**
- Uses `banditStore.selectedStocks` for stock configurations
- Uses `banditStore.possibleInvestments` for iteration count
- Updates `algorithmStore.investmentsGreedy` with results
- Sets `algorithmStore.algorithmsInProgress` during execution

**Algorithm Flow:**
1. Initialize tracking variables for the best arm outside the loop
2. Set `algorithmsInProgress` to true
3. For each investment round (based on `possibleInvestments`):
   - If epsilon is true and `Math.random() < val_epsilon` (0.1):
     - Select a random stock index (exploration)
   - Else:
     - Identify the stock with the highest `greedyReturn` from previous investments (exploitation)
   - Pull the selected stock using the appropriate bandit function
   - Push the result to `algorithmStore.investmentsGreedy` as an `AlgoInvestment` object
4. Set `algorithmsInProgress` to false
5. Results are stored in the algorithm store for reactive UI updates

## Data Management

### Store Integration

The algorithm integrates with two Pinia stores:

#### `useBanditStore`
- **`selectedStocks`**: Array of `selectedStock` objects containing stock information and bandit parameters
- **`possibleInvestments`**: Number defining how many investment rounds to execute

#### `useAlgorithmStore`
- **`investmentsGreedy`**: Array of `AlgoInvestment` objects storing algorithm results
- **`algorithmsInProgress`**: Boolean flag indicating algorithm execution status

### Data Flow

1. **Initialization**: Algorithm reads configuration from `banditStore`
2. **Execution**: Each investment round creates an `AlgoInvestment` object
3. **Storage**: Results are pushed to `algorithmStore.investmentsGreedy`
4. **UI Updates**: Vue.js reactivity automatically updates the interface

### Data Types

#### `AlgoInvestment`
```typescript
interface AlgoInvestment {
    stock: selectedStock;
    greedyReturn: number | null;
}
```

#### `selectedStock`
```typescript
interface selectedStock {
    stock: Stock;
    bernoulli_param: number;
    gaussian_param: number;
}
```

## Implementation Details

### Bandit Types

#### Bernoulli Bandits

For Bernoulli bandits, each stock selection returns a boolean outcome (true/false) based on the stock's `bernoulli_param`. The result is stored as `greedyReturn` in the `AlgoInvestment` object, where boolean true is converted to 1 and false to 0 for comparison purposes.

#### Gaussian Bandits

For Gaussian bandits, each stock selection returns a numeric value sampled from a Gaussian distribution using the stock's `gaussian_param`. The result is stored directly as `greedyReturn` in the `AlgoInvestment` object.

### Epsilon-Greedy Mechanism

The epsilon-greedy implementation uses a parameter `val_epsilon` (default 0.1) to control the exploration-exploitation trade-off:

```javascript
if (epsilon && Math.random() < val_epsilon) {
    // Exploration: Select a random stock
    best_arm_index = Math.floor(Math.random() * stock.length);
} else {
    // Exploitation: Select the stock with the best greedyReturn
    let best_arm_value = algorithmStore.investmentsGreedy[0].greedyReturn || 0;
    for (let i = 0; i < algorithmStore.investmentsGreedy.length; i++) {
        const current_value = algorithmStore.investmentsGreedy[i].greedyReturn || 0;
        if (current_value > best_arm_value) {
            best_arm_value = current_value;
            best_arm_index = i;
        }
    }
}
```

This implementation:
1. With 10% probability, selects a completely random stock (exploration)
2. With 90% probability, selects the stock with the highest current `greedyReturn` (exploitation)

### Store-Based Architecture Benefits

1. **Reactive UI Updates**: Vue.js reactivity automatically updates the interface when algorithm data changes
2. **Centralized State**: All algorithm and bandit data is managed in dedicated stores
3. **No Parameter Passing**: Eliminates the need for complex parameter management
4. **Scalability**: Easy to extend with additional algorithm types and configurations

## Limitations and Considerations

1. **Cold Start Problem**: In the early investment rounds, the algorithm may make suboptimal decisions due to limited data.
2. **Exploration-Exploitation Trade-off**:
   - Standard greedy: No explicit exploration, which may lead to getting stuck with suboptimal stocks.
   - Epsilon-greedy: Fixed exploration rate may be inefficient in later stages when a good stock has been identified.
3. **Store Dependencies**: The algorithm requires properly initialized stores with valid stock configurations.
4. **Reactive State Management**: Changes to store data during algorithm execution may affect results.
5. **Parameter Tuning**: The epsilon value (0.1 by default) may need tuning based on the specific investment context.

## Usage Example

```javascript
import { useBanditStore } from '@/stores/bandit';
import { useAlgorithmStore } from '@/stores/algorithms';
import { greedy_bernoulli, eGreedy_bernoulli, greedy_gaussian, eGreedy_gaussian } from '@/algorithms/greedy';

// Setup stores
const banditStore = useBanditStore();
const algorithmStore = useAlgorithmStore();

// Configure bandit store with stocks and investment rounds
banditStore.selectedStocks = [
  {
    stock: { id: 1, name: "Stock A", price: 100, logo_url: "..." },
    bernoulli_param: 0.7,
    gaussian_param: 0.5
  },
  {
    stock: { id: 2, name: "Stock B", price: 150, logo_url: "..." },
    bernoulli_param: 0.5,
    gaussian_param: 0.3
  }
];
banditStore.possibleInvestments = 1000;

// Run algorithms
greedy_bernoulli();          // Standard greedy with Bernoulli bandits
eGreedy_bernoulli();         // Epsilon-greedy with Bernoulli bandits
greedy_gaussian();           // Standard greedy with Gaussian bandits
eGreedy_gaussian();          // Epsilon-greedy with Gaussian bandits

// Access results
console.log(algorithmStore.investmentsGreedy);
```

## Dependencies

The implementation depends on:
- **Pinia stores**: `useBanditStore` and `useAlgorithmStore` for state management
- **Bandit functions**: `bernoulli` and `gaussian` imported from respective bandit modules
- **Vue.js reactivity**: For automatic UI updates and data binding

## Testing

A comprehensive test suite is available in `/src/tests/greedy.test.js`. The tests validate:

1. **Store Integration**: Proper interaction with Pinia stores
2. **Algorithm Logic**: Correct implementation of greedy and epsilon-greedy selection
3. **Data Flow**: Proper data management from stores to algorithm results
4. **Bandit Function Calls**: Correct usage of Bernoulli and Gaussian bandit functions
5. **State Management**: Proper handling of `algorithmsInProgress` flag
6. **Edge Cases**: Handling of empty stores, invalid configurations, and error conditions

The tests use real store instances and bandit functions, eliminating the need for mocks and ensuring integration testing.