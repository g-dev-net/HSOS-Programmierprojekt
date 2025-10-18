<script setup lang="ts">
import { computed, nextTick, onBeforeMount, onMounted, ref, watch, type Ref } from 'vue';
import { useBanditStore } from '@/stores/bandit';
import router from '@/router';
import { useAlgorithmStore } from '@/stores/algorithms';
import CompareChartReward from '@/components/CompareChartReward.vue';
import CompareChartAccuracy from '@/components/CompareChartAccuracy.vue';
import Modal from '@/components/Modal.vue';
import MathTex from '@/components/MathTex.vue';
import renderMathInElement from 'katex/contrib/auto-render';
import { algorithms_evaluation } from '@/stores/evaluation';
import type { AlgorithmKey } from '@/types/evaluations';

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
  { id: 'user', label: 'Nutzerergebnis', show: showUser, theoryTitle: 'Nutzerergebnis', color: '#ffffff' },
  { id: 'greedy', label: 'Greedy Algorithmus', show: showGreedy, theoryTitle: 'Greedy Algorithmus', color: '#ff0000' },
  { id: 'thompson', label: 'Thompson Sampling', show: showThompson, theoryTitle: 'Thompson Sampling', color: '#008000' },
  { id: 'ucb', label: 'Upper Confidence Bound', show: showUCB, theoryTitle: 'Upper Confidence Bound', color: '#0000ff' },
  { id: 'eGreedy', label: 'Epsilon-Greedy', show: showEGreedy, theoryTitle: 'Epsilon-Greedy', color: '#ffa500' },
  { id: 'oiv', label: 'Optimistic Initial Values', show: showOIV, theoryTitle: 'Optimistic Initial Values', color: '#800080' },
  { id: 'gradient', label: 'Gradient Bandit', show: showGradient, theoryTitle: 'Gradient Bandit', color: '#00ffff' },
] as const);

type AlgorithmToggle = typeof algorithmToggles.value[number];

interface EvaluationMeta {
  label: string;
  color: string;
  toggleRef?: Ref<boolean>;
}

const evaluationMetadata: Record<AlgorithmKey, EvaluationMeta> = {
  greedy: { label: 'Greedy Algorithmus', color: '#ff0000', toggleRef: showGreedy },
  eGreedy: { label: 'Epsilon-Greedy', color: '#ffa500', toggleRef: showEGreedy },
  thompson: { label: 'Thompson Sampling', color: '#008000', toggleRef: showThompson },
  ucb: { label: 'Upper Confidence Bound', color: '#0000ff', toggleRef: showUCB },
  gradient: { label: 'Gradient Bandit', color: '#00ffff', toggleRef: showGradient },
  optimisticInitial: { label: 'Optimistic Initial Values', color: '#800080', toggleRef: showOIV },
  user: { label: 'Nutzerergebnis', color: '#ffffff', toggleRef: showUser }
};

interface EvaluationDisplayItem {
  algorithm: AlgorithmKey;
  label: string;
  color: string;
  valueDisplay: string;
  active: boolean;
  hasData: boolean;
}

interface EvaluationChartSeriesItem {
  name: string;
  color: string;
  visible: boolean;
  percentages: number[];
}

const evaluationSeries = computed(() => algorithms_evaluation());

const evaluationResults = computed<EvaluationDisplayItem[]>(() =>
  evaluationSeries.value.map(({ algorithm, percentages }) => {
    const meta = evaluationMetadata[algorithm];
    const lastValue = percentages.length > 0 ? percentages[percentages.length - 1] : null;
    const hasData = typeof lastValue === 'number' && !Number.isNaN(lastValue);
    const valueDisplay = hasData ? `${lastValue.toFixed(1)} %` : '–';

    return {
      algorithm,
      label: meta?.label ?? algorithm,
      color: meta?.color ?? 'var(--text, #333)',
      valueDisplay,
      active: meta?.toggleRef ? meta.toggleRef.value : true,
      hasData
    };
  })
);

const evaluationResultsWithData = computed(() =>
  evaluationResults.value.filter(item => item.hasData)
);

const evaluationSeriesHasData = computed(() =>
  evaluationResultsWithData.value.length > 0
);

