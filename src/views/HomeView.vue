<script setup lang="ts">
import MainChart from '@/components/MainChart.vue';
import { type Ref, ref, watch, computed, nextTick } from 'vue';
import { useBanditStore } from '@/stores/bandit';
import Modal from '@/components/Modal.vue';
import stocks from '@/data/aktien.json'
import { generateBernoulliParam, generateGaussianParam } from '@/assets/utils/banditHelpers';
import type { selectedStock, Stock } from '@/types/bandits';
import MainTable from '@/components/MainTable.vue';
import router from '@/router';
import { useAlgorithmStore } from '@/stores/algorithms';
import type { Header, Row } from '@/types/table';
// @ts-ignore
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';

// ----------------------- general setup -----------------------
const banditStore = useBanditStore();
const algorithmStore = useAlgorithmStore();
const logoImports = import.meta.glob('../assets/companyLogos/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;
const stockList = (stocks as Stock[]).map((stock) => {
  const assetPath = `../assets/${stock.logo_url}`;
  const logo = logoImports[assetPath];
  return {
    ...stock,
    logo_url: logo ?? stock.logo_url,
  } as Stock;
});
type BanditKey = (typeof banditStore.bandits)[number]['key'];
initializePortfolio();

function initializePortfolio() {
  if (banditStore.selectedStocks.length === 0) {
    banditStore.selectedStocks = [
      { stock: stockList[0], bernoulli_param: generateBernoulliParam(), gaussian_param: generateGaussianParam() },
      { stock: stockList[1], bernoulli_param: generateBernoulliParam(), gaussian_param: generateGaussianParam() },
      { stock: stockList[2], bernoulli_param: generateBernoulliParam(), gaussian_param: generateGaussianParam() },
    ];
  }
}

// ----------------------- algorithm selection -----------------------
const isTheoryOpen = ref(false);

const gaussianTheory = [
  `<strong>Der Gaussian-Bandit</strong> ist eine Variante des Multi-Armed-Bandit-Problems, bei der jede Aktion eine kontinuierliche Belohnung liefert, die einer Normalverteilung folgt. W&auml;hrend der Bernoulli-Bandit nur zwischen Erfolg und Misserfolg unterscheidet, erzeugt der Gaussian-Bandit reelle Werte &ndash; etwa Ums&auml;tze, Messwerte oder Bewertungsscores. Ziel ist es, jene Aktion zu finden, deren erwarteter Mittelwert am h&ouml;chsten ist und damit langfristig den gr&ouml;&szlig;ten Nutzen bringt.`,
  `Jeder Arm <em>i</em> wird durch eine Zufallsvariable <span class="math">r<sub>t</sub> &#8764; &#119913;(&#956;<sub>i</sub>, &#963;<sub>i</sub><sup>2</sup>)</span> beschrieben. Der Mittelwert &#956;<sub>i</sub> ist unbekannt und wird schrittweise aus Beobachtungen gesch&auml;tzt, die Varianz &#963;<sub>i</sub><sup>2</sup> beschreibt die Streuung der Ergebnisse. Wie in allen Bandit-Problemen steht der Lernende vor dem Exploration-Exploitation-Dilemma: Er muss abw&auml;gen, ob er bekannte, gute Optionen weiter nutzt oder neue Alternativen ausprobiert, um Unsicherheiten zu verringern.`,
  `Ein typisches Beispiel ist die Preisoptimierung: Ein Unternehmen testet mehrere Preisstrategien, deren Ums&auml;tze leicht schwanken. Anfangs werden alle Varianten gleichm&auml;&szlig;ig ausprobiert, sp&auml;ter immer h&auml;ufiger jene mit dem h&ouml;chsten gesch&auml;tzten Ertrag. Der Gaussian-Bandit lernt also, welche Strategie langfristig am profitabelsten ist.`,
  `Gaussian-Banditen eignen sich &uuml;berall dort, wo Belohnungen kontinuierlich und verrauscht sind &ndash; etwa in der Online-Werbung, bei Produktions- oder Prozessoptimierung oder in datengetriebenen Lernsystemen. Da sie den vollen Informationsgehalt jeder Beobachtung nutzen, lernen sie meist schneller und stabiler als Modelle mit bin&auml;ren Rewards.`,
  `Wer sich tiefer mit der Theorie und den mathematischen Grundlagen besch&auml;ftigen m&ouml;chte, findet eine ausf&uuml;hrliche Einf&uuml;hrung in <a href="https://www.cambridge.org/highereducation/books/bandit-algorithms/06C4BB5A1B0B4223931C0463FBEC6F8E" target="_blank" rel="noopener">Lattimore &amp; Szepesv&aacute;ri (2020), <em>Bandit Algorithms</em></a> sowie in <a href="http://incompleteideas.net/book/the-book-2nd.html" target="_blank" rel="noopener">Sutton &amp; Barto (2018), <em>Reinforcement Learning: An Introduction</em></a>.`,
];
  const bernoulliTheory = [
  `<strong>Der Bernoulli-Bandit</strong> ist die einfachste und zugleich bekannteste Form des Multi-Armed-Bandit-Problems. Er beschreibt eine Situation, in der jede Aktion (&bdquo;Arm&ldquo;) bei jedem Versuch entweder einen Erfolg (1) oder einen Misserfolg (0) liefert. Ziel ist es, herauszufinden, welcher Arm die h&ouml;chste Erfolgswahrscheinlichkeit besitzt und dadurch langfristig die meisten positiven Ergebnisse erzielt.`,
  `Jeder Arm <em>i</em> ist durch eine unbekannte Erfolgswahrscheinlichkeit p<sub>i</sub> definiert. Der beobachtete Reward folgt einer Bernoulli-Verteilung: <span class="math">r<sub>t</sub> &#8764; Bernoulli(p<sub>i</sub>)</span>.`,
  `Das bedeutet, dass jede Beobachtung nur aus einem einzelnen bin&auml;ren Ereignis besteht. Trotz dieser Einfachheit ist der Bernoulli-Bandit ein zentrales Modell, weil er das Grundprinzip des Exploration-Exploitation-Dilemmas in seiner reinsten Form darstellt: Der Lernende muss abw&auml;gen, ob er den bisher besten Arm weiter spielt oder einen anderen ausprobiert, um dessen Erfolgswahrscheinlichkeit besser einsch&auml;tzen zu k&ouml;nnen.`,
  `Ein klassisches Beispiel ist ein A/B-Test im Online-Marketing: Zwei Werbeanzeigen (Arm A und Arm B) werden verschiedenen Nutzern gezeigt. Jeder Klick gilt als Erfolg (1), kein Klick als Misserfolg (0). Anfangs werden beide Varianten gleich oft gezeigt, sp&auml;ter bevorzugt das System die Anzeige mit der h&ouml;heren gesch&auml;tzten Klickwahrscheinlichkeit. So wird automatisch die erfolgreichere Variante identifiziert, w&auml;hrend die andere weiter gelegentlich getestet wird.`,
  `Bernoulli-Banditen kommen &uuml;berall dort zum Einsatz, wo Entscheidungen auf bin&auml;ren Ergebnissen basieren &ndash; etwa in A/B-Tests, Empfehlungssystemen oder Experimenten mit Erfolg/Misserfolg-Feedback. Sie bilden das Fundament vieler moderner Lern- und Optimierungsverfahren und sind oft der erste Schritt hin zu komplexeren Modellen wie Gaussian- oder Contextual-Banditen.`,
  `Wer sich tiefer mit der Theorie und den mathematischen Grundlagen besch&auml;ftigen m&ouml;chte, findet eine fundierte Einf&uuml;hrung in <a href="https://www.cambridge.org/highereducation/books/bandit-algorithms/06C4BB5A1B0B4223931C0463FBEC6F8E" target="_blank" rel="noopener">Lattimore &amp; Szepesv&aacute;ri (2020), <em>Bandit Algorithms</em></a> oder eine praxisorientierte Darstellung in <a href="https://web.stanford.edu/~bvr/pubs/TS_Tutorial.pdf" target="_blank" rel="noopener">Russo &amp; Van Roy (2016), <em>An Introduction to Thompson Sampling</em></a>.`,
];

const theoryContent = computed<string[]>(() => (banditStore.activeBandit === 'gaussian' ? gaussianTheory : bernoulliTheory));
function onBanditChange(banditKey: BanditKey) {
  if (banditStore.banditInProgress) {
    alert('Der Bandit läuft bereits. Bitte setzen Sie den Bandit zurück, um den Algorithmus zu wechseln.');
    return;
  }
  banditStore.activeBandit = banditKey;
}

function onCompareAlgorithms() {
  router.push('/algo')
}

// ----------------------- stock management modal -----------------------
const showStockManager = ref(false);
// ----------------------- instructions modal -----------------------
const showInstructionModal = ref(false);
type ShepherdTour = InstanceType<typeof Shepherd.Tour>;
const shepherdTour = ref<ShepherdTour | null>(null);

function destroyTour() {
  if (!shepherdTour.value) {
    return;
  }

  shepherdTour.value.cancel();
  shepherdTour.value = null;
}

function waitForElement(selector: string, timeout = 2000): Promise<void> {
  return new Promise<void>((resolve) => {
    const start = performance.now();

    const check = () => {
      if (document.querySelector(selector)) {
        resolve();
        return;
      }

      if (performance.now() - start > timeout) {
        console.warn(`Shepherd: Element ${selector} not found within timeout.`);
        resolve();
        return;
      }

      requestAnimationFrame(check);
    };

    check();
  });
}

async function navigateTo(path: string) {
  if (router.currentRoute.value.path === path) {
    return;
  }

  try {
    await router.push(path);
  } catch (error) {
    console.warn('Shepherd: Navigation fehlgeschlagen', error);
  }
}

function createInteractiveTour(): ShepherdTour | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      cancelIcon: {
        enabled: true,
      },
      canClickTarget: true,
      scrollTo: {
        behavior: 'smooth',
        block: 'center',
      },
      //@ts-ignore
      popperOptions: {
        modifiers: [
          {
            name: 'offset',
            options: {
              offset: [0, 12],
            },
          },
        ],
      },
    },
  });

  const exitButton = {
    text: 'Tour beenden',
    action: () => {
      tour.cancel();
    },
    secondary: true,
  };
  const nextButton = {
    text: 'Weiter',
    action: () => {
      tour.next();
    },
  };
  const finishButton = {
    text: 'Fertig',
    action: () => {
      tour.complete();
    },
  };

  const hasBanditToggle = Boolean(document.querySelector('[data-tour-target="bandit-toggle-group"]'));
  const hasInvestmentCounter = Boolean(document.querySelector('.capital-invest-counter'));
  const hasPortfolioButton = Boolean(document.querySelector('[data-tour-target="open-portfolio-manager"]'));
  const hasInvestButton = Boolean(document.querySelector('[data-tour-target="invest-button"]'));
  const hasCompareButton = Boolean(document.querySelector('[data-tour-target="navigate-compare"]'));
  const hasResetButton = Boolean(document.querySelector('[data-tour-target="reset-bandit"]'));
  let stepsAdded = false;

  if (hasBanditToggle) {
    tour.addStep({
      id: 'choose-bandit',
      title: 'Bandit auswählen',
      text: 'Wählen Sie oben den für Ihr Szenario passenden Bandit aus oder fahren Sie über „Weiter“ fort.',
      attachTo: {
        element: '[data-tour-target="bandit-toggle-group"]',
        on: 'bottom',
      },
      advanceOn: {
        selector: '[data-tour-target="bandit-toggle-group"] .text-nav-button',
        event: 'click',
      },
      buttons: [exitButton, nextButton],
    });
    stepsAdded = true;
  }

  if (hasInvestmentCounter) {
    tour.addStep({
      id: 'investment-count',
      title: 'Investments festlegen',
      text: 'Nutzen Sie die Plus- oder Minus-Buttons, um die Anzahl der verfügbaren Investments zu verändern, oder überspringen Sie den Schritt mit „Weiter“.',
      attachTo: {
        element: '.capital-invest-counter',
        on: 'bottom',
      },
      advanceOn: {
        selector: '.capital-invest-counter-button',
        event: 'click',
      },
      buttons: [exitButton, nextButton],
    });
    stepsAdded = true;
  }

  if (hasPortfolioButton) {
    tour.addStep({
      id: 'open-portfolio-manager',
      title: 'Portfolio verwalten',
      text: 'Öffnen Sie den Portfoliomanager, um die aktiven Aktien anzupassen, oder setzen Sie mit „Weiter“ fort.',
      attachTo: {
        element: '[data-tour-target="open-portfolio-manager"]',
        on: 'left',
      },
      advanceOn: {
        selector: '[data-tour-target="open-portfolio-manager"]',
        event: 'click',
      },
      buttons: [exitButton, nextButton],
    });
    stepsAdded = true;
  }

  if (hasPortfolioButton) {
    tour.addStep({
      id: 'configure-portfolio',
      title: 'Aktien auswählen',
      text: 'Aktivieren oder deaktivieren Sie Aktien nach Bedarf und speichern Sie die Auswahl – oder klicken Sie auf „Weiter“, wenn Sie den Überblick nur ansehen möchten.',
      attachTo: {
        element: '[data-tour-target="portfolio-manager-modal"]',
        on: 'top',
      },
      beforeShowPromise: async () => {
        if (!showStockManager.value) {
          showStockManager.value = true;
          await nextTick();
        }

        await waitForElement('[data-tour-target="portfolio-manager-modal"]');
      },
      advanceOn: {
        selector: '[data-tour-target="portfolio-manager-save"]',
        event: 'click',
      },
      buttons: [exitButton, nextButton],
      modalOverlayOpeningPadding: 8,
      when: {
        hide: () => {
          if (showStockManager.value) {
            showStockManager.value = false;
          }
        },
      },
    });
    stepsAdded = true;
  }

  if (hasInvestButton) {
    tour.addStep({
      id: 'start-bandit',
      title: 'Simulation starten',
      text: 'Starten Sie nun eine Investition, um die Auswirkungen zu sehen, oder fahren Sie über „Weiter“ direkt zum Vergleich.',
      attachTo: {
        element: '[data-tour-target="invest-button"]',
        on: 'left',
      },
      beforeShowPromise: () => waitForElement('[data-tour-target="invest-button"]'),
      advanceOn: {
        selector: '[data-tour-target="invest-button"]',
        event: 'click',
      },
      buttons: [exitButton, nextButton],
    });
    stepsAdded = true;
  }

  if (hasCompareButton) {
    tour.addStep({
      id: 'navigate-compare',
      title: 'Algorithmen vergleichen',
      text: 'Öffnen Sie mit einem Klick auf „Vergleich mit weiteren Algorithmen“ die Auswertungsseite oder nutzen Sie „Weiter“, um automatisch dorthin zu springen.',
      attachTo: {
        element: '[data-tour-target="navigate-compare"]',
        on: 'left',
      },
      beforeShowPromise: () => waitForElement('[data-tour-target="navigate-compare"]'),
      advanceOn: {
        selector: '[data-tour-target="navigate-compare"]',
        event: 'click',
      },
      buttons: [exitButton, nextButton],
    });
    stepsAdded = true;
  }

  tour.addStep({
    id: 'compare-overview',
    title: 'Ergebnisse im Überblick',
    text: 'Hier sehen Sie, wie sich Ihr Ergebnis gegenüber den Referenz-Algorithmen schlägt. Nehmen Sie sich einen Moment für die Diagramme.',
    attachTo: {
      element: '[data-tour-target="compare-overview"]',
      on: 'top',
    },
    beforeShowPromise: async () => {
      await navigateTo('/algo');
      await waitForElement('[data-tour-target="compare-overview"]');
    },
    buttons: [exitButton, nextButton],
  });
  stepsAdded = true;

  tour.addStep({
    id: 'compare-back',
    title: 'Zurück zur Simulation',
    text: 'Kehren Sie über „Zurück“ zur Hauptansicht zurück – oder klicken Sie auf „Weiter“, wir übernehmen das für Sie.',
    attachTo: {
      element: '[data-tour-target="compare-back"]',
      on: 'bottom',
    },
    beforeShowPromise: async () => {
      await navigateTo('/algo');
      await waitForElement('[data-tour-target="compare-back"]');
    },
    advanceOn: {
      selector: '[data-tour-target="compare-back"]',
      event: 'click',
    },
    buttons: [exitButton, nextButton],
  });
  stepsAdded = true;

  if (hasResetButton) {
    tour.addStep({
      id: 'reset-bandit',
      title: 'Simulation zurücksetzen',
      text: 'Setzen Sie Ihre Simulation zurück, um einen neuen Durchlauf zu starten, oder beenden Sie die Tour über „Fertig“.',
      attachTo: {
        element: '[data-tour-target="reset-bandit"]',
        on: 'left',
      },
      beforeShowPromise: async () => {
        await navigateTo('/');
        await waitForElement('[data-tour-target="reset-bandit"]');
      },
      advanceOn: {
        selector: '[data-tour-target="reset-bandit"]',
        event: 'click',
      },
      buttons: [exitButton, finishButton],
    });
    stepsAdded = true;
  }

  if (!stepsAdded) {
    return null;
  }

  tour.on('complete', () => {
    shepherdTour.value = null;
  });

  tour.on('cancel', () => {
    shepherdTour.value = null;
  });

  return tour;
}

