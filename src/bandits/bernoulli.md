# Bernoulli Sampler Technical Documentation

## Overview

The `bernoulli.ts` module provides a minimal function that samples a Bernoulli random variable using JavaScript’s standard pseudo random number generator. It returns `true` with probability `p` and `false` otherwise. Typical use cases include feature flags, simulations, and probabilistic branching.

## Architecture

This utility is framework agnostic and has no runtime dependencies.

### Module

```ts
export function bernoulli(win_prob: number) {
  const won = Math.random() <= win_prob;
  return won;
}
```

### Optional variant for reproducibility

A dependency injected version enables deterministic runs by supplying a custom RNG that returns a float in `[0, 1)`.

```ts
export type RNG = () => number;

export function bernoulliWith(rng: RNG, win_prob: number) {
  return rng() <= win_prob;
}
```

## Functions

### `bernoulli(win_prob: number): boolean`

Samples a Bernoulli trial with success probability `win_prob`.

#### Parameters

* `win_prob`
  Probability of success in `[0, 1]`.

#### Returns

* `boolean`
  `true` for success, `false` for failure.

#### Notes

* Uses `Math.random()` which is not seedable in standard JS environments.
* For reproducible behavior use `bernoulliWith` with a seeded RNG you control.

### `bernoulliWith(rng: RNG, win_prob: number): boolean`

Same semantics as `bernoulli` but draws from the provided `rng`.

#### Dependencies

* `rng` must return a floating point number in `[0, 1)`.

## Statistical Implementation

A Bernoulli trial returns 1 with probability `p` and 0 with probability `1 - p`. The function implements this via a single comparison against a uniform draw.

```ts
const success = Math.random() <= p; // uniform U in [0, 1)
```

Over many independent calls the empirical mean of `success` converges to `p`.

## Usage Example

```ts
import { bernoulli } from "./bernoulli";

if (bernoulli(0.25)) {
  enableBetaFeature();
} else {
  fallbackPath();
}
```

With dependency injection:

```ts
import { bernoulliWith, RNG } from "./bernoulli";

const seededRng: RNG = makeSeededRng(42); // your implementation
const chooseA = bernoulliWith(seededRng, 0.5);
```

## Input Validation

Enforce parameter bounds in production or only in development.

```ts
export function bernoulli(win_prob: number) {
  if (!Number.isFinite(win_prob) || win_prob < 0 || win_prob > 1) {
    throw new RangeError("win_prob must be a finite number in [0, 1]");
  }
  return Math.random() <= win_prob;
}
```

## Data Shape

There is no persisted state. The function returns a plain boolean. If you integrate this into analytics, store outcomes as `0 or 1` when numeric aggregation is needed.

## Performance

The function performs one random draw and one comparison. Time complexity is O(1) and memory overhead is negligible, suitable for tight loops.

## Limitations

1. `Math.random()` is implementation dependent and not cryptographically secure. Do not use this for security sensitive logic. For crypto grade randomness use Web Crypto `crypto.getRandomValues`.
2. Independence and distribution quality depend on the underlying RNG.
3. No built in seeding in standard JS. Use `bernoulliWith` plus a seeded RNG for reproducibility.

## Summary

* `bernoulli` implements a single Bernoulli trial that returns a boolean.
* Use `bernoulliWith` when you need deterministic behavior.
* Validate inputs and treat outputs as `0 or 1` when aggregating statistics.
* Suitable for feature flags, simulation, A or B branching, and lightweight stochastic control.
