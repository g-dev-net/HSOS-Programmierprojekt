
import {
  generiere_gaussian_bandit,
  fuehre_gaussian_zug_aus,
  gaussian_banditen,
  gaussian_zuege
} from "./gaussian.js";

// Arrays leeren
gaussian_banditen.length = 0;
gaussian_zuege.length = 0;

// Zwei Banditen erzeugen
generiere_gaussian_bandit("AAPL", 1200);
generiere_gaussian_bandit("GOOG", 1200);

// Züge ausführen, sigma wird in der Züge Funktion fest mit 1 verwendet
fuehre_gaussian_zug_aus("AAPL", gaussian_banditen);
fuehre_gaussian_zug_aus("AAPL", gaussian_banditen);
fuehre_gaussian_zug_aus("GOOG", gaussian_banditen);
fuehre_gaussian_zug_aus("GOOG", gaussian_banditen);
fuehre_gaussian_zug_aus("GOOG", gaussian_banditen);
fuehre_gaussian_zug_aus("GOOG", gaussian_banditen);

// Ausgabe der Züge
console.log("Gaussian Züge als Tabelle:");
console.table(gaussian_zuege);

console.log("Gaussian Züge als JSON:");
console.log(JSON.stringify(gaussian_zuege, null, 2));

// Optional: Mittelwert der gezogenen Werte je Aktie zur Sichtprüfung
const gruppiert = gaussian_zuege.reduce((acc, { aktie, wert }) => {
  acc[aktie] ??= { sum: 0, n: 0 };
  acc[aktie].sum += wert;
  acc[aktie].n += 1;
  return acc;
}, {});

const mittelwerte = Object.entries(gruppiert).map(([aktie, { sum, n }]) => ({
  aktie,
  anzahlZuege: n,
  durchschnittWert: sum / n
}));
console.log("Durchschnitt der gezogenen Werte pro Aktie:");
console.table(mittelwerte);
