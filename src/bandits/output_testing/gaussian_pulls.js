// output_testing/gaussian_pulls_generate.js
import {
  gaussian_generate_arm,
  gaussian_pull_arm,
  gaussian_arms,
  gaussian_pulls
} from "../gaussian.js";

// sauber starten
gaussian_arms.length = 0;
gaussian_pulls.length = 0;

// zwei Arms erzeugen
gaussian_generate_arm("Amazon", 1000);
gaussian_generate_arm("Google", 1200);

// Pullplan: [arm_id, anzahlZuege]
const plan = [
  ["Amazon", 4],
  ["Google", 6],
];

// Züge ausführen und kurz loggen
for (const [id, n] of plan) {
  for (let i = 0; i < n; i++) {
    const res = gaussian_pull_arm(id);
    console.log(`Zug ${res.pull_number} für ${id}:`, {
      value: res.value,
      value_percent: res.value_percent
    });
  }
}

// Übersicht
console.log("\nArms:");
console.table(gaussian_arms);

console.log("\nAlle Züge:");
console.table(gaussian_pulls);

// Kontrollwerte je Arm
const gruppiert = gaussian_pulls.reduce((acc, p) => {
  acc[p.arm_id] ??= { sumAbs: 0, sumPct: 0, n: 0 };
  acc[p.arm_id].sumAbs += p.value;
  acc[p.arm_id].sumPct += p.value_percent;
  acc[p.arm_id].n += 1;
  return acc;
}, {});

const kontrolltabelle = Object.entries(gruppiert).map(([arm, { sumAbs, sumPct, n }]) => ({
  arm,
  anzahlZuege: n,
  durchschnittWert: sumAbs / n,
  durchschnittProzent: sumPct / n
}));

console.log("\nKontrollwerte pro Arm:");
console.table(kontrolltabelle);

// JSON Dump falls benötigt
console.log("\nZüge als JSON:");
console.log(JSON.stringify(gaussian_pulls, null, 2));
