export const bernoulli_bandits = [];

export function generate_bernoulli_bandit(aktie) {
  const p = Math.random() * 0.98 + 0.01;
  const result = { aktie, p_gewinn: p };

  const idx = bernoulli_bandits.findIndex(eintrag => eintrag.aktie === aktie);
  if (idx >= 0) {
    bernoulli_bandits[idx] = result;
  } else {
    bernoulli_bandits.push(result);
  }

  return result;
}



export const bernoulli_zuege = [];

export function fuehre_bernoulli_zug_aus(aktie, bernoulliArray) {
  if (typeof aktie !== "string" || !aktie.trim()) {
    throw new Error("Parameter 'aktie' muss eine nichtleere Zeichenkette sein.");
  }
  if (!Array.isArray(bernoulliArray)) {
    throw new Error("Parameter 'bernoulliArray' muss ein Array sein.");
  }

  const eintrag = bernoulliArray.find(e => e.aktie === aktie);
  if (!eintrag) {
    throw new Error(`Keine Gewinnwahrscheinlichkeit für Aktie '${aktie}' gefunden.`);
  }

  const u = Math.random();
  const gewonnen = u <= eintrag.p_gewinn;

  // Globale, fortlaufende Zugnummer
  const zug = bernoulli_zuege.length + 1;

  const result = { aktie, zug, gewonnen };
  bernoulli_zuege.push(result);
  return result;
}
