# Bernoulli Arms Module

A tiny in memory utility for simulating Bernoulli multi armed bandit pulls. Each arm has a fixed win probability in `(0.01, 0.99]`. The module exposes helpers to create or update arms and to record pulls.

> File context: JavaScript ES modules. Works in Node or in the browser.

## Exports

```js
export const bernoulli_arms = [];
export function bernoulli_generate_arm(arm_id) { ... }

export const bernoulli_pulls = [];
export function bernoulli_pull_arm(arm_id, bernoulli_arms_array) { ... }
Data model
Arm object
ts
Code kopieren
type Arm = {
  arm_id: string
  win_prob: number  // in (0.01, 0.99]
}
Pull result object
ts
Code kopieren
type PullResult = {
  arm_id: string
  pull_number: number  // 1 based index across all pulls
  won: boolean         // true if the Bernoulli trial succeeded
}
All state lives in plain arrays in memory.

bernoulli_arms: list of Arm

bernoulli_pulls: append only list of PullResult

API
bernoulli_generate_arm(arm_id: string): Arm
Creates or updates an arm with identifier arm_id. The function draws a random win probability p with p = Math.random() * 0.98 + 0.01, which yields a uniform sample in (0.01, 0.99].

Behavior
If an arm with the same arm_id exists the function replaces it with a new win_prob.

If no arm exists the function pushes a new one.

Returns the created or updated Arm.

Side effects
Mutates the exported bernoulli_arms array.

Throws
No explicit validation here. If you need strict checks for arm_id, add a wrapper or see the validation section for a safe variant.

bernoulli_pull_arm(arm_id: string, bernoulli_arms_array: Arm[]): PullResult
Simulates a Bernoulli pull for the arm identified by arm_id using the provided bernoulli_arms_array as the source of truth for probabilities.

Behavior
Looks up the arm by arm_id.

Performs a trial won = Math.random() <= arm.win_prob.

Computes pull_number = bernoulli_pulls.length + 1.

Appends { arm_id, pull_number, won } to bernoulli_pulls.

Returns the PullResult.

Side effects
Mutates the exported bernoulli_pulls array.

Throws
If arm_id is not a nonempty string.

If bernoulli_arms_array is not an array.

If no arm with arm_id exists in bernoulli_arms_array.

Examples
Create or refresh an arm, then pull it
js
Code kopieren
import {
  bernoulli_arms,
  bernoulli_generate_arm,
  bernoulli_pulls,
  bernoulli_pull_arm
} from "./bernoulli.js";

// create or refresh arm "A"
const armA = bernoulli_generate_arm("A");
console.log("Arm A win probability:", armA.win_prob);

// simulate 5 pulls on "A"
for (let i = 0; i < 5; i++) {
  const res = bernoulli_pull_arm("A", bernoulli_arms);
  console.log(res); // { arm_id: 'A', pull_number: n, won: true|false }
}

console.log("All pulls so far:", bernoulli_pulls.length);
Work with multiple arms
js
Code kopieren
bernoulli_generate_arm("A");
bernoulli_generate_arm("B");

const res1 = bernoulli_pull_arm("A", bernoulli_arms);
const res2 = bernoulli_pull_arm("B", bernoulli_arms);
Reset state for a fresh experiment
js
Code kopieren
bernoulli_arms.length = 0;
bernoulli_pulls.length = 0;
Validation and errors
bernoulli_pull_arm performs input validation.

arm_id must be a nonempty string. Otherwise it throws Error("Parameter 'arm_id' must be a nonempty string.").

bernoulli_arms_array must be an array. Otherwise it throws Error("Parameter 'bernoulli_arms_array' must be an array.").

If no arm is found it throws Error("No win probability found for arm '<id>'.").

bernoulli_generate_arm does not validate arm_id. If your usage might pass empty or non string values, add a local guard.

js
Code kopieren
function safe_generate_arm(arm_id) {
  if (typeof arm_id !== "string" || !arm_id.trim()) {
    throw new Error("arm_id must be a nonempty string");
  }
  return bernoulli_generate_arm(arm_id);
}
Deterministic testing
This module relies on Math.random. For unit tests you have two options.

Monkey patch Math.random inside a test and restore it afterwards.

js
Code kopieren
const originalRandom = Math.random;
Math.random = () => 0.42; // fixed value

const arm = bernoulli_generate_arm("T"); // win_prob becomes 0.42 * 0.98 + 0.01
const res = bernoulli_pull_arm("T", bernoulli_arms); // won depends on 0.42

Math.random = originalRandom;
Wrap the random source so you can inject a stub.

js
Code kopieren
function withRng(rng) {
  return {
    generate_arm(id) {
      const p = rng() * 0.98 + 0.01;
      const arm = { arm_id: id, win_prob: p };
      const idx = bernoulli_arms.findIndex(a => a.arm_id === id);
      if (idx >= 0) bernoulli_arms[idx] = arm;
      else bernoulli_arms.push(arm);
      return arm;
    },
    pull_arm(id, arms) {
      const arm = arms.find(a => a.arm_id === id);
      const won = rng() <= arm.win_prob;
      const result = { arm_id: id, pull_number: bernoulli_pulls.length + 1, won };
      bernoulli_pulls.push(result);
      return result;
    }
  };
}

// usage in tests
const fixed = withRng(() => 0.5);
Performance notes
bernoulli_generate_arm performs findIndex on bernoulli_arms which is O(n).

bernoulli_pull_arm performs find on the provided arms array which is O(n).

Appending to bernoulli_pulls is O(1) amortized.

If you manage many arms consider an index map keyed by arm_id to achieve O(1) lookup time at the cost of keeping the map in sync.

State management tips
The arrays are module level singletons. If you import the module in several places in one runtime they share the same state.

To run independent experiments either reset the arrays or fork the module code.

pull_number counts across all arms. If you need per arm counters, maintain a separate map { [arm_id]: number }.

Security and randomness
Math.random is not cryptographically secure. This is fine for simulations and demos.

For security sensitive contexts use a CSPRNG such as crypto.getRandomValues in the browser or crypto.randomInt in Node. You would need to refactor the random source injection as shown in the deterministic testing section.

Limitations
No persistence. All data is lost on reload.

No concurrency guards. Mutations are not atomic.

No upper or lower bounds checks beyond the range implied by the formula for win_prob.

Future extensions
Add an index map { [arm_id]: Arm } for O(1) lookups.

Expose a pure function variant that accepts and returns state rather than mutating globals.

Add helpers to reset state, remove arms, or set a specific probability.

Add statistics utilities such as running estimates of conversion rate per arm.

Support dependency injection for random number generation in the public API.
