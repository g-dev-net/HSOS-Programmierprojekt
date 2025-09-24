import { generate_bernoulli_bandit, bernoulli_bandits } from "./bernoulli.js";

generate_bernoulli_bandit("AAPL");
generate_bernoulli_bandit("GOOG");
generate_bernoulli_bandit("AAPL");

console.log("Array als JSON:");
console.log(JSON.stringify(bernoulli_bandits, null, 2));

console.log("Array als Tabelle:");
console.table(bernoulli_bandits);
