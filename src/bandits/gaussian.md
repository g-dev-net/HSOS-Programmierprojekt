# Gaussian Bandit Utility Documentation

## Overview

This module provides a simple **Gaussian bandit** draw. It samples a real-valued reward from a normal distribution with mean `mu_percent` and fixed standard deviation `sigma = 0.15`.

## Function

### `gaussian(mu_percent: number): number`

Draws one sample from `Normal(mean = mu_percent, sd = 0.15)` and returns it.

#### Parameters

* `mu_percent`
  Mean of the normal distribution. Choose a value consistent with your reward scale, for example 0.05 for 5 percent.

#### Return value

* `number`
  A single real-valued sample from the specified normal distribution.

## Implementation

```ts
import { randomNormal } from "d3-random";

export function gaussian(mu_percent: number) {
  const sigma: number = 0.15;
  const sample = randomNormal(mu_percent, sigma);
  const z: number = sample();
  return z;
}
```

## Usage example

```ts
const reward = gaussian(0.1);
console.log(`Sampled reward: ${reward}`);
```

## Notes

* The output is unbounded. If your environment expects clipped rewards, clamp the value after sampling.
* `randomNormal` uses the platform RNG. For reproducible experiments, use a seeded source from `d3-random` and pass it to the generator.
