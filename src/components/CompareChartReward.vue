<script setup lang="ts">
import { computed } from 'vue'
import type { DisplayDataPoint } from '@/types/investment';


const props = defineProps({
  dataGreedy: {
    type: Array<DisplayDataPoint>,
    required: true
  },
  dataUser: {
    type: Array<DisplayDataPoint>,
    required: true
  },
  dataThompson: {
    type: Array<DisplayDataPoint>,
    required: true
  },
  dataUCB: {
    type: Array<DisplayDataPoint>,
    required: false
  },
  dataEGreedy: {
    type: Array<DisplayDataPoint>,
    required: false
  },
  dataOIV: {
    type: Array<DisplayDataPoint>,
    required: false
  },
  gradientDataPoints: {
    type: Array<DisplayDataPoint>,
    required: false
  },
  showGradient: {
    type: Boolean,
    default: true
  },
  showUser: {
    type: Boolean,
    default: true
  },
  showGreedy: {
    type: Boolean,
    default: true
  },
  showThompson: {
    type: Boolean,
    default: true
  },
  showUCB: {
    type: Boolean,
    default: true
  },
  showEGreedy: {
    type: Boolean,
    default: true
  },
  showOIV: {
    type: Boolean,
    default: true
  },
  width: {
    type: Number,
    default: 900
  },
  height: {
    type: Number,
    default: 500
  },
  activeBandit: {
    type: String,
    required: true
  }
})

const chartUserData = computed(() =>
  props.dataUser.map((point) => ({ x: point.x, y: point.y }))
)

const chartGreedyData = computed(() =>
  props.dataGreedy.map((point) => ({ x: point.x, y: point.y }))
)

const chartThompsonData = computed(() =>
  props.dataThompson.map((point) => ({ x: point.x, y: point.y }))
)

const chartUCBData = computed(() =>
  props.dataUCB ? props.dataUCB.map((point) => ({ x: point.x, y: point.y })) : []
)

const chartEGreedyData = computed(() =>
  props.dataEGreedy ? props.dataEGreedy.map((point) => ({ x: point.x, y: point.y })) : []
)

const chartOIVData = computed(() =>
  props.dataOIV ? props.dataOIV.map((point) => ({ x: point.x, y: point.y })) : []
)

const chartGradientData = computed(() =>
  props.gradientDataPoints ? props.gradientDataPoints.map((point) => ({ x: point.x, y: point.y })) : []
)

const yAxisTitle = computed(() => {
  return props.activeBandit === 'bernoulli' ? 'Gewonnene Investments' : 'Gewinn in €';
})

const maxDataPoints = computed(() => {
  const lengths = [
    props.dataUser.length,
    props.dataGreedy.length,
    props.dataThompson.length,
    props.dataUCB?.length ?? 0,
    props.dataEGreedy?.length ?? 0,
    props.dataOIV?.length ?? 0,
    props.gradientDataPoints?.length ?? 0
  ]

  return Math.max(...lengths)
})

const axisInterval = computed(() => {
  const targetTickCount = 10
  const interval = Math.ceil(maxDataPoints.value / targetTickCount)

  return interval > 1 ? interval : 1
})

const animationsEnabled = computed(() => maxDataPoints.value < 400)

const options = computed(() => ({
  animationEnabled: animationsEnabled.value,
  backgroundColor: "transparent",
  title:{
			text: "Rewards im Vergleich",
      fontColor: 'white',
      fontFamily: 'Arial',
      fontWeight: 'bold',
      margin: 5,
      fontSize: 20
	},
  legend: {
    fontColor: "white",
    horizontalAlign: "right",
    verticalAlign: "top"
  },
  axisX: {
    title: "Investments",
    titleFontColor: "white",
    labelTextAlign: "center",
    lineColor: "white",
    tickColor: "white",
    labelFontColor: "white",
    interval: axisInterval.value,
    minimum: 0,
  },
  axisY: {
    title: yAxisTitle.value,
    titleFontColor: "white",
    lineColor: "white",
    tickColor: "white",
    gridColor: "gray",
    gridDashType: "dash",
    labelFontColor: "white",
  },
  data: [{
    type: "line",
    lineColor: "white",
    showInLegend: false,
    name: "Nutzerergebnis",
    lineThickness: 3,
    markerColor: "white",
    visible: props.showUser,
    dataPoints: chartUserData.value
  },
  {
    type: "line",
    lineColor: "red",
    showInLegend: false,
    name: "Greedy Algorithmus",
    lineThickness: 3,
    markerColor: "red",
    visible: props.showGreedy,
    dataPoints: chartGreedyData.value
  },
  {
    type: "line",
    lineColor: "green",
    showInLegend: false,
    name: "Thompson Sampling",
    lineThickness: 3,
    markerColor: "green",
    visible: props.showThompson,
    dataPoints: chartThompsonData.value
  },
  {
    type: "line",
    lineColor: "blue",
    showInLegend: false,
    name: "Upper Confidence Bound",
    lineThickness: 3,
    markerColor: "blue",
    visible: props.showUCB,
    dataPoints: chartUCBData.value
  },
  {
    type: "line",
    lineColor: "orange",
    showInLegend: false,
    name: "Epsilon-Greedy",
    lineThickness: 3,
    markerColor: "orange",
    visible: props.showEGreedy,
    dataPoints: chartEGreedyData.value
  },
  {
    type: "line",
    lineColor: "purple",
    showInLegend: false,
    name: "Optimistic Initial Values",
    lineThickness: 3,
    markerColor: "purple",
    visible: props.showOIV,
    dataPoints: chartOIVData.value
  },
  {
    type: "line",
    lineColor: "cyan",
    showInLegend: false,
    name: "Gradient Bandit",
    lineThickness: 3,
    markerColor: "cyan",
    visible: props.showGradient,
    dataPoints: chartGradientData.value
  }
  ]
}))

const styleOptions = {
  width: "100%",
  height: "360px"
}
</script>

<template>
  <CanvasJSChart :options="options" :style="styleOptions" />
</template>

<style scoped></style>
