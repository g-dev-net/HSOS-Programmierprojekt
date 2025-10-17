<script setup lang="ts">
import { computed, onBeforeMount, ref } from 'vue';
import { useBanditStore } from '@/stores/bandit';
import router from '@/router';
import { useAlgorithmStore } from '@/stores/algorithms';
import CompareChartReward from '@/components/CompareChartReward.vue';
import Modal from '@/components/Modal.vue';
import { comp_algos_bernoulli, comp_algos_gaussian } from '@/algorithms/compare_algos.ts';
import { getDefaultParams } from '@/stores/parameter_algos.ts';

// ----------------------- Stores -----------------------
const banditStore = useBanditStore();
const algorithmStore = useAlgorithmStore();

// ----------------------- Sidebar Toggles -----------------------
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

// ----------------------- Popup Modal Toggles -----------------------
const popupAlgoToggles = ref([
  { id: 'greedy', label: 'Greedy Algorithmus', show: ref(false) },
  { id: 'thompson', label: 'Thompson Sampling', show: ref(false) },
  { id: 'ucb', label: 'Upper Confidence Bound', show: ref(false) },
  { id: 'eGreedy', label: 'Epsilon-Greedy', show: ref(false) },
  { id: 'oiv', label: 'Optimistic Initial Values', show: ref(false) },
  { id: 'gradient', label: 'Gradient Bandit', show: ref(false) },
] as const);

type AlgorithmToggle = typeof algorithmToggles.value[number];

// ----------------------- Modal State -----------------------
const activeTheory = ref<AlgorithmToggle | null>(null);
const compareModalVisible = ref(false);
const globalRuns = ref(1000);

const popupExpanded = ref<Record<string, boolean>>({
  ucb: false,
  eGreedy: false,
  oiv: false,
  gradient: false,
});

const popupParams = ref<Record<string, Array<number>>>({
  ucb: [getDefaultParams().ucb],
  eGreedy: [getDefaultParams().eGreedy],
  oiv: [getDefaultParams().oiv],
  gradient: [getDefaultParams().gradient],
});

// ----------------------- Parameter Configuration -----------------------
const paramConfig = {
  ucb: { label: 'c-Wert', min: 0.1, max: 10, step: 0.1, placeholder: 'z.B. 2', maxFields: 5 },
  eGreedy: { label: 'Epsilon', min: 0.001, max: 1, step: 0.01, placeholder: 'z.B. 0.1', maxFields: 5 },
  oiv: { label: 'Initval', min: 0, max: 100, step: 1, placeholder: 'z.B. 5', maxFields: 5 },
  gradient: { label: 'Schritt', min: 0.001, max: 1, step: 0.01, placeholder: 'z.B. 0.1', maxFields: 5 },
} as const;

const showParamInput = (id: string) => id !== 'greedy' && id !== 'thompson';

const getParamLabel = (id: string) => paramConfig[id as keyof typeof paramConfig]?.label || 'Parameter';
const getMin = (id: string) => paramConfig[id as keyof typeof paramConfig]?.min || 0;
const getMax = (id: string) => paramConfig[id as keyof typeof paramConfig]?.max || 100;
const getStep = (id: string) => paramConfig[id as keyof typeof paramConfig]?.step || 1;
const getParamPlaceholder = (id: string) => paramConfig[id as keyof typeof paramConfig]?.placeholder || '';

const togglePopupExpand = (id: string) => {
  if (showParamInput(id)) {
    popupExpanded.value[id] = !popupExpanded.value[id];
  }
};

const addParamField = (id: string) => {
  const config = paramConfig[id as keyof typeof paramConfig];
  if (config && popupParams.value[id].length < config.maxFields) {
    popupParams.value[id].push(getMin(id));
  }
};

const removeLastParamField = (id: string) => {
  if (popupParams.value[id] && popupParams.value[id].length > 1) {
    popupParams.value[id].pop();
  }
};

// ----------------------- Modal Actions -----------------------
const theoryModalVisible = computed({
  get: () => activeTheory.value !== null,
  set: (value: boolean) => {
    if (!value) activeTheory.value = null;
  }
});

const openTheoryModal = (toggle: AlgorithmToggle) => {
  activeTheory.value = toggle;
};

const openCompareModal = () => {
  compareModalVisible.value = true;
};

const startComparison = () => {
  compareModalVisible.value = false;

  if (banditStore.activeBandit === 'bernoulli') {
    comp_algos_bernoulli();
  } else {
    comp_algos_gaussian();
  }
};

// ----------------------- Navigation -----------------------
const onNavBack = () => {
  router.push('/');
};

