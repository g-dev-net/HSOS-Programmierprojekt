<script setup lang="ts">
import MainChart from '@/components/MainChart.vue';
import { computed, type Ref, ref, watch } from 'vue';
import { useBanditStore } from '@/stores/bandit';
import Modal from '@/components/Modal.vue';
import stocks from '@/data/aktien.json'
import { generateBernoulliParam, generateGaussianParam } from '@/assets/utils/banditHelpers';
import type { selectedStock, Stock } from '@/types/bandits';
import MainTable from '@/components/MainTable.vue';
import type { Header, Row } from '@/types/table';

// ----------------------- general setup -----------------------
const banditStore = useBanditStore();
const stockList = stocks as Stock[];
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

function onBanditChange(banditKey: string) {
  if (banditStore.banditInProgress) {
    alert('Der Bandit läuft bereits. Bitte setzen Sie den Bandit zurück, um den Algorithmus zu wechseln.');
    return;
  }
  banditStore.activeBandit = banditKey;
}

// ----------------------- stock management modal -----------------------
const showStockManager = ref(false);
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
      <div class="main-home-headbar-theory-button">
        <div>
          Theorie
        </div>
        <span class="material-symbols-outlined">open_in_new</span>
      </div>
    </div>
    <!-- Content -->
    <div class="home-view-content">
      <!-- Main Content -->
      <div class="main-home-view">
        <div class="diagramm-headbar">
          <div class="portfolio-box">
            <div class="portfolio-box-title">
              Portfolio
            </div>
            <div class="portfolio-box-title">
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
            <div class="capital-box-row">
              <div>
                Per Investment:
              </div>
              <div>
                {{ Math.round(banditStore.investmentStep * 100) / 100 }}
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
         <div>
          Theorie
         </div>
      </div>
      <!-- Sidebar -->
      <div class="sidebar-home-view">
        <div class="sidebar-portfolio">
          <h3>Aktien im Portfolio</h3>
          <div class="sidebar-portfolio-controls">
            <button class="white-button" @click="onEditStock" :disabled="banditStore.banditInProgress">Aktienportfolio verwalten</button>
            <button class="white-button button-red" @click="banditStore.resetBandit" :disabled="!banditStore.banditInProgress">Zurücksetzen</button>
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
        </div>
      </div>
    </div>
  </div>
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
  align-items: end;
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
  justify-content: center;
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