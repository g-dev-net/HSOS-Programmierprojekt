export function generateGaussianParam (): number {
  // Zufallswert zwischen -0.1 und 0.1
  return Math.random() * 0.2 - 0.1;
}

export function generateBernoulliParam (): number {
  // Generiere eine Zufallszahl zwischen 0.01 und 0.99
  return Math.random() * 0.98 + 0.01;
}