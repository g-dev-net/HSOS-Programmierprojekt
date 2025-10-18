<script setup lang="ts">
import { computed } from 'vue';

type ChartSeriesInput = {
  name: string;
  color: string;
  percentages: number[];
  visible: boolean;
};

const props = defineProps<{
  series: ChartSeriesInput[];
  height?: number;
}>();

const maxDataPoints = computed(() => {
  const lengths = props.series.map(series => series.percentages.length);
  return lengths.length > 0 ? Math.max(...lengths) : 0;
});

const axisInterval = computed(() => {
  const targetTickCount = 10;
  const interval = Math.ceil(maxDataPoints.value / targetTickCount);
  return interval > 1 ? interval : 1;
});

const animationsEnabled = computed(() => maxDataPoints.value < 400);

const chartData = computed(() =>
  props.series.map(series => ({
    type: 'line',
    lineColor: series.color,
    showInLegend: false,
    name: series.name,
    lineThickness: 3,
    markerColor: series.color,
    visible: series.visible,
    dataPoints: series.percentages.map((value, index) => ({
      x: index + 1,
      y: value
    }))
  }))
);

const options = computed(() => ({
  animationEnabled: animationsEnabled.value,
  backgroundColor: 'transparent',
  title:{
			text: "Trefferquote im Vergleich",
      fontColor: 'white',
      fontFamily: 'Arial',
      fontWeight: 'bold',
      margin: 5,
      fontSize: 20
	},
  legend: {
    fontColor: 'white',
    horizontalAlign: 'right',
    verticalAlign: 'top'
  },
  axisX: {
    title: 'Investments',
    titleFontColor: 'white',
    labelTextAlign: 'center',
    lineColor: 'white',
    tickColor: 'white',
    labelFontColor: 'white',
    interval: axisInterval.value,
    minimum: 1
  },
  axisY: {
    title: 'Trefferquote (%)',
    titleFontColor: 'white',
    lineColor: 'white',
    tickColor: 'white',
    gridColor: 'gray',
    gridDashType: 'dash',
    labelFontColor: 'white',
    minimum: 0,
    maximum: 100
  },
  data: chartData.value
}));

const styleOptions = computed(() => ({
  width: '100%',
  height: `${props.height ?? 320}px`
}));
</script>

<template>
  <CanvasJSChart :options="options" :style="styleOptions" />
</template>

<style scoped></style>
