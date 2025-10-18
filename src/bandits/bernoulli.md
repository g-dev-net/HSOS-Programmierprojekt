# Bernoulli Bandit Utility Documentation

## Overview

This module provides a minimal **Bernoulli bandit** draw. It simulates a single trial with success probability `win_prob`. The function returns `true` if the trial is a win and `false` otherwise.

## Function

### `bernoulli(win_prob: number): boolean`

Runs one Bernoulli trial and reports whether you won.

#### Parameters

* `win_prob`
  Success probability in `[0, 1]`. Example: `0.7` means a 70 percent chance to win.

#### Return value

* `boolean`
  `true` if `Math.random() <= win_prob`, else `false`.

## Implementation

```ts
export function bernoulli(win_prob: number) {
  const won = Math.random() <= win_prob;
  return won;
}
```

## Usage example

```ts
const win = bernoulli(0.6);
if (win) {
  console.log("You won!");
} else {
  console.log("Try again.");
}
```

## Notes

* `Math.random()` is uniform in `[0, 1)`, so the expected success rate converges to `win_prob` over many trials.
* Validate inputs in callers if needed. For safety, ensure `0 <= win_prob && win_prob <= 1`.
