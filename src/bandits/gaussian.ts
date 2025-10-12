import { randomNormal } from "d3-random";

export function gaussian(mu_percent: number) {

  const sigma: number = 0.5;
  const sample = randomNormal(mu_percent, sigma);
  const z: number = sample();

  return z;
}
