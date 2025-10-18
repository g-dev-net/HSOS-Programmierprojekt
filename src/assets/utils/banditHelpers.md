# Bandit Helpers Technical Documentation

## Overview

This module provides helpers to generate parameters for **Bernoulli** and **Gaussian** bandit arms. The functions return values within safe bounds that avoid degenerate cases and suit simulation defaults.

```ts
export function generateGaussianParam (): number {
  // Random value between -0.1 and 0.1
  return Math.random() * 0.2 - 0.1;
}

export function generateBernoulliParam (): number {
  // Random value between 0.01 and 0.99
  return Math.random() * 0.98 + 0.01;
}
```

## Architecture

Small utility module, no framework dependencies. Use it wherever bandit arms are created.

## Bandit Models

**Bernoulli bandit**
Rewards are binary with success probability `p`. The generator returns `p` in `[0.01, 0.99)`.

**Gaussian bandit**
Rewards are real valued with mean `μ` and some fixed or chosen `σ`. The generator returns a mean offset `μ` in `[-0.1, 0.1)`.

## Bounds

### `generateGaussianParam()`

* Formula: `Math.random() * 0.2 - 0.1`
* Range: `[-0.1, 0.1)`
  Minimum is inclusive at `-0.1`, maximum is exclusive at `0.1` since `Math.random() ∈ [0, 1)`
* Use case: small mean shifts around zero, good for close A or B comparisons

### `generateBernoulliParam()`

* Formula: `Math.random() * 0.98 + 0.01`
* Range: `[0.01, 0.99)`
  Minimum is inclusive at `0.01`, maximum is exclusive at `0.99`
* Use case: nontrivial success probabilities, avoids 0 and 1 which would remove uncertainty

## Functions

### `generateGaussianParam(): number`

Returns a mean `μ` for a Gaussian arm. Pair with your chosen `σ`. Example reward model: `R ~ Normal(μ, σ²)`.

### `generateBernoulliParam(): number`

Returns a probability `p` for a Bernoulli arm. Example reward model: `R ~ Bernoulli(p)`.

## Statistical Interpretation

* Bernoulli: `p ∈ [0.01, 0.99)` keeps variance `p(1 − p)` away from zero which is helpful for learning algorithms
* Gaussian: `μ ∈ [-0.1, 0.1)` keeps expected rewards close, which increases the need for exploration

## Usage Example

```ts
// Create five Gaussian arms with fixed noise level
const sigma = 0.15;
const gaussianArms = Array.from({ length: 5 }, () => ({
  mean: generateGaussianParam(),
  sigma
}));

// Create five Bernoulli arms
const bernoulliArms = Array.from({ length: 5 }, () => ({
  p: generateBernoulliParam()
}));

// Sampling helpers
function sampleGaussian(mean: number, sigma: number) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + sigma * z;
}

function sampleBernoulli(p: number) {
  return Math.random() < p ? 1 : 0;
}
```

## Limitations

1. Bounds are fixed by design. Adjust if your task needs wider or narrower ranges.
2. `Math.random()` is not seeded. Use a seeded PRNG for reproducible experiments.

## Summary

* `generateGaussianParam()` returns `μ ∈ [-0.1, 0.1)` for Gaussian bandits
* `generateBernoulliParam()` returns `p ∈ [0.01, 0.99)` for Bernoulli bandits
* The bounds avoid extremes, preserve uncertainty, and make simulations stable and comparable