const evaluationChartSeries = computed<EvaluationChartSeriesItem[]>(() =>
  evaluationSeries.value
    .map(({ algorithm, percentages }) => {
      const meta = evaluationMetadata[algorithm];
      if (!percentages || percentages.length === 0) {
        return null;
      }

      return {
        name: meta?.label ?? algorithm,
        color: meta?.color ?? '#999999',
        visible: meta?.toggleRef ? meta.toggleRef.value : true,
        percentages
      };
    })
    .filter((item): item is EvaluationChartSeriesItem => item !== null)
);

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
  if (banditStore.selectedStocks.length === 0) {
    return;
  }

  algorithmStore.resetAlgorithms();
  algorithmStore.runAlgorithms();
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

const probabilityLabel = computed(() =>
  banditStore.activeBandit === 'bernoulli'
    ? 'Erfolgswahrscheinlichkeit'
    : 'Erwartete Rendite'
);

const selectedArmSummaries = computed(() =>
  banditStore.selectedStocks.map(selected => ({
    id: selected.stock.id,
    name: selected.stock.name,
    logoUrl: selected.stock.logo_url,
    value:
      banditStore.activeBandit === 'bernoulli'
        ? selected.bernoulli_param
        : selected.gaussian_param,
  }))
);

function formatSelectedArmValue(value: number) {
  if (banditStore.activeBandit === 'bernoulli') {
    return `${(value * 100).toFixed(1)} %`;
  }

  const percent = value * 100;
  const prefix = percent > 0 ? '+' : '';
  return `${prefix}${percent.toFixed(1)} %`;
}
</script>

