export const bernoulli_arms = [];

export function bernoulli_generate_arm(arm_id) {
  const p = Math.random() * 0.98 + 0.01;
  const arm = { arm_id, win_prob: p };

  const idx = bernoulli_arms.findIndex(a => a.arm_id === arm_id);
  if (idx >= 0) {
    bernoulli_arms[idx] = arm;
  } else {
    bernoulli_arms.push(arm);
  }

  return arm;
}

export const bernoulli_pulls = [];

export function bernoulli_pull_arm(arm_id, bernoulli_arms_array) {
  if (typeof arm_id !== "string" || !arm_id.trim()) {
    throw new Error("Parameter 'arm_id' must be a nonempty string.");
  }
  if (!Array.isArray(bernoulli_arms_array)) {
    throw new Error("Parameter 'bernoulli_arms_array' must be an array.");
  }

  const arm = bernoulli_arms_array.find(a => a.arm_id === arm_id);
  if (!arm) {
    throw new Error(`No win probability found for arm '${arm_id}'.`);
  }

  const won = Math.random() <= arm.win_prob;

  // pull number
  const pull_number = bernoulli_pulls.length + 1;

  const result = { arm_id, pull_number, won };
  bernoulli_pulls.push(result);
  return result;
}
