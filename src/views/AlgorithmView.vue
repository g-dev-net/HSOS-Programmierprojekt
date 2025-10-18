<script setup lang="ts">
import { computed, onBeforeMount, ref } from 'vue';
import { useBanditStore } from '@/stores/bandit';
import router from '@/router';
import { useAlgorithmStore } from '@/stores/algorithms';
import CompareChartReward from '@/components/CompareChartReward.vue';
import CompareResultChart from '@/components/CompareResultChart.vue';
import Modal from '@/components/Modal.vue';
import { comp_algos_bernoulli, comp_algos_gaussian, type CompareResult } from '@/algorithms/compare_algos.ts';
import { addAlgorithmParam, removeAlgorithmParam, getAlgorithmParams, setParamAlgo } from '@/stores/parameter_algos.ts';
// import { algorithmParam } from '@/stores/parameter_algos.ts';

// ----------------------- Stores -----------------------
const banditStore = useBanditStore();
const algorithmStore = useAlgorithmStore();

const popupParams = computed(() => getAlgorithmParams());

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
  { id: 'greedy', label: 'Greedy Algorithmus', show: false },
  { id: 'thompson', label: 'Thompson Sampling', show: false },
  { id: 'ucb', label: 'Upper Confidence Bound', show: false },
  { id: 'eGreedy', label: 'Epsilon-Greedy', show: false },
  { id: 'oiv', label: 'Optimistic Initial Values', show: false },
  { id: 'gradient', label: 'Gradient Bandit', show: false },
]);

type AlgorithmToggle = typeof algorithmToggles.value[number];

// ----------------------- Modal State -----------------------
const activeTheory = ref<AlgorithmToggle | null>(null);
const compareModalVisible = ref(false);
const loadingModalVisible = ref(false);
const plottedComparison = ref(false);
const compareResults = ref<CompareResult[]>([]);
const cancelCalculation = ref(false);
const progressStatus = ref({
  currentAlgorithm: '',
  currentParameter: 0,
  totalParameters: 0,
  currentRun: 0,
  totalRuns: 0,
  percentage: 0
});

const popupExpanded = ref<Record<string, boolean>>({
  ucb: false,
  eGreedy: false,
  oiv: false,
  gradient: false,
});

// ----------------------- Parameter Configuration -----------------------
const paramConfig = {
  ucb: { label: 'c-Wert', min: 0.1, max: 10, step: 0.1, default: setParamAlgo('ucb'), placeholder: 'z.B. 2', maxFields: 5 },
  eGreedy: { label: 'Epsilon', min: 0, max: 1, step: 0.01, default: setParamAlgo('eGreedy'), placeholder: 'z.B. 0.1', maxFields: 5 },
  oiv: { label: 'Initval', min: 0, max: 100, step: 1, default: setParamAlgo('OIV'), placeholder: 'z.B. 5', maxFields: 5 },
  gradient: { label: 'Schritt', min: 0, max: 1, step: 0.01, default: setParamAlgo('gradient'), placeholder: 'z.B. 0.1', maxFields: 5 },
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
  const params = popupParams.value[id];
  if (config && params.length < config.maxFields) {
    // Default-Wert als Basis, dann Default + n*step
    const base = config.placeholder?.startsWith('z.B.') ? Number(config.placeholder.replace('z.B.', '').trim()) : config.min;
    const defaultValue = config.default ?? config.min;
let newValue = +(defaultValue + params.length * config.step).toFixed(10);
    // Falls Wert schon vorhanden, weiterzählen
    while (params.includes(newValue) && newValue <= config.max) {
      newValue = +(newValue + config.step).toFixed(10);
    }
    if (newValue <= config.max) {
      addAlgorithmParam(id, newValue, params.length);
    }
  }
};

function onParamInput(event: Event, algoId: string, idx: number) {
  const value = Number((event.target as HTMLInputElement).value);
  const min = getMin(algoId);
  const max = getMax(algoId);
  if (!isNaN(value) && value >= min && value <= max) {
    // Setze Wert im globalen Store
    addAlgorithmParam(algoId, value, idx);
  }
  // Wenn Feld gelöscht, Wert entfernen
  if ((event.target as HTMLInputElement).value === '') {
    removeAlgorithmParam(algoId, idx);
  }
}

const removeLastParamField = (id: string) => {
  if (popupParams.value[id] && popupParams.value[id].length > 1) {
    removeAlgorithmParam(id, popupParams.value[id].length - 1);
  }
};

// ----------------------- Modal Actions -----------------------
let globalIterations = ref(150);
let globalRuns = ref(150);
let globalArmCount = ref(7);

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
  loadingModalVisible.value = false;
  plottedComparison.value = false;
};

const startComparison = () => {
  runPopupActions();
  compareModalVisible.value = false;
}