<template>
  <div class="home-view">
    <!-- Headbar -->
    <div class="main-home-headbar">
      <RouterLink class="white-button navBackButton" to="/" data-tour-target="compare-back">Zurück</RouterLink>
      <div class="headbar-title">Vergleich mit Algorithmen</div>
    </div>

    <!-- Content -->
    <div class="home-view-content">
        <div class="main-home-view" data-tour-target="compare-overview">
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
          <div
            v-if="evaluationChartSeries.length > 0"
            class="diagramm diagramm--evaluation"
          >
            <CompareChartAccuracy :series="evaluationChartSeries" />
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
                <span class="algorithm-toggle-text" :style="{ color: toggle.color }">
                  {{ toggle.label }}
                </span>
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
          <div class="sidebar-selected-arms">
            <h3>Ausgewählte Arme</h3>
            <p v-if="selectedArmSummaries.length === 0" class="selected-arm-empty">
              Keine Arme ausgewählt.
            </p>
            <div v-else class="selected-arm-list">
              <div
                v-for="arm in selectedArmSummaries"
                :key="arm.id"
                class="selected-arm-item"
              >
                <img
                  v-if="arm.logoUrl"
                  :src="arm.logoUrl"
                  alt="Logo"
                  class="selected-arm-logo"
                />
                <div class="selected-arm-info">
                  <div class="selected-arm-name">{{ arm.name }}</div>
                  <div class="selected-arm-value">
                    {{ probabilityLabel }}: {{ formatSelectedArmValue(arm.value) }}
                  </div>
                </div>
              </div>
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
            Upper Confidence Bound berechnet in Runde \(t\) für jeden Arm \(i\) einen UCB Index.
          </p>

          <MathTex :display="true" expr="\mathrm{UCB}_t(i)=\hat{\mu}_t(i)+\mathrm{Bonus}_t(i)" />

          <p style="margin:.25rem 0;">
            \(\hat{\mu}_t(i)\) ist der aktuelle Schätzwert der durchschnittlichen Belohnung. \(\mathrm{Bonus}_t(i)\) ist der Konfidenzbonus, also der Aufschlag oberhalb des Schätzwerts. Der Bonus ist nicht die Obergrenze selbst, sondern der Abstand zwischen \(\hat{\mu}_t(i)\) und dem UCB Index. Der Arm mit dem größten UCB Index wird gezogen. Arme mit wenigen Beobachtungen erhalten größere Boni und werden dadurch häufiger ausprobiert. Gut bekannte Arme werden eher ausgenutzt. Mit mehr Daten schrumpft der Bonus und der UCB Index nähert sich dem Schätzwert an.
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

          <h3 style="margin:.45rem 0 .25rem;">Warum funktioniert das</h3>
          <p style="margin:.25rem 0;">
            Der UCB Index ist so konstruiert, dass die wahre mittlere Armqualität mit hoher Wahrscheinlichkeit unter dieser oberen Konfidenzgrenze liegt. Durch das Maximieren des \(\mathrm{UCB}\) wird suboptimale Ausnutzung begrenzt und Exploration genau dort erzwungen, wo Unsicherheit hoch ist. In klassischen Multi Armed Bandit Einstellungen führt das zu Regret Schranken mit logarithmischem Zeitwachstum.
          </p>

          <p class="theory-source">
            Quelle: Russo, Van Roy, Kazerouni, Osband, Wen. A Tutorial on Thompson Sampling, 2018.
          </p>
        </template>

        <!-- Greedy -->
        <template v-else-if="activeTheory && activeTheory.id === 'greedy'">
          <h3 style="margin:.2rem 0 .35rem;">Kernprinzip</h3>
          <p style="margin:.25rem 0;">
            Greedy wählt in Runde \(t\) immer den Arm mit dem aktuell höchsten geschätzten Erwartungswert.
          </p>

          <MathTex :display="true" expr="A_t=\arg\max_i \ \hat{\mu}_t(i)" />

          <h3 style="margin:.4rem 0 .3rem;">Schätzer und Update</h3>
          <p style="margin:.25rem 0;">
            Meist werden Stichprobenmittelwerte verwendet. Zog man in Runde \(t\) den Arm \(A_t=i\) und beobachtete \(R_t\), dann:
          </p>

          <MathTex :display="true" expr="\hat{\mu}_{t+1}(i)=\frac{n_i(t)\,\hat{\mu}_t(i)+R_t}{n_i(t)+1},\qquad \hat{\mu}_{t+1}(j)=\hat{\mu}_t(j)\ \text{für}\ j\neq i" />

          <h3 style="margin:.45rem 0 .25rem;">Ablauf</h3>
          <ol style="margin:.2rem 0; padding-left:1rem;">
            <li>Initialwerte \(\hat{\mu}_0(i)\) setzen.</li>
            <li>In jeder Runde Arm mit maximaler \(\hat{\mu}_t(i)\) wählen.</li>
            <li>Belohnung beobachten und Mittelwert aktualisieren.</li>
          </ol>

          <h3 style="margin:.45rem 0 .25rem;">Eigenschaften</h3>
          <p style="margin:.25rem 0;">
            Greedy nutzt vorhandenes Wissen maximal aus, erkundet aber nicht gezielt. Dadurch kann er auf suboptimalen Armen verbleiben und langfristig linearen Regret verursachen.
          </p>

          <p class="theory-source">
            Quelle: Russo, Van Roy, Kazerouni, Osband, Wen. A Tutorial on Thompson Sampling, 2018.
          </p>
        </template>

        <!-- Thompson -->
        <template v-else-if="activeTheory && activeTheory.id === 'thompson'">
          <h3 style="margin:.2rem 0 .35rem;">Kernprinzip</h3>
          <p style="margin:.25rem 0;">
            Thompson Sampling führt für jeden Arm eine Posteriorverteilung über dessen Erwartungswert und wählt in Runde \(t\) den Arm mit dem höchsten Posterior Sample.
          </p>

          <h4 style="margin:.35rem 0 .2rem;">Bernoulli Spezialfall mit Beta Prior</h4>
          <p style="margin:.25rem 0;">
            Mit Prior \( \mathrm{Beta}(\alpha_i,\beta_i) \) für Arm \(i\):
          </p>

          <MathTex :display="true" expr="\tilde{\theta}_i \sim \mathrm{Beta}(\alpha_i+n_i^{\mathrm{succ}},\ \beta_i+n_i^{\mathrm{fail}}),\qquad A_t=\arg\max_i \ \tilde{\theta}_i" />

          <p style="margin:.25rem 0;">
            Nach Erfolg wird \(\alpha_i\) erhöht, nach Misserfolg \(\beta_i\).
          </p>

          <h3 style="margin:.45rem 0 .25rem;">Ablauf</h3>
          <ol style="margin:.2rem 0; padding-left:1rem;">
            <li>Priors initialisieren.</li>
            <li>Pro Runde: für jeden Arm aus der Posteriorverteilung sampeln, \(\arg\max\) wählen.</li>
            <li>Belohnung beobachten und Posterior aktualisieren.</li>
          </ol>

          <h3 style="margin:.45rem 0 .25rem;">Eigenschaften</h3>
          <p style="margin:.25rem 0;">
            Exploration entsteht automatisch durch die Posteriorbreite unsicherer Arme. Für klassische Bandits zeigt TS häufig \( \mathcal{O}(\log T) \) Regret und ist praktisch sehr effizient.
          </p>

          <p class="theory-source">
            Quelle: Russo, Van Roy, Kazerouni, Osband, Wen. A Tutorial on Thompson Sampling, 2018.
          </p>
        </template>

        <!-- Epsilon-Greedy -->
        <template v-else-if="activeTheory && activeTheory.id === 'eGreedy'">
          <h3 style="margin:.2rem 0 .35rem;">Kernprinzip</h3>
          <p style="margin:.25rem 0;">
            Mit Wahrscheinlichkeit \(1-\varepsilon_t\) wird der beste bekannte Arm ausgebeutet, mit Wahrscheinlichkeit \(\varepsilon_t\) wird ein Arm zufällig gewählt.
          </p>

          <MathTex :display="true" expr="A_t=\begin{cases}
