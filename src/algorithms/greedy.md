# Greedy Algorithm Technical Documentation

## Overview

The `greedy.js` module implements both standard Greedy and Epsilon-Greedy Algorithms for Multi-Armed Bandit (MAB) problems, supporting both Bernoulli and Gaussian bandit types. This implementation focuses on the exploration-exploitation trade-off in a simple yet effective manner, making it suitable for situations where no prior knowledge about the arms' performance is available.

## Testing

The tests for this module are located in the directory `/src/tests/greedy.test.js`. They validate both the standard greedy and epsilon-greedy implementations using mocks for the bandit functions.

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

### `greedy_bernoulli(arms, trials)`

A wrapper function that configures and runs the standard greedy algorithm with Bernoulli bandits.

**Parameters:**
- `arms`: Array of arm objects, each with:
  - `name`: String identifier for the arm
  - `propability`: Number between 0 and 1 representing the success probability
- `trials`: Number of trials to run

**Returns:**
- Array of result objects, each containing:
  - `name`: Original arm name
  - `trial_result`: Array of boolean values (true/false) from each trial
  - `bandit_result`: Average success rate (proportion of true values)

### `eGreedy_bernoulli(arms, trials)`

A wrapper function that configures and runs the epsilon-greedy algorithm with Bernoulli bandits.

**Parameters:**
- `arms`: Array of arm objects, each with:
  - `name`: String identifier for the arm
  - `propability`: Number between 0 and 1 representing the success probability
- `trials`: Number of trials to run

**Returns:**
- Array of result objects, each containing:
  - `name`: Original arm name
  - `trial_result`: Array of boolean values (true/false) from each trial
  - `bandit_result`: Average success rate (proportion of true values)

### `greedy_gaussian(arms, trials)`

A wrapper function that configures and runs the standard greedy algorithm with Gaussian bandits.

**Parameters:**
- `arms`: Array of arm objects, each with:
  - `name`: String identifier for the arm
  - `mean`: Expected value of the distribution
  - `variance`: Variance of the distribution
- `trials`: Number of trials to run

**Returns:**
- Array of result objects, each containing:
  - `name`: Original arm name
  - `trial_result`: Array of numeric values from each trial
  - `bandit_result`: Average of all obtained values

### `eGreedy_gaussian(arms, trials)`

A wrapper function that configures and runs the epsilon-greedy algorithm with Gaussian bandits.

**Parameters:**
- `arms`: Array of arm objects, each with:
  - `name`: String identifier for the arm
  - `mean`: Expected value of the distribution
  - `variance`: Variance of the distribution
- `trials`: Number of trials to run

**Returns:**
- Array of result objects, each containing:
  - `name`: Original arm name
  - `trial_result`: Array of numeric values from each trial
  - `bandit_result`: Average of all obtained values

### `xGreedy(arms, trials, bandit, epsilon)`

The core implementation of both the standard greedy and epsilon-greedy algorithms that handles both Bernoulli and Gaussian bandits.

**Parameters:**
- `arms`: Array of arm objects as described above
- `trials`: Number of trials to run
- `bandit`: String indicating the bandit type ('bernoulli' or 'gaussian')
- `epsilon`: Boolean indicating whether to use epsilon-greedy (true) or standard greedy (false)

**Returns:**
- Array of result objects as described above

**Algorithm Flow:**
1. Initialize an array of arms with the `init_array_arms` function
2. Define tracking variables for the best arm outside the loop
3. For each trial:
   - If epsilon is true and Math.random() < val_epsilon (0.1):
     - Select a random arm (exploration)
   - Else:
     - Identify the arm with the highest `bandit_result` (exploitation)
   - Pull the selected arm (call the appropriate bandit function)
   - Update the arm's `trial_result` array and recalculate `bandit_result`
4. Return the final state of all arms

### `init_array_arms(arms)`

Helper function to initialize the data structure for tracking arm performance.

**Parameters:**
- `arms`: Array of arm objects as described above

**Returns:**
- Array of initialized arm tracking objects, each with:
  - `name`: Original arm name
  - `trial_result`: Empty array to store results
  - `bandit_result`: Initial value of 0

## Performance Metrics

The algorithm tracks two key metrics for each arm:

1. **trial_result**: A historical record of all outcomes from pulling that arm:
   - For Bernoulli bandits: Array of boolean values
   - For Gaussian bandits: Array of numeric values