// Führt alle im Popup beschriebenen Aktionen aus
function runPopupActions() {

  // 1. Ermittle alle ausgewählten Algorithmen im Popup
  const selectedAlgos = popupAlgoToggles.value.filter(a => a.show);
  
  if (selectedAlgos.length === 0) {
    alert('Bitte wähle mindestens einen Algorithmus aus.');
    return;
  }
  
  // 2. Ermittle die Anzahl der Durchläufe
  const runs = globalRuns.value;
  const iterations = globalIterations.value;
  const armCount = globalArmCount.value;
  
  // 3. Führe die Vergleichs-Logik aus
  startComparisonWait(selectedAlgos, runs, iterations, armCount);
};

const startComparisonWait = async (selectedAlgos: any[], runs: number, iterations: number, armCount: number) => {
  loadingModalVisible.value = true;
  cancelCalculation.value = false;
  progressStatus.value = { currentAlgorithm: '', currentParameter: 0, totalParameters: 0, currentRun: 0, totalRuns: 0, percentage: 0 };
  
  const progressCallback = (status: typeof progressStatus.value) => {
    progressStatus.value = { ...status };
  };
  
  try {
    let results: CompareResult[] = [];
    algorithmStore.algorithmsCompare = true;
    if (banditStore.activeBandit === 'bernoulli') {
      results = await comp_algos_bernoulli(selectedAlgos, runs, iterations, popupParams.value, armCount, cancelCalculation, progressCallback);
    } else {
      results = await comp_algos_gaussian(selectedAlgos, runs, iterations, popupParams.value, armCount, cancelCalculation, progressCallback);
    }
    algorithmStore.algorithmsCompare = false;
    // Falls abgebrochen, nicht anzeigen
    if (cancelCalculation.value) {
      loadingModalVisible.value = false;
      compareModalVisible.value = true;
      plottedComparison.value = false;
      return;
    }
    console.log('Comparison results:', results.length, 'algorithms');
    console.log('First result sample:', results[0]);
    compareResults.value = results;
    loadingModalVisible.value = false;
    compareModalVisible.value = false;
    plottedComparison.value = true;
  } catch (error) {
    console.error('Fehler beim Plotten:', error);
    loadingModalVisible.value = false;
    alert('Fehler beim Erstellen des Plots. Bitte versuche es erneut.');
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
            max="750"
            :step="1"
            v-model.number="globalRuns"
            placeholder="z.B. 150"
          />
          unabhängige Durchläufe mit jeweils 
          <input
            type="number"
            min="1"
            max="750"
            :step="1"
            v-model.number="globalIterations"
            placeholder="z.B. 150"
          />
          Iterationen. Arme:
          <input
            type="number"
            min="1"
            max="10"
            :step="1"
            v-model.number="globalArmCount"
            placeholder="z.B. 7"
          />
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
            <span class="material-symbols-outlined" :class="{ rotated: popupExpanded[toggle.id] }">
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
                      :placeholder="idx === 0 ? '' : (getMin(toggle.id) + idx * getStep(toggle.id)).toFixed(3)"
                      :value="param"
                      @input="onParamInput($event, toggle.id, idx)"
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
  <Modal v-model="loadingModalVisible" :close-on-backdrop="false" :close-on-esc="false">
    <template #header>
      <h2>Berechnung läuft...</h2>
    </template>
    <div class="progress-container">
      <div class="progress-info">
        <strong>{{ progressStatus.currentAlgorithm }}</strong>
        <span v-if="progressStatus.currentParameter > 0"> (Parameter {{ progressStatus.currentParameter }}/{{ progressStatus.totalParameters }})</span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar-fill" :style="{ width: progressStatus.percentage + '%' }"></div>
      </div>
      <div class="progress-details">
        Run {{ progressStatus.currentRun }}/{{ progressStatus.totalRuns }} - {{ progressStatus.percentage.toFixed(1) }}%
      </div>
    </div>
    <template #footer>
      <button class="white-button button-red" type="button" @click="cancelCalculation = true">Abbrechen</button>
    </template>
  </Modal>
  <Modal v-model="plottedComparison" :close-on-backdrop="true" :close-on-esc="true">
    <template #header>
      <h2 class="modal__title">Algorithmen-Vergleich: Optimale Aktionen</h2>
    </template>
    <div class="comparison-chart-container">
      <CompareResultChart v-if="compareResults.length > 0" :results="compareResults" />
    </div>
    <template #footer>
      <button class="white-button" type="button" @click="plottedComparison = false">Schließen</button>
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

/* ====================== Comparison Chart ====================== */
.comparison-chart-container {
  width: 100%;
  max-width: 100%; /* oder 100% für volle Breite */
  min-height: 400px;
  margin: 0 auto; /* zentriert im Modal */
  padding: 0;     /* kein extra Padding */
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  overflow: visible; /* kein Scrollen */
}
</style>
