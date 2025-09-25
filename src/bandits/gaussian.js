// npm i d3-random
import { randomNormal } from "d3-random";

export const gaussian_arms = [];
export const gaussian_pulls = [];

// Create or overwrite a Gaussian arm
export function gaussian_generate_arm(arm_id, investment_volume) {
  if (typeof arm_id !== "string" || !arm_id.trim()) {
    throw new Error("Parameter 'arm_id' must be a nonempty string.");
  }
  const vol = Number(investment_volume);
  if (!Number.isFinite(vol) || vol <= 0) {
    throw new Error("Parameter 'investment_volume' must be a positive number.");
  }

  // r uniformly in [-0.1, 0.1]
  const r = -0.1 + Math.random() * 0.2;

  // absolute mean r * vol + vol
  const mu_absolute = r * vol + vol;

  const new_entry = {
    arm_id,
    investment_volume: vol,
    mu_percent: r,
    mu_absolute
  };

  const idx = gaussian_arms.findIndex(e => e.arm_id === arm_id);
  if (idx >= 0) gaussian_arms[idx] = new_entry;
  else gaussian_arms.push(new_entry);

  return new_entry;
}

// Draw from N(r, 0.5^2), then scale: * vol + vol
export function gaussian_pull_arm(arm_id, gaussian_arms_array = gaussian_arms) {
  if (typeof arm_id !== "string" || !arm_id.trim()) {
    throw new Error("Parameter 'arm_id' must be a nonempty string.");
  }
  if (!Array.isArray(gaussian_arms_array)) {
    throw new Error("Parameter 'gaussian_arms_array' must be an array.");
  }

  const arm = gaussian_arms_array.find(x => x.arm_id === arm_id);
  if (!arm) {
    throw new Error(`No parameters found for Gaussian arm '${arm_id}'.`);
  }

  const sigma = 0.5;
  const sample = randomNormal(arm.mu_percent, sigma);
  const z = sample(); // z ~ N(r, 0.5^2)

  const value = z * arm.investment_volume + arm.investment_volume;
  const value_percent = (value - arm.investment_volume) / arm.investment_volume;

  const pull_number = gaussian_pulls.length + 1;
  const result = {
    arm_id,
    pull_number,
    value,
    value_percent,
    mu_percent: arm.mu_percent,
    mu_absolute: arm.mu_absolute
  };

  gaussian_pulls.push(result);
  return result;
}
