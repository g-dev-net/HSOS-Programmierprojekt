# Gaussian Arms Module

In memory utilities for simulating Gaussian bandit pulls where each arm has a mean return that scales with an investment volume. The module exposes helpers to create or update arms and to record pulls.

> File context: JavaScript ES modules. Works in Node and in the browser.

## Install

```bash
npm i d3-random
```

## Exports

```js
export const gaussian_arms = [];
export const gaussian_pulls = [];

export function gaussian_generate_arm(arm_id, investment_volume) { ... }
export function gaussian_pull_arm(arm_id, gaussian_arms_array = gaussian_arms) { ... }
```

## Data model

### Arm

```ts
type GaussianArm = {
  arm_id: string
  investment_volume: number        // > 0
  mu_percent: number               // r in [-0.1, 0.1]
  mu_absolute: number              // r * volume + volume
}
```

`mu_percent` is the expected percentage return for the arm. `mu_absolute` is the expected absolute value after investing `investment_volume`.

### Pull result

```ts
type GaussianPull = {
  arm_id: string
  pull_number: number              // global 1-based counter
  value: number                    // realized absolute value
  value_percent: number            // realized percentage return
  mu_percent: number               // arm mean in percent at the time of pull
  mu_absolute: number              // arm mean in absolute terms at the time of pull
}
```

All state is kept in memory.

* `gaussian_arms`: list of `GaussianArm`
* `gaussian_pulls`: append-only list of `GaussianPull`

## How the model works

* Arm creation sets a mean percentage return `r` drawn uniformly from `[-0.1, 0.1]`.
* The absolute mean becomes `mu_absolute = r * volume + volume`.
* A pull samples `z` from a normal distribution `N(r, 0.5^2)` using `d3-random`.
* The realized absolute value is `value = z * volume + volume`.
* The realized percentage return is `(value - volume) / volume`.

## API

### `gaussian_generate_arm(arm_id: string, investment_volume: number): GaussianArm`

Creates or overwrites an arm with identifier `arm_id` and a positive `investment_volume`.

Behavior

* Validates inputs.
* Draws `r` uniformly from `[-0.1, 0.1]`.
* Computes `mu_absolute = r * volume + volume`.
* Inserts or replaces the arm in `gaussian_arms`.
* Returns the created or updated arm.

Validation

* `arm_id` must be a nonempty string.
* `investment_volume` must be a positive finite number.

Side effects

* Mutates the exported `gaussian_arms` array.

---

### `gaussian_pull_arm(arm_id: string, gaussian_arms_array: GaussianArm[] = gaussian_arms): GaussianPull`

Simulates a Gaussian pull for the arm with id `arm_id`. Uses `d3-random` to draw from `N(mu_percent, 0.5)`.

Behavior

* Validates inputs and looks up the arm in `gaussian_arms_array`.
* Samples `z ~ N(arm.mu_percent, 0.5^2)` with `randomNormal`.
* Computes `value = z * arm.investment_volume + arm.investment_volume`.
* Computes `value_percent = (value - arm.investment_volume) / arm.investment_volume`.
* Appends the result to `gaussian_pulls` with an increasing `pull_number`.
* Returns the pull record.

Validation

* `arm_id` must be a nonempty string.
* `gaussian_arms_array` must be an array.
* Throws if the arm is not found.

Side effects

* Mutates the exported `gaussian_pulls` array.

## Examples

Create or refresh an arm and run a few pulls.

```js
import {
  gaussian_arms,
  gaussian_pulls,
  gaussian_generate_arm,
  gaussian_pull_arm
} from "./gaussian.js";

const armA = gaussian_generate_arm("A", 1_000);

for (let i = 0; i < 3; i++) {
  const res = gaussian_pull_arm("A"); // uses default gaussian_arms
  console.log(res);
}

console.log("Arms", gaussian_arms);
console.log("Total pulls", gaussian_pulls.length);
```

Work with a custom arm array.

```js
const local_arms = [];
local_arms.push(gaussian_generate_arm("X", 500));
const r1 = gaussian_pull_arm("X", local_arms);
```

Reset state for a fresh experiment.

```js
gaussian_arms.length = 0;
gaussian_pulls.length = 0;
```

## Deterministic testing

This module uses `d3-random` for normal draws and `Math.random` for the uniform draw during arm generation. For reproducible tests:

* Seed `d3-random` by providing your own PRNG. For example:

```js
import { randomNormal } from "d3-random";

// simple seeded LCG for tests
function lcg(seed = 123456789) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return (s >>> 8) / 0x01000000;
  };
}

const rng = lcg(42);
const normal = randomNormal.source(rng)(0, 1); // z ~ N(0, 1)
```

* Monkey patch `Math.random` around `gaussian_generate_arm` to control `r` in tests, and restore it after the test.

## Performance notes

* `gaussian_generate_arm` uses `findIndex` which is O(n).
* `gaussian_pull_arm` uses `find` which is O(n).
* Appending to `gaussian_pulls` is O(1) amortized.

For many arms consider an index map `{ [arm_id]: number }` that points into `gaussian_arms`.

## State management tips

* The arrays are module-level singletons. Multiple imports in one process share the same state.
* `pull_number` counts globally across all arms. If you need per arm counters, track a separate map.

## Safety and randomness

* `Math.random` is not cryptographically secure. The uniform draw for `r` is intended for simulation only.
* `d3-random` relies on the host PRNG by default. Provide a seeded PRNG for reproducible tests as shown above.

## Limitations

* No persistence. State is lost across reloads.
* No concurrency control. Mutations are not atomic.
* Fixed normal standard deviation `sigma = 0.5`. Consider making it configurable if needed.

## Future extensions

* Add setters to pin `mu_percent` for deterministic scenarios.
* Make `sigma` a parameter of `gaussian_pull_arm`.
* Provide pure functions that accept and return state instead of mutating module singletons.
* Add summary helpers for mean, variance, and win rates per arm.
