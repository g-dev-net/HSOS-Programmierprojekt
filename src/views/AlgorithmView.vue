<script setup lang="ts">
import { computed, onBeforeMount, ref } from 'vue';
import { useBanditStore } from '@/stores/bandit';
import router from '@/router';
import { useAlgorithmStore } from '@/stores/algorithms';
import CompareChartReward from '@/components/CompareChartReward.vue';
import Modal from '@/components/Modal.vue';

// ----------------------- general setup -----------------------
const banditStore = useBanditStore();
const algorithmStore = useAlgorithmStore();

const showUser = ref(true);
const showGreedy = ref(true);
const showThompson = ref(true);
const showUCB = ref(true);
const showEGreedy = ref(true);
const showOIV = ref(true);
const showGradient = ref(true);

const algorithmToggles = ref([
  { id: 'user', label: 'Nutzerergebnis', show: showUser, theoryTitle: 'Nutzerergebnis' },
  { id: 'greedy', label: 'Greedy Algorithmus', show: showGreedy, theoryTitle: 'Greedy Algorithmus' },
  { id: 'thompson', label: 'Thompson Sampling', show: showThompson, theoryTitle: 'Thompson Sampling' },
  { id: 'ucb', label: 'Upper Confidence Bound', show: showUCB, theoryTitle: 'Upper Confidence Bound' },
  { id: 'eGreedy', label: 'Epsilon-Greedy', show: showEGreedy, theoryTitle: 'Epsilon-Greedy' },
  { id: 'oiv', label: 'Optimistic Initial Values', show: showOIV, theoryTitle: 'Optimistic Initial Values' },
  { id: 'gradient', label: 'Gradient Bandit', show: showGradient, theoryTitle: 'Gradient Bandit' },
] as const);

type AlgorithmToggle = typeof algorithmToggles.value[number];

const activeTheory = ref<AlgorithmToggle | null>(null);

const theoryModalVisible = computed({
  get: () => activeTheory.value !== null,
  set: (value: boolean) => {
    if (!value) {
      activeTheory.value = null;
    }
  }
});

function openTheoryModal(toggle: AlgorithmToggle) {
  activeTheory.value = toggle;
}

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
      <div class="headbar-title">Vergleich mit Algorithmen</div>
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
            :dataEGreedy="algorithmStore.eGreedyDataPoints"
            :dataOIV="algorithmStore.oivDataPoints"
            :activeBandit="banditStore.activeBandit"
            :gradientDataPoints="algorithmStore.gradientDataPoints"
            :showUser="showUser"
            :showGreedy="showGreedy"
            :showThompson="showThompson"
            :showUCB="showUCB"
            :showEGreedy="showEGreedy"
            :showOIV="showOIV"
            :showGradient="showGradient"
          />
        </div>
      </div>
      <!-- Sidebar -->
      <div class="sidebar-home-view">
        <div class="sidebar-portfolio">
          <h3>Einstellungen</h3>
          <div class="algorithm-toggle-group">
            <div
              v-for="toggle in algorithmToggles"
              :key="toggle.id"
              class="algorithm-toggle-row"
            >
              <label class="algorithm-toggle-label">
                <input type="checkbox" v-model="toggle.show" />
                {{ toggle.label }}
              </label>
              <button
                type="button"
                class="algorithm-info-button"
                :aria-label="`Theorie zu ${toggle.label} anzeigen`"
                @click="openTheoryModal(toggle)"
              >
                ?
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <Modal
    v-model="theoryModalVisible"
    :close-on-backdrop="true"
    :close-on-esc="true"
  >
    <template #header>
      <h2 class="modal__title">
        Theorie - {{ activeTheory ? activeTheory.theoryTitle : '' }}
      </h2>
    </template>
    <div class="theory-modal-content">
      <p v-if="activeTheory">
        Der theoretische Inhalt zu {{ activeTheory.label }} wird hier bald verfügbar sein.
      </p>
    </div>
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

.headbar-title {
  flex: 1;
  text-align: center;
  font-size: 1.25rem;
  font-weight: 600;
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
  flex: 1;
}

.algorithm-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.algorithm-info-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: white;
  color: var(--text, black);
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.algorithm-info-button:hover,
.algorithm-info-button:focus-visible {
  opacity: 85%;
}

.theory-modal-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}


</style>
