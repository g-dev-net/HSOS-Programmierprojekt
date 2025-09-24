// test_gaussian_generate.mjs
import { generiere_gaussian_bandit, gaussian_banditen } from "./gaussian.js";

// Array leeren, damit der Test reproduzierbar ist
gaussian_banditen.length = 0;

// Banditen erzeugen, AAPL absichtlich zweimal zum Überschreiben
generiere_gaussian_bandit("AAPL", 1000);
generiere_gaussian_bandit("GOOG", 1000);
generiere_gaussian_bandit("AAPL", 1000);

// Ausgabe als JSON
console.log("Array als JSON:");
console.log(JSON.stringify(gaussian_banditen, null, 2));

// Ausgabe als Tabelle
console.log("Array als Tabelle:");
console.table(gaussian_banditen);

// Kleine Plausibilitätsprüfung für mu im Bereich [0.9 * vol, 1.1 * vol]
const checks = gaussian_banditen.map(({ aktie, investitionsvolumen: vol, mu }) => {
  const min = 0.9 * vol;
  const max = 1.1 * vol;
  const ok = mu >= min && mu <= max;
  return { aktie, vol, mu, min, max, ok };
});
console.log("Plausibilitätschecks für mu:");
console.table(checks);
