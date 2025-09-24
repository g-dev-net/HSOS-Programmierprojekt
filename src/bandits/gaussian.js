// npm i d3-random
import { randomNormal } from "d3-random";

export const gaussian_banditen = [];
export const gaussian_zuege = [];


// erzeugt oder überschreibt einen Gaussian Banditen
export function generiere_gaussian_bandit(aktie, investitionsvolumen) {
  if (typeof aktie !== "string" || !aktie.trim()) {
    throw new Error("Parameter 'aktie' muss eine nichtleere Zeichenkette sein.");
  }
  const vol = Number(investitionsvolumen);
  if (!Number.isFinite(vol) || vol <= 0) {
    throw new Error("Parameter 'investitionsvolumen' muss eine positive Zahl sein.");
  }

  // mu gleichverteilt zwischen 0,9 und 1,1 vom Volumen
  const mu = vol * (0.9 + Math.random() * 0.2);

  // σ = 10% vom Investitionsvolumen
  const sigma = vol * 0.10; 

  const eintragNeu = { aktie, investitionsvolumen: vol, mu, sigma };
  const idx = gaussian_banditen.findIndex(e => e.aktie === aktie);
  if (idx >= 0) gaussian_banditen[idx] = eintragNeu;
  else gaussian_banditen.push(eintragNeu);
  return eintragNeu;
}

// zieht einen Wert aus N(mu, σ^2)
export function fuehre_gaussian_zug_aus(aktie, banditArray = gaussian_banditen) {
  if (typeof aktie !== "string" || !aktie.trim()) {
    throw new Error("Parameter 'aktie' muss eine nichtleere Zeichenkette sein.");
  }
  if (!Array.isArray(banditArray)) {
    throw new Error("Parameter 'banditArray' muss ein Array sein.");
  }

  const e = banditArray.find(x => x.aktie === aktie);
  if (!e) {
    throw new Error(`Keine Parameter für Gaussian Bandit der Aktie '${aktie}' gefunden.`);
  }

  const sample = randomNormal(e.mu, e.sigma);
  const wert = sample();

  const zug = gaussian_zuege.length + 1;
  const result = { aktie, zug, wert, mu: e.mu, sigma: e.sigma };
  gaussian_zuege.push(result);
  return result;
}
