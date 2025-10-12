<script setup lang="ts">
import { onBeforeMount, ref } from 'vue';
import { useBanditStore } from '@/stores/bandit';
import router from '@/router';
import { useAlgorithmStore } from '@/stores/algorithms';
import CompareChartReward from '@/components/CompareChartReward.vue';

// ----------------------- general setup -----------------------
const banditStore = useBanditStore();
const algorithmStore = useAlgorithmStore();

const showUser = ref(true);
const showGreedy = ref(true);
const showThompson = ref(true);
const showUCB = ref(true);

function onNavBack() {
  router.push('/')
}

onBeforeMount(() => {
  if (!algorithmStore.algorithmsCompleted && banditStore.banditInProgress) {
    algorithmStore.runAlgorithms();
  }
})

</script>

<template>
  <div class="home-view">
    <!-- Headbar -->
    <div class="main-home-headbar">
      <button class="white-button navBackButton" @click="onNavBack">Zurück</button>
      <div>Vergleich mit Algorithmen</div>
    </div>
    <!-- Content -->
    <div class="home-view-content">
      <!-- Main Content -->
      <div class="main-home-view">
        
        <!-- Hier das Diagramm für den Bandit -->
        <div class="diagramm" ref="diagrammRef">
          <CompareChartReward 
            :dataUCB="algorithmStore.upperConfidenceBoundDataPoints"
            :dataGreedy="algorithmStore.greedyDataPoints" 
            :dataThompson="algorithmStore.thompsonSamplingDataPoints"
            :dataUser="banditStore.displayData" 
            :activeBandit="banditStore.activeBandit"
            :showUser="showUser"
            :showGreedy="showGreedy"
            :showThompson="showThompson"
            :showUCB="showUCB"/>
        </div>
      </div>
      <!-- Sidebar -->
      <div class="sidebar-home-view">
        <div class="sidebar-portfolio">
          <h3>Einstellungen</h3>
          <div class="algorithm-toggle-group">
            <label class="algorithm-toggle-label">
              <input type="checkbox" v-model="showUser" />
              Nutzerergebnis
            </label>
            <label class="algorithm-toggle-label">
              <input type="checkbox" v-model="showGreedy" />
              Greedy Algorithmus
            </label>
            <label class="algorithm-toggle-label">
              <input type="checkbox" v-model="showThompson" />
              Thompson Sampling
            </label>
            <label class="algorithm-toggle-label">
              <input type="checkbox" v-model="showUCB" />
              Upper Confidence Bound
            </label>
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
}

.navBackButton {
  height: fit-content;
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

.algorithm-toggle-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.algorithm-toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}


</style>
