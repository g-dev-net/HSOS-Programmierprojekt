# Gaussian Sampler Technical Documentation

## Overview

The `gaussian.ts` module provides a function that samples from a Normal distribution using `d3-random`. It returns a real valued draw with mean `mu_percent` and fixed standard deviation `sigma = 0.15`. This is useful for continuous reward models, synthetic data, and probabilistic simulations.

## Architecture

This utility depends on `d3-random` and is framework agnostic.

### Module

```ts
import { randomNormal } from "d3-random";

export function gaussian(mu_percent: number) {
  const sigma: number = 0.15;
  const sample = randomNormal(mu_percent, sigma);
  const z: number = sample();
  return z;
}
```

### Dependency

* `d3-random` provides `randomNormal(mean, sd)` which returns a zero argument sampler that yields independent draws.

## Functions

### `gaussian(mu_percent: number): number`

Samples a Normal random variable with mean `mu_percent` and standard deviation `0.15`.

#### Parameters

* `mu_percent`
  The mean of the distribution. The name suggests a percentage scale. If your application uses percentages in `[0, 1]` or `[0, 100]`, ensure consistent interpretation across the codebase.

#### Returns

* `number`
  A real valued draw from `N(mu_percent, 0.15²)`.

#### Notes

* The spread is fixed at `sigma = 0.15`. If you need a different variance, add a parameter or create a variant such as `gaussianWith(mu, sigma)`.

## Statistical Implementation

The function constructs a sampler for a Normal distribution and evaluates it once.

```ts
const sigma = 0.15;
const sample = randomNormal(mu_percent, sigma);
const value = sample(); // value ~ Normal(mu_percent, sigma^2)
```

`randomNormal` uses a high quality algorithm to transform uniform randomness into a Normal draw. Each call to `sample()` is independent given the underlying source of randomness.

## Usage Example

```ts
import { gaussian } from "./gaussian";

// Draw a daily return centered at 2 percent on your chosen scale
const draw = gaussian(0.02);

// Use the value in a simulation
portfolioValue *= 1 + draw;
```

## Input Validation

Enforce parameter checks when helpful. A common pattern is to guard against non finite means and to document the chosen scale for `mu_percent`.

```ts
import { randomNormal } from "d3-random";

export function gaussian(mu_percent: number) {
  if (!Number.isFinite(mu_percent)) {
    throw new TypeError("mu_percent must be a finite number");
  }
  const sigma = 0.15;
  return randomNormal(mu_percent, sigma)();
}
```

### Configurable Variant

```ts
export function gaussianWith(mu: number, sigma: number) {
  if (!Number.isFinite(mu) || !Number.isFinite(sigma) || sigma < 0) {
    throw new RangeError("mu and sigma must be finite, sigma must be non negative");
  }
  return randomNormal(mu, sigma)();
}
```

## Data Shape

The function is stateless and returns a single numeric sample per call. For analytics, persist draws as plain numbers and compute aggregates such as mean or variance downstream.

## Performance

The function builds a `randomNormal` sampler and draws once. Time complexity per call is O(1) with negligible memory overhead. If you call this in tight loops, consider constructing the sampler once and reusing it.

```ts
const sample = randomNormal(mu, 0.15);
for (let i = 0; i < N; i++) {
  const z = sample();
  // process z
}
```

## Limitations

1. The standard deviation is fixed at `0.15` in the basic function. Use a configurable variant if your application requires different dispersion.
2. Normal draws are unbounded. If your domain has hard bounds, consider truncation or a bounded distribution.
3. The quality of randomness depends on the underlying source used by `d3-random`. For cryptographic needs use a secure RNG and a library designed for that context.

## Summary

* `gaussian` returns a single Normal draw with mean `mu_percent` and `sigma = 0.15`.
* The implementation uses `d3-random` and is stateless and fast.
* Use a configurable variant when you need control over the variance.
* Suitable for continuous models, simulations, and reward generation where Normal noise is appropriate.