async function startInteractiveIntroduction() {
  if (banditStore.banditInProgress) {
    alert('Bitte setzen Sie die laufende Simulation zurück, bevor Sie die Einführung starten.');
    return;
  }

  const banditToggleGroup = document.querySelector('[data-tour-target="bandit-toggle-group"]');

  if (!banditToggleGroup) {
    alert('Die Navigation zur Bandit-Auswahl wurde nicht gefunden. Bitte laden Sie die Seite neu und versuchen Sie es erneut.');
    return;
  }

  showInstructionModal.value = false;
  await nextTick();

  destroyTour();

  const tour = createInteractiveTour();

  if (!tour) {
    alert('Die interaktive Einführung konnte nicht gestartet werden. Bitte versuchen Sie es erneut.');
    return;
  }

  shepherdTour.value = tour;

  try {
    tour.start();
  } catch (error) {
    console.error('Shepherd tour failed to start', error);
    alert('Die interaktive Einführung konnte nicht gestartet werden. Bitte versuchen Sie es erneut.');
    destroyTour();
  }
}

// open stock manager modal
function onEditStock() {
  showStockManager.value = true;
}

// Local state for stock selection in modal
const selectedStockIndexes = ref<number[]>([]);

// Sync modal selection with store when modal opens
watch(showStockManager, (open) => {
  if (open) {
    selectedStockIndexes.value = [...banditStore.selectedStocks.map(stock => stock.stock.id)];
  }
});

