# Upper Confidence Bound Algorithm Technical Documentation

## Overview

Das Modul `UpperConfidenceBound.ts` implementiert die UCB1 Strategie für Multi Armed Bandit Probleme mit Bernoulli und Gaussian Belohnungsmodellen. Die Implementierung folgt einer Vue Architektur mit Pinia Stores und protokolliert UCB spezifische Ergebnisse in einem dedizierten Array. Für Gaussian Belohnungen wird eine feste Standardabweichung `σ = 0.15` verwendet, die den Bonus skaliert.

## Architecture

Zwei Pinia Stores werden genutzt.

* `useBanditStore` verwaltet die feste Menge ausgewählter Aktien für einen Lauf und das Gesamtbudget an Zügen.
* `useAlgorithmStore` verfolgt den UCB Fortschritt und speichert ausschließlich UCB Züge in `investmentsUCB`, um Daten zu isolieren.

## The UCB Approach

UCB balanciert Exploration und Exploitation über eine optimistische Schätzung für jeden Arm (i). Sei (n_i) die Anzahl der UCB Züge für Arm (i), (\hat{\mu}_i) der empirische Mittelwert der Belohnung von Arm (i) basierend nur auf UCB Zügen, und (t) die Gesamtzahl der bisherigen UCB Züge.

### Bernoulli arms

[
\mathrm{UCB}_i(t)=\hat{\mu}_i+\sqrt{\frac{2\ln t}{n_i}}
]

### Gaussian arms with fixed variance (\sigma^2)

[
\mathrm{UCB}_i(t)=\hat{\mu}_i+\sqrt{\frac{2\sigma^2\ln t}{n_i}},\quad \sigma=0.15
]

Der Algorithmus wählt den Arm mit dem größten UCB Wert.

### Key Advantages

* Eingebaute Exploration durch einen Konfidenzbonus, der mit zunehmenden Zügen pro Arm schrumpft
* Deterministische Politik ohne Zufallsstichproben
* Logarithmische Regret Grenzen unter Standardannahmen für beschränkte oder subgaussian Belohnungen

## Functions

### `upperConfidenceBound_bernoulli(): void`

Führt UCB für Bernoulli Banditen aus.

#### Dependencies for Bernoulli

* Erwartet `banditStore.selectedStocks` mit `bernoulli_param: number`
* Schreibt Ergebnisse nach `algorithmStore.investmentsUCB`

### `upperConfidenceBound_gaussian(): void`

Führt UCB für Gaussian Banditen aus.

#### Dependencies for Gaussian

* Erwartet `banditStore.selectedStocks` mit `gaussian_param: number | object` analog zur verwendeten `gaussian` Hilfsfunktion
* Schreibt Ergebnisse nach `algorithmStore.investmentsUCB`

### `ucb(bandit: 'bernoulli' | 'gaussian'): void`

Gemeinsamer Runner für beide Wrapper.

#### Algorithm Flow

1. Setze `algorithmsInProgress = true`
2. Initialisierung Ziehe jeden Arm genau einmal, solange Budget verfügbar ist. Wenn das Budget (T) kleiner ist als die Armzahl (K) endet der Lauf nach der Initialisierung
3. Hauptschleife solange `totalUcbPulls() < T`

   * Setze `t = totalUcbPulls()`. Nach der Initialisierung gilt `t ≥ K ≥ 1`
   * Für jeden Arm berechne

     * (n_i) als Anzahl der Einträge in `investmentsUCB` für diese Aktie
     * (\text{mean}_i) als Durchschnitt von `ucbReturn` für diese Aktie
     * Bernoulli Score: `score_i = mean_i + sqrt((2 * ln t) / n_i)`
     * Gaussian Score: `score_i = mean_i + sqrt((2 * SIGMA * SIGMA * ln t) / n_i)` mit `SIGMA = 0.15`
   * Wähle den Arm mit dem größten Score und ziehe eine Belohnung mit dem jeweiligen Bandit Modell
   * Hänge das Ergebnis an `investmentsUCB` an
4. Setze `algorithmsInProgress = false`

## Statistical Implementation

### Score computation

```ts
const SIGMA = 0.15;

const ucbValue = (mean: number, n: number, t: number, bandit: 'bernoulli' | 'gaussian') =>
  bandit === 'gaussian'
    ? mean + Math.sqrt((2 * SIGMA * SIGMA * Math.log(t)) / n)
    : mean + Math.sqrt((2 * Math.log(t)) / n);
```