2. **bandit_result**: A performance measure used to select arms:
   - For Bernoulli bandits: Proportion of successful pulls (true values)
   - For Gaussian bandits: Average of all obtained values

## Implementation Details

### Bandit Types

#### Bernoulli Bandits

For Bernoulli bandits, each arm pull returns a boolean outcome (true/false) based on the arm's success probability. The `bandit_result` is calculated as:

```javascript
bandit_result = trial_result.reduce((sum, result) => sum + (result ? 1 : 0), 0) / trial_result.length;
```

This formula calculates the proportion of successful outcomes.

#### Gaussian Bandits

For Gaussian bandits, each arm pull returns a numeric value sampled from a Gaussian distribution with the arm's mean and variance. The `bandit_result` is calculated as:

```javascript
bandit_result = trial_result.reduce((sum, result) => sum + result, 0) / trial_result.length;
```

This formula calculates the average of all obtained values.

### Epsilon-Greedy Mechanism

The epsilon-greedy implementation uses a parameter `val_epsilon` (default 0.1) to control the exploration-exploitation trade-off:

```javascript
if (epsilon && Math.random() < val_epsilon) {
    // Exploration: Select a random arm
    best_arm_index = Math.floor(Math.random() * greedy.length);
} else {
    // Exploitation: Select the arm with the best bandit_result
    for (let i = 0; i < greedy.length; i++) {
        const current_value = greedy[i].bandit_result;
        if (current_value > best_arm_value) {
            best_arm_value = current_value;
            best_arm_index = i;
        }
    }
}
```

This implementation:
1. With 10% probability, selects a completely random arm (exploration)
2. With 90% probability, selects the arm with the highest current bandit_result (exploitation)

## Limitations and Considerations

1. **Cold Start Problem**: In the early trials, the algorithm may make suboptimal decisions due to limited data.
2. **Exploration-Exploitation Trade-off**:
   - Standard greedy: No explicit exploration, which may lead to getting stuck with suboptimal arms.
   - Epsilon-greedy: Fixed exploration rate may be inefficient in later stages when a good arm has been identified.
3. **Deterministic vs. Stochastic Selection**:
   - Standard greedy: Given the same sequence of outcomes, the algorithm will always make the same choices.
   - Epsilon-greedy: Introduces randomness in arm selection, which can help escape local optima.
4. **Sensitivity to Early Results**: Early random successes of a suboptimal arm may cause the algorithm to favor it for many trials in the standard greedy approach. Epsilon-greedy mitigates this issue.
5. **Parameter Tuning**: The epsilon value (0.1 by default) may need tuning based on the specific problem context.

## Usage Example

```javascript
// Define Bernoulli arms
const bernoulliArms = [
  { name: "Arm1", propability: 0.7 },
  { name: "Arm2", propability: 0.5 },
  { name: "Arm3", propability: 0.9 }
];

// Run 1000 trials with standard greedy Bernoulli bandits
const bernoulliResults = greedy_bernoulli(bernoulliArms, 1000);

// Run 1000 trials with epsilon-greedy Bernoulli bandits
const eBernoulliResults = eGreedy_bernoulli(bernoulliArms, 1000);

// Define Gaussian arms
const gaussianArms = [
  { name: "Arm1", mean: 5, variance: 1 },
  { name: "Arm2", mean: 3, variance: 2 },
  { name: "Arm3", mean: 7, variance: 3 }
];

// Run 1000 trials with standard greedy Gaussian bandits
const gaussianResults = greedy_gaussian(gaussianArms, 1000);

// Run 1000 trials with epsilon-greedy Gaussian bandits
const eGaussianResults = eGreedy_gaussian(gaussianArms, 1000);
```

## Dependencies

The implementation depends on two external bandit functions:
- `bernoulli`: Imported from '../bandits/bernoulli.js'
- `gaussian`: Imported from '../bandits/gaussian.js'

These functions are responsible for generating outcomes based on the respective probability distributions.

## Testing

A comprehensive test suite is available in `/src/tests/greedy.test.js`. The tests validate:

1. **Initialization**: Correct structure creation with `init_array_arms`
2. **Standard Greedy**: Both Bernoulli and Gaussian variants
3. **Epsilon-Greedy**: Both Bernoulli and Gaussian variants with exploration behavior
4. **Algorithm Logic**: Arm selection, update mechanics, and result calculations
5. **Exploration-Exploitation**: Verification of the if/else branch for exploration vs. exploitation

The tests use Vitest's mocking capabilities to isolate the algorithm's behavior from the actual bandit implementations.