// Toggle selection in modal
function toggleStock(stockId: number) {
  const idx = selectedStockIndexes.value.indexOf(stockId);
  if (idx === -1) {
    selectedStockIndexes.value.push(stockId);
  } else {
    selectedStockIndexes.value.splice(idx, 1);
  }
}

// Save selection to store
function saveStocks() {
  banditStore.selectedStocks = [];

  selectedStockIndexes.value.forEach(stockId => {
    const stock: Stock | undefined = stockList.find(s => s.id === stockId);

    if (!stock) {
      alert('Fehler beim Speichern des Portfolios. Bitte versuchen Sie es erneut.');
      // TODO: fehlerbehandlung
      return; // Stop processing if stock is not found
    }

    const selectedStock: selectedStock = {
      stock,
      bernoulli_param: generateBernoulliParam(),
      gaussian_param: generateGaussianParam(),
    };

    banditStore.selectedStocks.push(selectedStock);
  });

  showStockManager.value = false;
}


// ----------------------- invest in stock (bandit run) -----------------------

function onInvest(stock: selectedStock) {
  // Check if bandit is already in progress and set flag if not
  if (!banditStore.banditInProgress) {
    banditStore.banditInProgress = true;
  }
  
  // Trigger bandit algorithm
  banditStore.pullArm(banditStore.activeBandit, stock)
}

