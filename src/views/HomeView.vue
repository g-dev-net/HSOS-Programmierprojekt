<script setup lang="ts">
import MainChart from '@/components/MainChart.vue';
import { type Ref, ref, watch, computed } from 'vue';
import { useBanditStore } from '@/stores/bandit';
import Modal from '@/components/Modal.vue';
import stocks from '@/data/aktien.json'
import { generateBernoulliParam, generateGaussianParam } from '@/assets/utils/banditHelpers';
import type { selectedStock, Stock } from '@/types/bandits';
import MainTable from '@/components/MainTable.vue';
import router from '@/router';
import { useAlgorithmStore } from '@/stores/algorithms';
import type { Header, Row } from '@/types/table';

// ----------------------- general setup -----------------------
const banditStore = useBanditStore();
const algorithmStore = useAlgorithmStore();
const stockList = stocks as Stock[];
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
const bandits = [
  { name: 'Gaussian-Bandit', key: 'gaussian' },
  { name: 'Bernoulli-Bandit', key: 'bernoulli' },
];
const activeBandit: Ref<string> = ref(bandits[0].key);
const isTheoryOpen = ref(false);

const gaussianTheory = [
  `Der Gaussian Bandit, auch Gau&szlig;scher Bandit genannt, erweitert das klassische Bernoulli Modell, indem die Belohnungen nicht nur Erfolg oder Misserfolg sind, sondern kontinuierliche Werte annehmen. Jeder Arm i besitzt einen unbekannten Mittelwert &mu;<sub>i</sub> und eine Varianz &sigma;<sub>i</sub><sup>2</sup>, die beschreiben, wie sich die Belohnungen im Durchschnitt und in ihrer Streuung verhalten. Wenn Sie einen Arm ziehen, stammt die beobachtete Belohnung r<sub>t</sub> aus einer Normalverteilung, also <span class="math">r<sub>t</sub> &#8764; N(&mu;<sub>i</sub>, &sigma;<sub>i</sub><sup>2</sup>)</span>. Das bedeutet, dass die Ergebnisse zuf&auml;llig um den wahren Erwartungswert schwanken, wobei die Varianz bestimmt, wie stark diese Schwankungen sind.`,
  `Auch beim Gaussian Banditen geht es darum, &uuml;ber viele Versuche hinweg den Arm mit der h&ouml;chsten durchschnittlichen Belohnung zu finden. Da die Werte aber nicht bin&auml;r, sondern kontinuierlich sind, m&uuml;ssen Sie sowohl den Mittelwert als auch die Streuung jedes Arms fortlaufend sch&auml;tzen. Dadurch kann das Modell feinere Unterschiede zwischen den Armen erkennen und eignet sich f&uuml;r Szenarien, in denen nicht nur Ja/Nein Feedback existiert, sondern numerische Messwerte vorliegen &ndash; beispielsweise Umsatz, Klickrate oder Reaktionszeit.`,
  `Wie beim Bernoulli Banditen steht man auch hier vor dem Exploration Exploitation Dilemma. Algorithmen wie der Upper Confidence Bound (UCB) oder Thompson Sampling lassen sich ebenfalls anwenden, werden jedoch an die Normalverteilung angepasst, um die Unsicherheit der Sch&auml;tzungen zu ber&uuml;cksichtigen. Der Gaussian Bandit bietet damit ein realistischeres Modell f&uuml;r viele praktische Anwendungsf&auml;lle und wird h&auml;ufig in Forschung und Industrie eingesetzt. Falls Sie sich weitergehend mit den theoretischen Grundlagen und Algorithmen besch&auml;ftigen m&ouml;chten, k&ouml;nnen Sie dies in <a href="http://incompleteideas.net/book/RLbook2020.pdf" target="_blank" rel="noopener" style="color: white;">Reinforcement Learning: An Introduction von Sutton und Barto</a> nachlesen.`,
];

