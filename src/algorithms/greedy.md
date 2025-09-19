# Greedy Algorithm Technical Documentation

## Overview

The `greedy.js` module implements a "Cold Start" Greedy Algorithm for Multi-Armed Bandit (MAB) problems, supporting both Bernoulli and Gaussian bandit types. This implementation focuses on the exploration-exploitation trade-off in a simple yet effective manner, making it suitable for situations where no prior knowledge about the arms' performance is available.

## The "Cold Start" Approach

The "Cold Start" approach refers to starting the decision-making process without any prior information about the arms' performance. The algorithm works as follows:

1. All arms are initialized with a default performance metric (bandit_result = 0).
2. In each trial, the algorithm selects the arm with the highest current bandit_result.
3. The selected arm is played, and its result is recorded.
4. The arm's bandit_result is updated based on its cumulative performance.

This approach is characterized by:
- **No initial exploration phase**: Unlike epsilon-greedy or UCB algorithms, there's no explicit exploration parameter.
- **Purely greedy selection**: Always selects the arm that currently appears best.
- **Performance-based adaptation**: As trials progress, the algorithm naturally builds a performance profile for each arm.

The main advantage is simplicity, while the disadvantage is that it may get stuck with suboptimal arms if they perform well in their initial trials.

## Functions

### `greedy_bernoulli(arms, trials)`

A wrapper function that configures and runs the greedy algorithm with Bernoulli bandits.

**Parameters:**
- `arms`: Array of arm objects, each with:
  - `name`: String identifier for the arm
  - `propability`: Number between 0 and 1 representing the success probability

**Returns:**
- Array of result objects, each containing:
  - `name`: Original arm name
  - `trial_result`: Array of boolean values (true/false) from each trial
  - `bandit_result`: Average success rate (proportion of true values)

### `greedy_gaussian(arms, trials)`

A wrapper function that configures and runs the greedy algorithm with Gaussian bandits.

**Parameters:**
- `arms`: Array of arm objects, each with:
  - `name`: String identifier for the arm
  - `mean`: Expected value of the distribution
  - `variance`: Variance of the distribution

**Returns:**
- Array of result objects, each containing:
  - `name`: Original arm name
  - `trial_result`: Array of numeric values from each trial
  - `bandit_result`: Average of all obtained values

### `greedy(arms, trials, bandit)`

The core implementation of the greedy algorithm that handles both Bernoulli and Gaussian bandits.

**Parameters:**
- `arms`: Array of arm objects as described above
- `trials`: Number of trials to run
- `bandit`: String indicating the bandit type ('bernoulli' or 'gaussian')

**Returns:**
- Array of result objects as described above

**Algorithm Flow:**
1. Initialize an array of arms with the `init_array_arms` function
2. For each trial:
   - Identify the arm with the highest `bandit_result`
   - Pull that arm (call the appropriate bandit function)
   - Update the arm's `trial_result` array and recalculate `bandit_result`
3. Return the final state of all arms

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

### Bernoulli Bandits

For Bernoulli bandits, each arm pull returns a boolean outcome (true/false) based on the arm's success probability. The `bandit_result` is calculated as:

```javascript
bandit_result = trial_result.reduce((sum, result) => sum + (result ? 1 : 0), 0) / trial_result.length;
```

This formula calculates the proportion of successful outcomes.

### Gaussian Bandits

For Gaussian bandits, each arm pull returns a numeric value sampled from a Gaussian distribution with the arm's mean and variance. The `bandit_result` is calculated as:

```javascript
bandit_result = trial_result.reduce((sum, result) => sum + result, 0) / trial_result.length;
```

This formula calculates the average of all obtained values.

## Limitations and Considerations

1. **Cold Start Problem**: In the early trials, the algorithm may make suboptimal decisions due to limited data.
2. **No Exploration Parameter**: Unlike epsilon-greedy algorithms, there's no explicit exploration, which may lead to getting stuck with suboptimal arms.
3. **Deterministic Selection**: Given the same sequence of outcomes, the algorithm will always make the same choices.
4. **Sensitivity to Early Results**: Early random successes of a suboptimal arm may cause the algorithm to favor it for many trials.

## Usage Example

```javascript
// Define Bernoulli arms
const bernoulliArms = [
  { name: "Arm1", propability: 0.7 },
  { name: "Arm2", propability: 0.5 },
  { name: "Arm3", propability: 0.9 }
];

// Run 1000 trials with Bernoulli bandits
const bernoulliResults = greedy_bernoulli(bernoulliArms, 1000);

// Define Gaussian arms
const gaussianArms = [
  { name: "Arm1", mean: 5, variance: 1 },
  { name: "Arm2", mean: 3, variance: 2 },
  { name: "Arm3", mean: 7, variance: 3 }
];

// Run 1000 trials with Gaussian bandits
const gaussianResults = greedy_gaussian(gaussianArms, 1000);
```

## Dependencies

The implementation depends on two external bandit functions:
- `bernoulli`: Imported from '../bandits/bernoulli.js'
- `gaussian`: Imported from '../bandits/gaussian.js'

These functions are responsible for generating outcomes based on the respective probability distributions.