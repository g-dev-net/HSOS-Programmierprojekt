# Bernoulli Arms Module

In memory utilities for simulating Bernoulli bandit pulls. Each arm has a fixed win probability in the open closed range `(0.01, 0.99]`. The module exposes helpers to create or update arms and to record pulls.

> File context: JavaScript ES modules. Works in Node and in the browser.

## Exports

```js
export const bernoulli_arms = [];
export const bernoulli_pulls = [];

export function bernoulli_generate_arm(arm_id) { ... }
export function bernoulli_pull_arm(arm_id, bernoulli_arms_array) { ... }
```

## Data model

### Arm

```ts
type BernoulliArm = {
  arm_id: string
  win_prob: number  // in (0.01, 0.99]
}
```

### Pull result

```ts
type BernoulliPull = {
  arm_id: string
  pull_number: number  // global 1 based counter
  won: boolean         // true if the trial succeeds
}
```

State is kept in memory.

* `bernoulli_arms`: list of `BernoulliArm`
* `bernoulli_pulls`: append only list of `BernoulliPull`

## How the model works

* `bernoulli_generate_arm` draws a uniform `p` with `p = Math.random() * 0.98 + 0.01`
* `bernoulli_pull_arm` samples a boolean outcome with `Math.random() <= arm.win_prob`
* `pull_number` increases with each call across all arms

## API

### `bernoulli_generate_arm(arm_id: string): BernoulliArm`

Creates or replaces an arm with identifier `arm_id`.

Behavior

1. Draws `p` uniformly in `(0.01, 0.99]`
2. Builds `{ arm_id, win_prob: p }`
3. If an arm with the same id exists it is replaced. Otherwise a new entry is pushed
4. Returns the created or updated arm

Side effects

* Mutates the exported `bernoulli_arms` array

Validation

* No explicit validation in this function. See the Validation section for a safe wrapper if needed

---

### `bernoulli_pull_arm(arm_id: string, bernoulli_arms_array: BernoulliArm[]): BernoulliPull`

Simulates a Bernoulli pull for the arm identified by `arm_id`. The function reads probabilities from the passed `bernoulli_arms_array`.

Behavior

1. Validates inputs and looks up the arm by `arm_id`
2. Computes `won = Math.random() <= arm.win_prob`
3. Computes `pull_number = bernoulli_pulls.length + 1`
4. Appends `{ arm_id, pull_number, won }` to `bernoulli_pulls`
5. Returns the pull record

Side effects

* Mutates the exported `bernoulli_pulls` array

Validation

* `arm_id` must be a nonempty string
* `bernoulli_arms_array` must be an array
* Throws if the arm is not found

## Examples

Create or refresh an arm and run a few pulls.

```js
import {
  bernoulli_arms,
  bernoulli_pulls,
  bernoulli_generate_arm,
  bernoulli_pull_arm
} from "./bernoulli.js";

const armA = bernoulli_generate_arm("A");
console.log("Arm A win probability:", armA.win_prob);

for (let i = 0; i < 5; i++) {
  const res = bernoulli_pull_arm("A", bernoulli_arms);
  console.log(res); // { arm_id: 'A', pull_number: n, won: true|false }
}

console.log("Total pulls:", bernoulli_pulls.length);
```

Reset state for a fresh experiment.

```js
bernoulli_arms.length = 0;
bernoulli_pulls.length = 0;
```

## Validation helpers

If you need strict checks during arm creation use a wrapper.

```js
function safe_generate_arm(arm_id) {
  if (typeof arm_id !== "string" || !arm_id.trim()) {
    throw new Error("arm_id must be a nonempty string");
  }
  return bernoulli_generate_arm(arm_id);
}
```

## Deterministic testing

This module uses `Math.random`. For reproducible tests monkey patch `Math.random` and restore it after the test.

```js
const originalRandom = Math.random;
Math.random = () => 0.42;

const arm = bernoulli_generate_arm("T"); // win_prob = 0.42 * 0.98 + 0.01
const res = bernoulli_pull_arm("T", bernoulli_arms); // won = 0.42 <= win_prob

Math.random = originalRandom;
```

## Performance notes

* `bernoulli_generate_arm` uses `findIndex` on `bernoulli_arms` which is O(n)
* `bernoulli_pull_arm` uses `find` on the provided arms array which is O(n)
* Appending to `bernoulli_pulls` is O(1) amortized

For many arms consider an index map `{ [arm_id]: number }` that points into `bernoulli_arms`.

## State management tips

* The arrays are module level singletons. Multiple imports in one process share the same state
* `pull_number` counts globally across all arms. For per arm counters track a separate map

## Safety and randomness

* `Math.random` is not cryptographically secure. The code targets simulation and demos

## Limitations

* No persistence
* No concurrency control
* No public API to remove arms or set a fixed probability

## Future extensions

* Add a pure function variant that accepts and returns state
* Add helpers to reset state and delete arms
* Add statistics utilities for conversion rate per arm