const tableHeaders: Ref<Header[]> = computed(() => {
  if (banditStore.activeBandit === 'bernoulli') {
    return [{'x': "Investment"}, {'stock': "Aktie"}, {'banditResult': "Gewonnen"}] as Header[];
  } else if (banditStore.activeBandit === 'gaussian') {
    return [{'x': "Investment"}, {'stock': "Aktie"}, {'portfolioValue': "Portfolio-Stand"}, {'banditResult': "Ergebnis (€)"}] as Header[];
  } else {
    return [] as Header[];
  }
});
const tableRows = computed(() => banditStore.displayData as unknown as Row[]);

const investmentsDisplayCount = computed(() =>
  banditStore.banditInProgress
    ? banditStore.remainingInvestments
    : banditStore.possibleInvestments
);

const resetBandit = () => {
  banditStore.resetBandit();
  algorithmStore.resetAlgorithms();
}

</script>

<template>
  <div class="home-view">
    <!-- Headbar -->
    <div class="main-home-headbar">
      <div class="text-nav-button-group" data-tour-target="bandit-toggle-group">
        <div v-for="bandit in banditStore.bandits" class="text-nav-button" :key="bandit.key"
          :class="{ active: banditStore.activeBandit === bandit.key }" @click="onBanditChange(bandit.key)">
          {{ bandit.name }}
        </div>
      </div>
      <button
        type="button"
        class="main-home-headbar-theory-button"
        @click="showInstructionModal = true"
      >
        <span>Anleitung</span>
        <span class="material-symbols-outlined">info</span>
      </button>
    </div>
    <!-- Content -->
    <div class="home-view-content">
      <!-- Main Content -->
      <div class="main-home-view">
        <div class="diagramm-headbar">
          <div class="portfolio-box">
            <div class="portfolio-box-title" v-if="banditStore.activeBandit !== 'bernoulli'">
              Portfolio
            </div>
            <div class="portfolio-box-title" v-if="banditStore.activeBandit === 'bernoulli'">
              Investments
            </div>
            <div class="portfolio-box-title" v-if="banditStore.activeBandit !== 'bernoulli'">
              {{ Math.round(banditStore.currentCapital * 100) / 100 }} €
            </div>
            <div class="portfolio-box-subtitle" v-if="banditStore.activeBandit === 'bernoulli'">
              Gewonnen: {{ banditStore.bernoutliPortfolioSubtitle }} ({{ ((banditStore.bernoutliPortfolioSubtitle / banditStore.investments.length) * 100) | 0}} %)
            </div>
            <div class="portfolio-box-subtitle" v-if="banditStore.activeBandit === 'gaussian'">
              <span class="material-symbols-outlined" style="color: green;" v-if="banditStore.gaussianPortfolioSubtitle > 0">
                north_east
              </span>
              <span class="material-symbols-outlined" v-if="banditStore.gaussianPortfolioSubtitle == 0">
                east
              </span>
              <span class="material-symbols-outlined" style="color: red;" v-if="banditStore.gaussianPortfolioSubtitle < 0">
                south_east
              </span>
              &nbsp;
              {{ banditStore.gaussianPortfolioSubtitle }} €
              (
                {{
                  banditStore.investments.length > 0
                    ? (((banditStore.currentCapital - banditStore.startingCapital) / banditStore.startingCapital) * 100).toFixed(1) + ' %'
                    : '0 %'
                }}
              )
            </div>
          </div>
          <div class="capital-box">
            <div class="capital-box-row" v-if="false">
              <div>
                Startkapital:
              </div>
              <div>
                {{ banditStore.startingCapital }} €
              </div>
            </div>
            <div class="capital-box-row" v-if="false">
              <div>
                Restkapital:
              </div>
              <div>
                {{ Math.round(banditStore.remainingCapital * 100) / 100 }} €
              </div>
            </div>
            <div class="capital-box-row">
              <div>Investments:</div>
              <div class="capital-invest-counter">
                <button class="capital-invest-counter-button" @click="banditStore.possibleInvestments = banditStore.possibleInvestments - 2" :disabled="banditStore.possibleInvestments <= 2" v-if="banditStore.banditInProgress === false">
                  <img src="../assets/minus.svg" alt="Plus" width="20" height="20" />
                </button>
                <div>
                  {{ investmentsDisplayCount }}
                </div>
                <button
                  class="capital-invest-counter-button"
                  @click="banditStore.possibleInvestments  = banditStore.possibleInvestments + 2"
                  :disabled="banditStore.possibleInvestments >= 100"
                  v-if="banditStore.banditInProgress === false"
                  data-tour-target="increase-investments"
                >
                  <img src="../assets/add.svg" alt="Minus" width="20" height="20" />
                </button>
              </div>
            </div>
            <div class="capital-box-row" v-if="banditStore.activeBandit !== 'bernoulli'">
              <div>
                Per Investment:
              </div>
              <div>
                {{ Math.round(banditStore.investmentStep * 100) / 100 }} €
              </div>
            </div>
          </div>
        </div>
        <!-- Hier das Diagramm für den Bandit -->
        <div class="diagramm" ref="diagrammRef">
          <MainChart :data="banditStore.displayData" :activeBandit="banditStore.activeBandit"/>
        </div>
          <!-- Hier die Tabelle für den Bandit-->
        <div class="table">
          <MainTable :headers="tableHeaders" :rows="tableRows"></MainTable>
        </div>
        <!-- Hier aufklapp ding für die Theorie  -->
        <div class="theory-section">
          <button type="button" class="theory-toggle" @click="isTheoryOpen = !isTheoryOpen">
            <span>Theorie</span>
            <span class="material-symbols-outlined" :class="{ rotated: isTheoryOpen }">
              expand_more
            </span>
          </button>
          <div v-if="isTheoryOpen" class="theory-content">
            <p
              v-for="(paragraph, index) in theoryContent"
              :key="index"
              v-html="paragraph"
            ></p>
          </div>
        </div>
      </div>
      <!-- Sidebar -->
      <div class="sidebar-home-view">
        <div class="sidebar-portfolio">
          <h3>Aktien im Portfolio</h3>
          <div class="sidebar-portfolio-controls">
            <button class="white-button" @click="onEditStock" :disabled="banditStore.banditInProgress" data-tour-target="open-portfolio-manager">Aktienportfolio verwalten</button>
            <button
              class="white-button button-red"
              @click="resetBandit"
              :disabled="!banditStore.banditInProgress"
              data-tour-target="reset-bandit"
            >Zurücksetzen</button>
          </div>
          <div class="portfolio-item" v-for="selectedStock in banditStore.selectedStocks" :key="selectedStock.stock.name">
            <img :src="selectedStock.stock.logo_url" alt="Logo" class="portfolio-item-logo" />
            <div class="portfolio-item-info">
              <div class="portfolio-item-title">{{ selectedStock.stock.name }}</div>
              <div class="portfolio-item-price">{{ selectedStock.stock.price }} €</div>
            </div>
            <button
              class="portfolio-item-button"
              @click="onInvest(selectedStock)"
              :disabled="!banditStore.isInvestmentPossible"
              :data-tour-target="selectedStock === banditStore.selectedStocks[0] ? 'invest-button' : undefined"
            >
              Investieren
            </button>
          </div>
          <div class="sidebar-portfolio-controls">
            <button
              class="white-button"
              @click="onCompareAlgorithms"
              data-tour-target="navigate-compare"
            >Vergleich mit weiteren Algorithmen</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <Modal
    v-model="showInstructionModal"
    :close-on-backdrop="true"
    :close-on-esc="true"
  >
    <template #header>
      <h2 class="modal__title">Anleitung</h2>
    </template>
    <div class="instruction-modal-content">
      <div class="instruction-scenario">
        <p>
          Willkommen im Investmentlabor! In diesem Szenario übernehmen Sie die Rolle einer Analystin, die mit begrenzten Ressourcen das beste Anlageinstrument für das aktuelle Marktumfeld finden soll.
        </p>
        <ul class="instruction-scenario__highlights">
          <li>Sie wählen zwischen einem Gaussian- und einem Bernoulli-Bandit – je nach Art des erwarteten Rewards.</li>
          <li>Ihr Budget verteilt sich auf mehrere Investments, die Sie flexibel anpassen können.</li>
          <li>Das Ziel ist es, durch geschicktes Ausprobieren und Ausnutzen die renditestärkste Aktie zu identifizieren.</li>
        </ul>
        <p>
          Wenn Sie bereit sind, startet eine interaktive Einführung direkt in der Anwendung. Dabei werden die wichtigsten Elemente hervorgehoben und Sie kommen nur durch echte Interaktion weiter.
        </p>
      </div>
    </div>
    <template #footer>
      <div class="instruction-modal-footer">
        <button
          class="white-button"
          type="button"
          @click="showInstructionModal = false"
        >
          Schließen
        </button>
        <button
          class="white-button"
          type="button"
          @click="startInteractiveIntroduction"
        >
          Interaktive Einführung starten
        </button>
      </div>
    </template>
  </Modal>
  <Modal
    v-model="showStockManager"
    :close-on-backdrop="true"
    :close-on-esc="true"
    data-tour-target="portfolio-manager-modal"
  >
    <template #header>
      <h2 class="modal_stockManager_title">Portfolio bearbeiten</h2>
    </template>
    <div>
      <div>
        Hier können Sie Ihr Aktienportfolio verwalten. Wählen Sie aus der Liste der verfügbaren Aktien diejenigen aus, die Sie in Ihr Portfolio aufnehmen möchten.
      </div>
      <div class="modal-stocklist">
        <div class="portfolio-item" v-for="stock in stockList" :key="stock.name">
          <img :src="stock.logo_url" alt="Logo" class="portfolio-item-logo" />
          <div class="portfolio-item-info">
            <div class="portfolio-item-title">
              {{ stock.name }}
            </div>
            <div class="portfolio-item-price">
              <div>{{ stock.price }} €</div>
            </div>
          </div>
          <input
            type="checkbox"
            class="portfolio-item-checkbox"
            :checked="selectedStockIndexes.includes(stock.id)"
            @change="toggleStock(stock.id)"
          />
        </div>
      </div>
      <div>
        Nachdem Sie Ihre Auswahl getroffen haben, klicken Sie auf "Speichern", um die Änderungen zu übernehmen, oder auf "Abbrechen", um ohne Änderungen zurückzukehren.
      </div>
    </div>
    <template #footer>
      <div class="modal_stockManager_footer">
        <button class="white-button button-red" type="button" @click="showStockManager = false">Abbrechen</button>
        <button class="white-button" type="button" @click="saveStocks" data-tour-target="portfolio-manager-save">Speichern</button>
      </div>
    </template>
  </Modal>
