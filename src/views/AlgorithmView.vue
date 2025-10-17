<script setup lang="ts">
import { computed, nextTick, onBeforeMount, onMounted, ref, watch } from 'vue';
import { useBanditStore } from '@/stores/bandit';
import router from '@/router';
import { useAlgorithmStore } from '@/stores/algorithms';
import CompareChartReward from '@/components/CompareChartReward.vue';
import Modal from '@/components/Modal.vue';
import MathTex from '@/components/MathTex.vue';
import renderMathInElement from 'katex/contrib/auto-render';

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
    if (!value) activeTheory.value = null;
  }
});

function openTheoryModal(toggle: AlgorithmToggle) {
  activeTheory.value = toggle;
}

function onNavBack() {
  router.push('/');
}

onBeforeMount(() => {
  if (!algorithmStore.algorithmsCompleted && banditStore.banditInProgress) {
    algorithmStore.runAlgorithms();
  }
});

// KaTeX Inline Render im Modal
const theoryContentRef = ref<HTMLElement | null>(null);

function renderInlineMath() {
  if (!theoryContentRef.value) return;
  renderMathInElement(theoryContentRef.value, {
    delimiters: [
      { left: '\\(', right: '\\)', display: false },
      { left: '\\[', right: '\\]', display: true },
      { left: '$$', right: '$$', display: true }
    ],
    throwOnError: false
  });
}

onMounted(() => {
  renderInlineMath();
});

watch([activeTheory, theoryModalVisible], async () => {
  await nextTick();
  renderInlineMath();
});
</script>