// ----------------------- Lifecycle -----------------------
onBeforeMount(() => {
  if (!algorithmStore.algorithmsCompleted && banditStore.banditInProgress) {
    algorithmStore.runAlgorithms();
  }
});


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
          <div style="margin-top: 1rem;">
            <button class="white-button" @click="openCompareModal">Vergleich Algorithmen Parameter</button>
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
  <Modal
    v-model="compareModalVisible"
    :close-on-backdrop="true"
    :close-on-esc="true"
  >
    <template #header>
      <div style="display: flex; flex-direction: column;">
        <h2 class="modal__title">Vergleich der eigenen Algorithmen</h2>
        <div style="font-size:1rem;">
      </div>
        Wähle die gewünschten Durchläufe sowie die gewünschten Iterationen aus. Für jeden Algorithmus kann (wenn verfügbar) der Parameter bis zu 5 Mal eingestellt werden.
        Wird "Plot" gedrückt, werden für alle über den Haken ausgewählte Algorithmen sowie den dafür eingetragenen Parametern ein Graph erstellt. Dieser stellt die "optimal actions",
        also die optimalen Aktionen, prozentual dar. Je mehr ausgewählt wird desto länger dauert das Plotten.
      </div>
    </template>
    <div class="theorie-modal-content">
      <!-- Durchläufe für alle Algorithmen -->
      <div class="algorithm-toggle-label" style="margin-bottom:1rem;">
        <label>
          <input
            type="number"
            min="1"
            max="10000"
            :step="1"
            v-model.number="globalRuns"
            placeholder="z.B. 1000"
          />
          unabhängige Durchläufe mit jeweils {{ globalRuns }} Iterationen.
        </label>
      </div>
      <div class="algorithm-toggle-group">
        <template v-for="toggle in popupAlgoToggles" :key="toggle.id">
          <div class="algorithm-toggle-row">
            <label class="algorithm-toggle-label" @click.stop>
              <input type="checkbox" v-model="toggle.show" />
            </label>
            <div
              class="algo-row-click"
              v-if="showParamInput(toggle.id)"
              @click="togglePopupExpand(toggle.id)"
            >
              <span>{{ toggle.label }}</span>
              <span class="material-symbols-outlined" :class="{ rotated: isOpen }">
              expand_more
            </span>
            </div>
            <div
              class="algo-row-click"
              v-else
            >
              <span>{{ toggle.label }}</span>
            </div>
          </div>
          <div v-if="popupExpanded[toggle.id]" class="algo-popup-options">
            <template v-if="showParamInput(toggle.id)">
              <div style="display:flex; align-items:center; gap:1.25rem;">
                <template v-for="(param, idx) in popupParams[toggle.id]" :key="idx">
                  <label>
                    {{ getParamLabel(toggle.id) }} {{ idx + 1 }}:
                    <input
                      type="number"
                      :min="getMin(toggle.id)"
                      :max="getMax(toggle.id)"
                      :step="getStep(toggle.id)"
                      v-model.number="popupParams[toggle.id][idx]"
                      :placeholder="getParamPlaceholder(toggle.id)"
                    />
                  </label>
                </template>
                <button
                v-if="popupParams[toggle.id].length < 5"
                  type="button"
                  class="add-param-btn"
                  @click="addParamField(toggle.id)"
                  title="Parameter hinzufügen"
                >+</button>
                
                <button
                  v-if="popupParams[toggle.id].length > 1"
                  type="button"
                  class="remove-param-btn"
                  @click="removeLastParamField(toggle.id)"
                  title="Letztes Feld entfernen"
                >&#10005;</button>
              </div>
            </template>
          </div>
        </template>
      </div>
    </div>
    <template #footer>
      <button class="white-button" type="button" @click="compareModalVisible = false">Schließen</button>
      <button class="white-button button-red" type="button" style="margin-left: 1rem;" @click="startComparison">Plot</button>
    </template>
  </Modal>
</template>
<style scoped>
/* ====================== Layout ====================== */
.home-view {
  display: flex;
  max-width: 1500px;
  width: 100%;
  flex-direction: column;
}

.home-view-content {
  display: flex;
  flex-direction: row;
  height: 100%;
  width: 100%;
}

.main-home-view {
  flex: 3;
  padding: 1rem;
}

.sidebar-home-view {
  flex: 1;
  padding: 1rem;
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: end;
}

/* ====================== Headbar ====================== */
.main-home-headbar {
  display: flex;
  flex-direction: row;
}

.navBackButton {
  height: fit-content;
}

.headbar-title {
  flex: 1;
  text-align: center;
  font-size: 1.25rem;
  font-weight: 600;
}

/* ====================== Diagram ====================== */
.diagramm {
  width: 100%;
  aspect-ratio: 2/1;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* ====================== Sidebar ====================== */
.sidebar-portfolio {
  width: 100%;
}

.algorithm-toggle-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.algorithm-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.algorithm-toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
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
  transition: opacity 0.2s ease;
}

.algorithm-info-button:hover,
.algorithm-info-button:focus-visible {
  opacity: 0.85;
}

/* ====================== Modal ====================== */
.theory-modal-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.algo-row-click {
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

.material-symbols-outlined {
  transition: transform 0.2s ease;
}

.material-symbols-outlined.rotated {
  transform: rotate(180deg);
}

/* ====================== Popup Options ====================== */
.algo-popup-options {
  border-radius: 6px;
  margin: 0.5rem 0 0.5rem 0.75rem;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: row;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.algo-popup-options label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.95rem;
}

.algo-popup-options input[type='number'] {
  padding: 0.25rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  min-width: 80px;
}

/* ====================== Buttons ====================== */
.add-param-btn,
.remove-param-btn {
  width: 25px;
  height: 25px;
  background: #e0eaff;
  border: 1px solid #b0c4de;
  color: #333;
  font-weight: bold;
  font-size: 1.3rem;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 0;
  box-sizing: border-box;
}

.add-param-btn {
  margin-left: 0.5rem;
}

.add-param-btn:hover {
  background: #cce0ff;
}

.remove-param-btn {
  margin-left: 3rem;
}

.remove-param-btn:hover {
  color: #c00;
}
</style>
