import { bernoulli_bandits, generate_bernoulli_bandit } from "./bernoulli.js";
import { fuehre_bernoulli_zug_aus, bernoulli_zuege } from "./bernoulli.js";

generate_bernoulli_bandit("AAPL");
generate_bernoulli_bandit("GOOG");

fuehre_bernoulli_zug_aus("AAPL", bernoulli_bandits);
fuehre_bernoulli_zug_aus("AAPL", bernoulli_bandits);
fuehre_bernoulli_zug_aus("GOOG", bernoulli_bandits);
fuehre_bernoulli_zug_aus("GOOG", bernoulli_bandits);
fuehre_bernoulli_zug_aus("GOOG", bernoulli_bandits);
fuehre_bernoulli_zug_aus("GOOG", bernoulli_bandits);

console.table(bernoulli_zuege);
console.log(JSON.stringify(bernoulli_zuege));