\arg\max_i \ \hat{\mu}_t(i), & \text{mit Wkt. } 1-\varepsilon_t \\
\text{Uniform}\{1,\dots,K\}, & \text{mit Wkt. } \varepsilon_t
\end{cases}" />

          <h3 style="margin:.45rem 0 .25rem;">Schätzer und Zeitplan für \(\varepsilon_t\)</h3>
          <p style="margin:.25rem 0;">
            Schätzung wie bei Greedy. \(\varepsilon_t\) kann konstant sein oder abnehmen, zum Beispiel \(\varepsilon_t\propto 1/t\).
          </p>

          <h3 style="margin:.45rem 0 .25rem;">Eigenschaften</h3>
          <p style="margin:.25rem 0;">
            Konstant positives \(\varepsilon\) sichert Exploration, führt aber oft zu asymptotisch linearem Regret. Abnehmendes \(\varepsilon_t\) erlaubt unter passenden Bedingungen sublineares Regret.
          </p>

          <p class="theory-source">
            Quelle: Russo, Van Roy, Kazerouni, Osband, Wen. A Tutorial on Thompson Sampling, 2018.
          </p>
        </template>

        <!-- OIV -->
        <template v-else-if="activeTheory && activeTheory.id === 'oiv'">
          <h3 style="margin:.2rem 0 .35rem;">Kernprinzip</h3>
          <p style="margin:.25rem 0;">
            Optimistic Initial Values setzen \(\hat{\mu}_0(i)\) künstlich hoch. Dadurch werden alle Arme anfangs bevorzugt und Exploration wird induziert.
          </p>

          <h3 style="margin:.4rem 0 .3rem;">Konkretes Setting</h3>
          <p style="margin:.25rem 0;">
            Wähle \(\hat{\mu}_0(i)=Q_0\) groß, nutze danach Standard Updates, zum Beispiel Stichprobenmittel:
          </p>

          <MathTex :display="true" expr="\hat{\mu}_{t+1}(i)=\frac{n_i(t)\,\hat{\mu}_t(i)+R_t}{n_i(t)+1}\quad\text{für}\ i=A_t" />

          <h3 style="margin:.45rem 0 .25rem;">Ablauf und Eigenschaften</h3>
          <ol style="margin:.2rem 0; padding-left:1rem;">
            <li>Mit großem \(Q_0\) initialisieren.</li>
            <li>Greedy anhand \(\hat{\mu}_t\) wählen.</li>
            <li>Belohnungen beobachten und Mittelwerte aktualisieren.</li>
          </ol>
          <p style="margin:.25rem 0;">
            In stationären Umgebungen oft sehr effektiv. Wahl von \(Q_0\) ist heuristisch. In stark nichtstationären Umgebungen oder mit konstantem Lernraten Update kann die Optimismuswirkung zu lang anhaltender Fehlexploration führen.
          </p>
        </template>

        <!-- Gradient Bandit -->
        <template v-else-if="activeTheory && activeTheory.id === 'gradient'">
          <h3 style="margin:.2rem 0 .35rem;">Kernprinzip</h3>
          <p style="margin:.25rem 0;">
            Der Algorithmus lernt Präferenzen \(H_t(i)\) und wählt Arme stochastisch nach einer Softmax Policy.
          </p>

          <h4 style="margin:.35rem 0 .2rem;">Softmax Policy</h4>
          <MathTex :display="true" expr="\pi_t(i)=\frac{\exp\!\big(H_t(i)\big)}{\sum_j \exp\!\big(H_t(j)\big)}" />

          <h4 style="margin:.35rem 0 .2rem;">Update der Präferenzen</h4>
          <p style="margin:.25rem 0;">
            Mit Lernrate \(\alpha\), beobachteter Belohnung \(R_t\) und gleitendem Durchschnitt \(\bar{R}_t\):
          </p>

          <MathTex :display="true" expr="H_{t+1}(i)=H_t(i)+\alpha\,(R_t-\bar{R}_t)\,\big(\mathbf{1}\{i=A_t\}-\pi_t(i)\big)" />

          <h3 style="margin:.45rem 0 .25rem;">Ablauf</h3>
          <ol style="margin:.2rem 0; padding-left:1rem;">
            <li>Präferenzen \(H_0(i)\) initialisieren, zum Beispiel 0.</li>
            <li>\(\pi_t(i)\) per Softmax berechnen, Arm gemäß \(\pi_t\) ziehen.</li>
            <li>Belohnung beobachten, \(H_t\) und \(\bar{R}_t\) aktualisieren.</li>
          </ol>

          <h3 style="margin:.45rem 0 .25rem;">Eigenschaften</h3>
          <p style="margin:.25rem 0;">
            Exploration ist in der Softmax enthalten. Das Verfahren passt Wahlwahrscheinlichkeiten direkt an und reagiert flexibel auf veränderte Belohnungen.
          </p>
        </template>

        <!-- Nutzerergebnis -->
        <template v-else-if="activeTheory && activeTheory.id === 'user'">
          <h3 style="margin:.2rem 0 .35rem;">Was bedeutet Nutzerergebnis</h3>
          <p style="margin:.25rem 0;">
            Das Nutzerergebnis sind die von dir gewählten Arme und die daraus resultierenden Belohnungen. In den Diagrammen wird es zeitlich neben den Algorithmen dargestellt, damit du direkt sehen kannst, wie dein Vorgehen im Vergleich zu den Strategien abschneidet.
          </p>
          <p style="margin:.25rem 0;">
            Für Bernoulli Bandits interpretieren wir Werte als Erfolgswahrscheinlichkeiten. Für Gaussian Bandits interpretieren wir Werte als erwartete Renditen.
          </p>
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

