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

const yAxisTitle = computed(() => {
  return props.activeBandit === 'bernoulli' ? 'Gewonnene Investments' : 'Gewinn in €';
})

const options = computed(() => ({
  animationEnabled: true,
  backgroundColor: "transparent",
  legend: {
    fontColor: "white",
    horizontalAlign: "right",
    verticalAlign: "top",
  },
  axisX: {
    title: "Investments",
    titleFontColor: "white",
    labelTextAlign: "center",
    lineColor: "white",
    tickColor: "white",
    labelFontColor: "white",
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
    showInLegend: true,
    name: "Nutzerergebnis",
    lineThickness: 3,
    markerColor: "white",
    dataPoints: chartUserData.value
  },
  {
    type: "line",
    lineColor: "red",
    showInLegend: true,
    name: "Greedy Algorithmus",
    lineThickness: 3,
    markerColor: "red",
    dataPoints: chartGreedyData.value
  },
  {
    type: "line",
    lineColor: "green",
    showInLegend: true,
    name: "Thompson Sampling",
    lineThickness: 3,
    markerColor: "green",
    dataPoints: chartThompsonData.value
  },
  {
    type: "line",
    lineColor: "blue",
    showInLegend: true,
    name: "Upper Confidence Bound",
    lineThickness: 3,
    markerColor: "blue",
    dataPoints: chartUCBData.value
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