</template>
<style scoped>
/* Base layout */
.home-view {
  display: flex;
  max-width: 1500px;
  width: 100%;
  flex-direction: column;
}

.main-home-view {
  flex: 3;
  padding: 1rem;
  /* background-color: aqua; */
}

.sidebar-home-view {
  /* background-color: lightpink; */
  flex: 1;
  padding: 1rem;
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: end;
}

.home-view-content {
  display: flex;
  flex-direction: row;
  height: 100%;
  width: 100%;
}

/* Headbar */
.main-home-headbar {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: end;
  margin-bottom: 1rem;
}

.main-home-headbar-theory-button {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: bold;
  font-size: x-large;
  background: transparent;
  border: none;
  color: inherit;
  padding: 0;
  font-family: inherit;
}

/* Main Content */
.capital-box-row {
  color: var(--text-primary);
  font-weight: bold;
  font-size: x-large;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
  gap: 0.5rem;
}

.capital-invest-counter {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}

.capital-invest-counter-button {
  background-color: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
}


.diagramm-headbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.portfolio-box-title {
  font-weight: bold;
  font-size: xx-large;
}

.portfolio-box-subtitle {
  margin-top: 0.25rem;
  font-size: x-large;
  display: flex;
  align-items: center;
  justify-content: start;
  flex-direction: row;
}

