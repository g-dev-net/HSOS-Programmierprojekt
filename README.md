# HSOS-Programmierprojekt

## Überblick
Dieses Vue-3-Projekt simuliert ein Multi-Armed-Bandit-Szenario: Nutzer:innen können ein Aktienportfolio zusammenstellen, Investments tätigen und anschließend verschiedene Bandit-Algorithmen miteinander vergleichen (u. a. Greedy, Thompson Sampling, UCB, Epsilon-Greedy, Optimistic Initial Values und Gradient Bandit). Visualisierte Erträge und Kennzahlen helfen dabei, die Strategien gegenüberzustellen.

## Funktionsumfang
- Interaktive Auswahl und Verwaltung eines Aktienportfolios
- Simulation von Bernoulli- und Gaussian-Bandits
- Vergleich mehrerer Bandit-Algorithmen und Visualisierung der Ergebnisse
- Anzeige der Portfolioentwicklung sowie der Arm-Parameter (Erfolgswahrscheinlichkeiten / erwartete Renditen)
- Integrierte Beschreibung der Algorithmen inkl. mathematischer Hintergründe

## Voraussetzungen
- Node.js ^20.19.0 oder >=22.12.0
- npm (in Node.js enthalten)

## Installation & Start
1. Repository klonen oder herunterladen.
   ```bash
   git clone <REPO-URL>
   cd HSOS-Programmierprojekt
   ```
2. Abhängigkeiten installieren.
   ```bash
   npm install
   ```
3. Entwicklungsserver starten.
   ```bash
   npm run dev
   ```
4. Die lokale URL aus dem Terminal im Browser öffnen (standardmäßig `http://localhost:5173`).

### Optional: Qualitätssicherung
- Typprüfung: `npm run type-check`
- Unit-Tests (Vitest): `npm run test:unit`

### Produktion
```bash
npm run build
```
Das gebaute Projekt liegt anschließend im Verzeichnis `dist/` und kann über einen beliebigen Static-File-Server bereitgestellt werden.

## Autoren
- Max Schwingenheuer
- Paul Hölscher
- Nico Sutheimer
- Jonathan Gall
- Georg Höfelmann
