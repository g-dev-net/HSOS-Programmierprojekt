export function bernoulli(win_prob: number) {
  const won = Math.random() <= win_prob;

  return won;
}