.diagramm--evaluation {
  aspect-ratio: auto;
  min-height: 0;
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

.sidebar-selected-arms {
  width: 100%;
  margin-bottom: 1.5rem;
}

.sidebar-evaluation {
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

.algorithm-toggle-text {
  font-weight: 500;
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

.evaluation-empty {
  margin: 0.25rem 0;
  color: var(--text-muted, #666666);
}

.evaluation-list {
  list-style: none;
  margin: 0.5rem 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.evaluation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.95rem;
}

.evaluation-item--inactive {
  opacity: 0.5;
}

.evaluation-name {
  font-weight: 500;
}

.evaluation-value {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.evaluation-hint {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: whitesmoke
}

.theory-modal-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.theory-source {
  margin-top: .35rem;
  font-size: .9rem;
  color: whitesmoke;
}

.selected-arm-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.selected-arm-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.selected-arm-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.selected-arm-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.selected-arm-name {
  font-weight: 600;
}

.selected-arm-value {
  font-size: 0.9rem;
  color: whitesmoke;
}

.selected-arm-empty {
  font-size: 0.9rem;
  color: whitesmoke;
  margin-top: 0.5rem;
}

/* Schutz vor Global CSS auf Formeln */
:deep(.katex) {
  line-height: normal;
}
</style>
