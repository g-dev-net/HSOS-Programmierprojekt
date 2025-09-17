<script setup lang="ts">
import MainChart from '@/components/MainChart.vue';
import { type Ref, ref } from 'vue';
import stocks from '@/data/aktien.json';
import { useBanditStore } from '@/stores/bandit';

const banditStore = useBanditStore();

const algorithms = [
  { name: 'Gaussian-Bandit', key: 'gaussian' },
  { name: 'Bernoulli-Bandit', key: 'bernoulli' },
];

const activeAlgorithm: Ref<string> = ref(algorithms[0].key);

function onInvest() {
  console.log('Invest clicked');
}

function onAddStock() {
  console.log('Add stock clicked');
}

</script>

<template>
  <div class="home-view">
    <!-- Headbar -->
    <div class="main-home-headbar">
      <div class="text-nav-button-group">
        <div v-for="algo in algorithms" class="text-nav-button" :key="algo.key"
          :class="{ active: activeAlgorithm === algo.key }" @click="activeAlgorithm = algo.key">
          {{ algo.name }}
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
              10.000€
            </div>
            <div class="portfolio-box-subtitle">
              <span class="material-symbols-outlined">
                arrow_upward
              </span>
              200€(2%)
            </div>
          </div>
          <div class="capital-box">
            <div class="capital-box-row">
              <div>
                Startkapital:
              </div>
              <div>
                10.000€
              </div>
            </div>
            <div class="capital-box-row">
              <div>
                Restkapital:
              </div>
              <div>
                10.000€
              </div>
            </div>
            <div class="capital-box-row">
              <div>Investments:</div>
              <div class="capital-invest-counter">
                <button class="capital-invest-counter-button">
                  <img src="../assets/minus.svg" alt="Plus" width="20" height="20" />
                </button>
                <div>
                  10
                </div>
                <button class="capital-invest-counter-button">
                  <img src="../assets/add.svg" alt="Minus" width="20" height="20" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="diagramm" ref="diagrammRef">
          <MainChart :data="[0, 200, 400, 300, 0. -200, -100, 100, 0]" />
        </div>
        <div class="table">

        </div>
      </div>
      <!-- Sidebar -->
      <div class="sidebar-home-view">
        <div class="sidebar-portfolio">
          <h3>Aktien im Portfolio</h3>
          <div class="sidebar-portfolio-controls">
            <button class="sidebar-portfolio-controls-button">Aktienportfolio verwalten</button>
            <button class="sidebar-portfolio-controls-button button-red" disabled>Zurücksetzen</button>
          </div>
          <div class="sidebar-portfolio-item" v-for="stock in banditStore.selectedStocksData" :key="stock.name">
            <img :src="stock.logo_url" alt="Logo" class="sidebar-portfolio-item-logo" />
            <div class="sidebar-portfolio-item-info">
              <div class="sidebar-portfolio-item-title">
                {{ stock.name }}
              </div>
              <div class="sidebar-portfolio-item-price">
                <div>{{ stock.price }} €</div>
              </div>
            </div>
            <button class="sidebar-portfolio-item-button" @click="onInvest">
              Investieren
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
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

.sidebar-portfolio-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: var(--text-secondary);
  padding: 0.5rem;
  border-radius: 10px;
  margin-top: 0.75rem;
}

.sidebar-portfolio-item-logo {
  margin-left: 1rem;
  width: 32px;      /* maximale Breite */
  height: 32px;     /* maximale Höhe */
  object-fit: contain;
}

.sidebar-portfolio-item-title {
  font-weight: bold;
  font-size: large;
}

.sidebar-portfolio-item-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  align-items: start;
  margin-left: 1rem;
}

.sidebar-portfolio-item-price {
  display: flex;
}

.sidebar-portfolio-item-button {
  margin-right: 1rem;
  background-color: transparent;
  border: none;
  color: var(--text-primary);
  font-weight: bold;
  cursor: pointer;
}

.sidebar-portfolio-item-button:hover {
  opacity: 0.7;
}

.sidebar-portfolio-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  width: 100%;
}

.sidebar-portfolio-controls-button {
  background-color: white;
  border: none;
  color: black;
  font-weight: bold;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
}

.sidebar-portfolio-controls-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button-red {
  background-color: red !important;
  color: white !important;
}

</style>