* `mean` ist der empirische Durchschnitt der UCB Rückgaben eines Arms
* Der Quadratwurzel Term ist der Optimismusbonus, der mit `n` abnimmt und mit `t` langsam wächst
* Bei Gaussian Armen wird der Bonus durch die feste Varianz (\sigma^2=\text{SIGMA}^2) skaliert

### Bernoulli reward

```ts
const reward = bernoulli(chosen_arm.bernoulli_param) ? 1 : 0;
```

Gibt 0 oder 1 zurück und erfüllt die Annahme beschränkter Belohnungen von UCB1.

### Gaussian reward

```ts
const reward = gaussian(chosen_arm.gaussian_param);
```

Gibt einen reellwertigen Reward zurück. Die feste Varianzskala eignet sich für subgaussian Fälle. Bei sehr hoher Varianz empfiehlt sich Normalisierung oder ein Varianz aware UCB.

## Data Management

### Store Integration

#### `useBanditStore`

* `selectedStocks`: feste Liste von Aktien für den gesamten Lauf. Während eines Laufs werden keine neuen Aktien hinzugefügt
* `possibleInvestments`: Gesamtzahl der Züge (T)

#### `useAlgorithmStore`

* `algorithmsInProgress`: Boolean für UI Feedback
* `investmentsUCB`: Array mit UCB spezifischen Investment Einträgen

### Investment Entry Shape

```ts
{
  stock: chosen_arm,
  greedyReturn: null,
  eGreedyReturn: null,
  thompsonReturn: null,
  ucbReturn: reward,
  gradientReturn: null,
  optimisticInitialReturn: null,
  userAlgorithmReturn: null
}
```

Nur `ucbReturn` wird für UCB befüllt. Die Trennung stellt sicher, dass Statistiken ausschließlich aus UCB Daten berechnet werden.

## Key Helpers

```ts
const pullsForStock = (idx: number) =>
  algorithmStore.investmentsUCB.filter(inv => inv.stock === stocks[idx]);

const meanForStock = (idx: number) => {
  const pulls = pullsForStock(idx);
  if (pulls.length === 0) return 0;
  const sum = pulls.reduce((a, b) => a + (b.ucbReturn as number), 0);
  return sum / pulls.length;
};

function totalUcbPulls() {
  return algorithmStore.investmentsUCB.length;
}
```

Diese Helfer berechnen Armweise Zähler und Mittelwerte aus dem dedizierten UCB Array und liefern den globalen Zugzähler.

## Usage Example

```ts
import {
  upperConfidenceBound_bernoulli,
  upperConfidenceBound_gaussian
} from '@/algorithms/UpperConfidenceBound';

banditStore.selectedStocks = [
  { /* stock object */, bernoulli_param: 0.7, gaussian_param: { /* params oder mean */ } },
  { /* another stock */, bernoulli_param: 0.5, gaussian_param: { /* params oder mean */ } }
];
banditStore.possibleInvestments = 1000;

upperConfidenceBound_bernoulli();
// oder
upperConfidenceBound_gaussian();

console.log(algorithmStore.investmentsUCB);
```

## Complexity

* Jede Auswahl filtert `investmentsUCB` pro Arm, um (n_i) und (\hat{\mu}_i) zu berechnen. Das ist einfach und für moderate Budgets gut geeignet
* Für sehr großes (T) pro Arm `count[i]` und `sum[i]` lokal führen und nach jedem Zug inkrementell aktualisieren. So vermeidest du wiederholtes Filtern und hältst den Aufwand pro Schritt linear in der Armzahl

## Limitations

1. UCB mit fester Varianzskala setzt beschränkte oder subgaussian Belohnungen voraus. Das passt zu Bernoulli Belohnungen. Bei Gaussian Belohnungen mit hoher Varianz empfiehlt sich Normalisierung oder eine getunte Varianz aware UCB Variante
2. Die Politik ist deterministisch, was Debugging vereinfacht
3. Die aktuelle Implementierung berechnet Statistiken aus der Historie neu. Inkrementelle Statistiken beschleunigen große Läufe

## Summary

* `UpperConfidenceBound.ts` führt eine UCB1 Strategie für eine feste Aktienmenge und ein festes Budget aus
* Zu Beginn wird jeder Arm einmal gezogen, danach wird wiederholt der Arm mit der größten optimistischen Schätzung gewählt
* Ergebnisse werden ausschließlich in `investmentsUCB` geschrieben, was UCB von anderen Algorithmen trennt und die Analyse vereinfacht
