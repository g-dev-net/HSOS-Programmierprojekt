<template>
  <div class="chart-container">
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export interface CompareResult {
  algorithmId: string;
  algorithmName: string;
  parameter: number | null;
  datapoints: { iteration: number; optimalPercentage: number }[];
}

const props = defineProps<{
  results: CompareResult[];
}>();

const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

// Algorithmenfarben entsprechend AlgorithmView
const algorithmColors: Record<string, string> = {
  greedy: '#ff0000',      // Rot
  eGreedy: '#ffa500',     // Orange
  thompson: '#008000',    // Grün
  ucb: '#0000ff',         // Blau
  oiv: '#800080',         // Lila
  gradient: '#00ffff'     // Cyan
};

// Generiere Farbabstufung für Parameter (heller werdend)
function getParameterColor(baseColor: string, paramIndex: number, totalParams: number): string {
  if (totalParams === 1) return baseColor;
  
  // Konvertiere Hex zu RGB
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);
  
  // Berechne Aufhellungsfaktor (0 = dunkel/original, 1 = sehr hell)
  // Verteile gleichmäßig über den Bereich 0 bis 0.6 (nicht zu hell)
  const lightnessFactor = (paramIndex / (totalParams - 1)) * 0.6;
  
  // Mische mit Weiß (255, 255, 255)
  const newR = Math.round(r + (255 - r) * lightnessFactor);
  const newG = Math.round(g + (255 - g) * lightnessFactor);
  const newB = Math.round(b + (255 - b) * lightnessFactor);
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

function createChart() {
  if (!chartCanvas.value) {
    console.log('Chart canvas not available');
    return;
  }

  if (!props.results || props.results.length === 0) {
    console.log('No results to display');
    return;
  }

  console.log('Creating chart with results:', props.results.length, 'algorithms');

  // Destroy existing chart
  if (chartInstance) {
    chartInstance.destroy();
  }

  // Gruppiere Ergebnisse nach Algorithmus für Farbabstufungen
  const algorithmGroups = new Map<string, CompareResult[]>();
  props.results.forEach(result => {
    if (!algorithmGroups.has(result.algorithmId)) {
      algorithmGroups.set(result.algorithmId, []);
    }
    algorithmGroups.get(result.algorithmId)!.push(result);
  });

  const datasets = props.results.map((result) => {
    const label = result.parameter !== null 
      ? `${result.algorithmName} (${result.parameter})`
      : result.algorithmName;

    console.log(`Dataset ${label}: ${result.datapoints.length} datapoints`);

    // Bestimme Basisfarbe und Abstufung
    const baseColor = algorithmColors[result.algorithmId] || '#888888';
    const group = algorithmGroups.get(result.algorithmId)!;
    const paramIndex = group.indexOf(result);
    const totalParams = group.length;
    
    const color = getParameterColor(baseColor, paramIndex, totalParams);

    return {
      label,
      data: result.datapoints.map(dp => ({
        x: dp.iteration,
        y: dp.optimalPercentage
      })),
      borderColor: color,
      backgroundColor: color + '33',
      borderWidth: 2,
      tension: 0.1,
      pointRadius: 0,
      pointHitRadius: 10
    };
  });

  chartInstance = new Chart(chartCanvas.value, {
    type: 'line',
    data: {
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: {
            display: true,
            text: 'Iteration'
          },
          ticks: {
            stepSize: 10
          }
        },
        y: {
          title: {
            display: true,
            text: '% Optimale Aktionen'
          },
          min: 0,
          max: 100
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });
  
  console.log('Chart created successfully');
}

onMounted(() => {
  console.log('CompareResultChart mounted, results:', props.results.length);
  nextTick(() => {
    createChart();
  });
});

watch(() => props.results, (newResults) => {
  console.log('Results changed, new length:', newResults.length);
  nextTick(() => {
    createChart();
  });
}, { deep: true, immediate: true });
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 500px;
  padding: 20px;
}

canvas {
  max-width: 100%;
  max-height: 100%;
}
</style>
