<script setup lang="ts">
import MainChart from '@/components/MainChart.vue';
import { type Ref, ref } from 'vue';

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
            <div class="starting-capital">
              Startkapital: 10.000€
            </div>
            <div class="starting-capital">
              Restkapital: 10.000€
            </div>
            <div class="starting-capital">
              Investmens: 10
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
          <button>Neue Aktie hinzufügen</button>
          <div class="sidebar-portfolio-item">
            <!--<img src="../assets/AppleLogo.png" alt="Apple Logo" class="sidebar-portfolio-item-logo" />-->
            <svg height="44" viewBox="0 0 14 44" fill="white" width="14" xmlns="http://www.w3.org/2000/svg"
              class="sidebar-portfolio-item-logo">
              <path
                d="m13.0729 17.6825a3.61 3.61 0 0 0 -1.7248 3.0365 3.5132 3.5132 0 0 0 2.1379 3.2223 8.394 8.394 0 0 1 -1.0948 2.2618c-.6816.9812-1.3943 1.9623-2.4787 1.9623s-1.3633-.63-2.613-.63c-1.2187 0-1.6525.6507-2.644.6507s-1.6834-.9089-2.4787-2.0243a9.7842 9.7842 0 0 1 -1.6628-5.2776c0-3.0984 2.014-4.7405 3.9969-4.7405 1.0535 0 1.9314.6919 2.5924.6919.63 0 1.6112-.7333 2.8092-.7333a3.7579 3.7579 0 0 1 3.1604 1.5802zm-3.7284-2.8918a3.5615 3.5615 0 0 0 .8469-2.22 1.5353 1.5353 0 0 0 -.031-.32 3.5686 3.5686 0 0 0 -2.3445 1.2084 3.4629 3.4629 0 0 0 -.8779 2.1585 1.419 1.419 0 0 0 .031.2892 1.19 1.19 0 0 0 .2169.0207 3.0935 3.0935 0 0 0 2.1586-1.1368z">
              </path>
            </svg>
            <div class="sidebar-portfolio-item-info">
              <div class="sidebar-portfolio-item-title">
                Apple (AAPL)
              </div>
              <div class="sidebar-portfolio-item-price">
                <div>40€</div>
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
.starting-capital {
  color: var(--text-primary);
  font-weight: bold;
  font-size: x-large;
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
}

.sidebar-portfolio-item-logo {
  margin-left: 1rem;
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
}
</style>