.capital-box {
  display: flex;
  flex-direction: column;
  align-items: end;
}

.diagramm {
  width: 100%;
  aspect-ratio: 2/1;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.theory-section {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.theory-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background-color: transparent;
  color: var(--text-primary);
  font-size: large;
  font-weight: bold;
  cursor: pointer;
}

.theory-toggle .material-symbols-outlined {
  transition: transform 0.2s ease;
}

.theory-toggle .material-symbols-outlined.rotated {
  transform: rotate(180deg);
}

.theory-content {
  padding: 1rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background-color: var(--background-secondary, rgba(255, 255, 255, 0.05));
  color: var(--text-primary);
}

.theory-content .math {
  font-family: 'Cambria', 'Times New Roman', serif;
  font-style: italic;
  display: block;
  margin: 0.5rem 0;
  text-align: center;
  white-space: normal;
}

.theory-content a {
  color: inherit;
  text-decoration: underline;
  font-weight: 600;
}


.table {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 0.5rem;
  margin-top: 1rem;
}

.table::-webkit-scrollbar {
  width: 6px;
}

.table::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 999px;
}

.table::-webkit-scrollbar-track {
  background-color: transparent;
}

/* Sidebar */
.sidebar-portfolio {
  width: 100%;
}

.portfolio-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: var(--text-secondary);
  padding: 0.5rem;
  border-radius: 10px;
  margin-top: 0.75rem;
}

.portfolio-item-logo {
  margin-left: 1rem;
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.portfolio-item-title {
  font-weight: bold;
  font-size: large;
}

.portfolio-item-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  align-items: start;
  margin-left: 1rem;
}

.portfolio-item-price {
  display: flex;
}

.portfolio-item-button {
  margin-right: 1rem;
  background-color: transparent;
  border: none;
  color: var(--text-primary);
  font-weight: bold;
  cursor: pointer;
}

.portfolio-item-button:hover {
  opacity: 0.7;
}

.portfolio-item-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.portfolio-item-checkbox {
  margin-right: 1rem;
  cursor: pointer;
}

.sidebar-portfolio-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  margin-bottom: 1rem;
  width: 100%;
}

/* Stock Manager Modal */
.modal_stockManager_footer {
  display: flex;
  gap: .5rem;
  justify-content: space-between;
  width: 100%;
}

.modal-stocklist {
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.instruction-modal-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.instruction-scenario {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.instruction-scenario__highlights {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-left: 1.2rem;
}

.instruction-scenario__highlights li {
  list-style: disc;
}

.instruction-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  width: 100%;
}
</style>