const bernoulliTheory = [
  `Der Bernoulli Bandit ist ein einfaches, aber sehr anschauliches Modell, um das Lernen durch Ausprobieren zu verstehen. Er besteht aus mehreren „Armen“, von denen jeder eine unbekannte Gewinnwahrscheinlichkeit p<sub>i</sub> ∈ [0,1] besitzt. Wenn Sie einen Arm ziehen, erhalten Sie entweder einen Erfolg (1) oder einen Misserfolg (0). Die Ergebnisse folgen somit einer Bernoulli Verteilung. Ziel ist es, &uuml;ber viele Z&uuml;ge hinweg herauszufinden, welcher Arm die h&ouml;chste Erfolgswahrscheinlichkeit hat, um langfristig die gr&ouml;&szlig;te Belohnung zu erzielen. Mathematisch l&auml;sst sich das so darstellen: Der Erwartungswert eines Arms i entspricht E[R<sub>i</sub>] = p<sub>i</sub>. Diese Wahrscheinlichkeiten sind zu Beginn unbekannt und m&uuml;ssen durch Ausprobieren gesch&auml;tzt werden.`,
  `Dabei entsteht das sogenannte Exploration Exploitation Dilemma: Sie m&uuml;ssen entscheiden, ob Sie weiterhin neue Arme testen (Exploration) oder den bisher besten Arm spielen (Exploitation). Bekannte Strategien, um dieses Problem zu l&ouml;sen, sind zum Beispiel der ε greedy Algorithmus, der Upper Confidence Bound (UCB) oder Thompson Sampling. Alle verfolgen das Ziel, ein gutes Gleichgewicht zwischen dem Erforschen neuer Optionen und dem Ausnutzen des bereits gewonnenen Wissens zu finden.`,
  `Durch seine einfache Struktur eignet sich der Bernoulli Bandit besonders gut f&uuml;r didaktische Simulationen, wie sie im Rahmen dieses Tools umgesetzt werden. Er vermittelt das Grundprinzip von Entscheidungsprozessen unter Unsicherheit und bildet die Basis f&uuml;r komplexere Modelle wie den Gaussian Bandit. Falls Sie sich noch tiefer mit der Theorie und den zugrunde liegenden Algorithmen besch&auml;ftigen m&ouml;chten, k&ouml;nnen Sie das in <a href="http://incompleteideas.net/book/RLbook2020.pdf" target="_blank" rel="noopener" style="color: white;">Reinforcement Learning: An Introduction von Sutton und Barto</a> nachlesen.`,
];




const theoryContent = computed<string[]>(() => (activeBandit.value === 'gaussian' ? gaussianTheory : bernoulliTheory));
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

const resetBandit = () => {
  banditStore.resetBandit();
  algorithmStore.resetAlgorithms();
}

</script>

<template>
  <div class="home-view">
    <!-- Headbar -->
    <div class="main-home-headbar">
      <div class="text-nav-button-group">
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
            <div class="capital-box-row">
              <div>
                Startkapital:
              </div>
              <div>
                {{ banditStore.startingCapital }} €
              </div>
            </div>
            <div class="capital-box-row">
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
                  {{ banditStore.possibleInvestments }}
                </div>
                <button class="capital-invest-counter-button" @click="banditStore.possibleInvestments  = banditStore.possibleInvestments + 2" :disabled="banditStore.possibleInvestments >= 100" v-if="banditStore.banditInProgress === false">
                  <img src="../assets/add.svg" alt="Minus" width="20" height="20" />
                </button>
              </div>
            </div>
            <!-- <div class="capital-box-row">
              <div>
                Per Investment:
              </div>
              <div>
                {{ Math.round(banditStore.investmentStep * 100) / 100 }}
              </div>
            </div> -->
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
            <button class="white-button" @click="onEditStock" :disabled="banditStore.banditInProgress">Aktienportfolio verwalten</button>
            <button class="white-button button-red" @click="resetBandit" :disabled="!banditStore.banditInProgress">Zurücksetzen</button>
          </div>
          <div class="portfolio-item" v-for="selectedStock in banditStore.selectedStocks" :key="selectedStock.stock.name">
            <img :src="selectedStock.stock.logo_url" alt="Logo" class="portfolio-item-logo" />
            <div class="portfolio-item-info">
              <div class="portfolio-item-title">{{ selectedStock.stock.name }}</div>
              <div class="portfolio-item-price">{{ selectedStock.stock.price }} €</div>
            </div>
            <button class="portfolio-item-button" @click="onInvest(selectedStock)" :disabled="!banditStore.isInvestmentPossible">
              Investieren
            </button>
          </div>
          <div class="sidebar-portfolio-controls">
            <button class="white-button" @click="onCompareAlgorithms">Vergleich mit weiteren Algorithmen</button>
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
      <p>Hier wird die Anleitung angezeigt.</p>
    </div>
    <template #footer>
      <button class="white-button" type="button" @click="showInstructionModal = false">Schließen</button>
    </template>
  </Modal>
  <Modal v-model="showStockManager" :close-on-backdrop="true" :close-on-esc="true">
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
        <button class="white-button" type="button" @click="saveStocks">Speichern</button>
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

</style>
