// output_testing/gaussian_generate.js
import {
  gaussian_generate_arm,
  gaussian_arms,
  gaussian_pulls
} from "../gaussian.js";

// Arrays leeren
gaussian_arms.length = 0;
gaussian_pulls.length = 0;

// Zwei Arms erzeugen
gaussian_generate_arm("Amazon", 1000);
gaussian_generate_arm("Amazon", 1100);
gaussian_generate_arm("Amazon", 1100);
gaussian_generate_arm("Google", 1200);

// Ausgabe der Arms
console.log("Gaussian Arms als Tabelle:");
console.table(gaussian_arms);

console.log("Gaussian Arms als JSON:");
console.log(JSON.stringify(gaussian_arms, null, 2));

// Optional: einfache Sichtprüfung
// Mittelwert der absoluten Mus und das investierte Volumen je Arm
const kontrollwerte = gaussian_arms.map(({ arm_id, investment_volume, mu_percent, mu_absolute }) => ({
  arm: arm_id,
  volumen: investment_volume,
  mu_prozent: mu_percent,
  mu_absolut: mu_absolute
}));

console.log("Kontrollwerte:");
console.table(kontrollwerte);