<template>
  <div class="home-view">
    <!-- Headbar -->
    <div class="main-home-headbar">
      <RouterLink class="white-button navBackButton" to="/">Zurück</RouterLink>
      <div class="headbar-title">Vergleich mit Algorithmen</div>
    </div>

    <!-- Content -->
    <div class="home-view-content">
      <div class="main-home-view">
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

    <!-- Theorie Modal -->
    <Modal
      v-model="theoryModalVisible"
      :close-on-backdrop="true"
      :close-on-esc="true"
    >
      <template #header>
        <h2 class="modal__title">
          Theorie • {{ activeTheory ? activeTheory.theoryTitle : '' }}
        </h2>
      </template>

      <div class="theory-modal-content" ref="theoryContentRef">
        <!-- UCB -->
        <template v-if="activeTheory && activeTheory.id === 'ucb'">
          <h3 style="margin:.2rem 0 .35rem;">Kernprinzip</h3>
          <p style="margin:.25rem 0;">
            Upper Confidence Bound berechnet in Runde \(t\) für jeden Arm \(i\) einen UCB-Index.
          </p>

          <MathTex :display="true" expr="\mathrm{UCB}_t(i)=\hat{\mu}_t(i)+\mathrm{Bonus}_t(i)" />

          <p style="margin:.25rem 0;">
            \(\hat{\mu}_t(i)\) ist der aktuelle Schätzwert der durchschnittlichen Belohnung. \(\mathrm{Bonus}_t(i)\) ist der Konfidenzbonus, also der Aufschlag oberhalb des Schätzwerts. Der Bonus ist nicht die Obergrenze selbst, sondern der Abstand zwischen \(\hat{\mu}_t(i)\) und dem UCB-Index. Der Arm mit dem größten UCB-Index wird gezogen. Arme mit wenigen Beobachtungen erhalten größere Boni und werden dadurch häufiger ausprobiert. Gut bekannte Arme werden eher ausgenutzt. Mit mehr Daten schrumpft der Bonus und der UCB-Index nähert sich dem Schätzwert an.
          </p>

          <h3 style="margin:.4rem 0 .3rem;">Konkrete Bonusformeln</h3>

          <h4 style="margin:.2rem 0 .2rem;">Bernoulli Belohnungen in \([0,1]\)</h4>
          <MathTex :display="true" expr="\mathrm{UCB}_t(i)=\hat{\mu}_t(i)+\sqrt{\frac{2\ln t}{n_i(t)}}" />
          <p style="margin:.2rem 0;">Gilt für Belohnungen im Intervall \([0,1]\).</p>

          <h4 style="margin:.35rem 0 .2rem;">Gaussian Belohnungen mit bekannter \(\sigma\)</h4>
          <MathTex :display="true" expr="\mathrm{UCB}_t(i)=\hat{\mu}_t(i)+\sqrt{\frac{2\sigma^{2}\ln t}{n_i(t)}}" />
          <p style="margin:.2rem 0;">\(\sigma\) berücksichtigt die Streuung der Normalverteilung und skaliert die Unsicherheit.</p>

          <h3 style="margin:.45rem 0 .25rem;">Ablauf</h3>
          <ol style="margin:.2rem 0; padding-left:1rem;">
            <li><strong>Initialisierung</strong>: Jeden Arm mindestens einmal ziehen, damit \(\hat{\mu}_t(i)\) und \(n_i(t)\) definiert sind.</li>
            <li><strong>Iterative Auswahl</strong>:
              <ul style="margin:.1rem 0; padding-left:1rem;">
                <li>\(\hat{\mu}_t(i)\) schätzen und \(n_i(t)\) zählen</li>
                <li>\(\mathrm{UCB}_t(i)\) pro Arm berechnen</li>
                <li>Arm mit maximalem \(\mathrm{UCB}_t(i)\) wählen</li>
                <li>Belohnung beobachten und \(\hat{\mu}_t(i)\) sowie \(n_i(t)\) aktualisieren</li>
              </ul>
            </li>
            <li><strong>Stopp</strong>: Sobald alle Investments durchgeführt sind, endet der Prozess.</li>
          </ol>

          <h3 style="margin:.45rem 0 .25rem;">Warum funktioniert das?</h3>
          <p style="margin:.25rem 0;">
            Der UCB-Index ist so konstruiert, dass die wahre mittlere Armqualität mit hoher Wahrscheinlichkeit unter dieser oberen Konfidenzgrenze liegt. Durch das Maximieren des \(\mathrm{UCB}\) wird suboptimale Ausnutzung begrenzt und Exploration genau dort erzwungen, wo Unsicherheit hoch ist. In klassischen Multi Armed Bandit Einstellungen führt das zu Regret-Schranken mit logarithmischem Zeitwachstum.
          </p>

          <p class="theory-source">
            Quelle: Russo, Van Roy, Kazerouni, Osband, Wen. A Tutorial on Thompson Sampling, 2018.
          </p>
        </template>

        <!-- Greedy -->
        <template v-else-if="activeTheory && activeTheory.id === 'greedy'">
          <p>Hier kommt die Theorie zu Greedy. Kurz: immer den aktuell besten Arm wählen, keine Exploration.</p>
        </template>

        <!-- Thompson -->
        <template v-else-if="activeTheory && activeTheory.id === 'thompson'">
          <p>Hier kommt die Theorie zu Thompson Sampling. Kurz: Posterior ziehen und den Arm mit maximaler gezogener Belohnung spielen.</p>
        </template>

        <!-- Epsilon-Greedy -->
        <template v-else-if="activeTheory && activeTheory.id === 'eGreedy'">
          <p>Hier kommt die Theorie zu Epsilon Greedy. Kurz: mit Wahrscheinlichkeit \(\varepsilon\) explorieren, sonst ausnutzen.</p>
        </template>

        <!-- OIV -->
        <template v-else-if="activeTheory && activeTheory.id === 'oiv'">
          <p>Hier kommt die Theorie zu Optimistic Initial Values. Kurz: optimistische Startwerte forcen frühe Exploration.</p>
        </template>

        <!-- Gradient Bandit -->
        <template v-else-if="activeTheory && activeTheory.id === 'gradient'">
          <p>Hier kommt die Theorie zu Gradient Bandit. Kurz: Präferenzen updaten, Softmax Policy über Präferenzen.</p>
        </template>

        <!-- Nutzerergebnis -->
        <template v-else-if="activeTheory && activeTheory.id === 'user'">
          <p>Hier erklärst du das Nutzerergebnis und wie es mit den Algorithmen verglichen wird.</p>
        </template>

        <!-- Fallback -->
        <template v-else>
          <p>Der theoretische Inhalt wird hier bald verfügbar sein.</p>
        </template>
      </div>
    </Modal>
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
}

.sidebar-home-view {
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
  text-decoration: none;
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

.theory-source {
  margin-top: .35rem;
  font-size: .9rem;
  color: var(--muted, #666);
}

/* Schutz vor Global CSS auf Formeln */
:deep(.katex) {
  line-height: normal;
}
</style>
