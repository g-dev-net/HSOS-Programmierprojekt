<script setup lang="ts">
import { computed } from 'vue'
import type { DisplayDataPoint } from '@/types/investment';


const props = defineProps({
  data: {
    type: Array<DisplayDataPoint>,
    required: true
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

const chartData = computed(() => 
  props.data.map((point) => ({ x: point.x, y: point.y }))
)

const yAxisTitle = computed(() => {
  return props.activeBandit === 'bernoulli' ? 'Gewonnene Investments' : 'Gewinn in €';
})

const dataPointCount = computed(() => props.data.length)

const axisInterval = computed(() => {
  const targetTickCount = 10
  const interval = Math.ceil(dataPointCount.value / targetTickCount)

  return interval > 1 ? interval : 1
})

const animationsEnabled = computed(() => dataPointCount.value < 400)

const options = computed(() => ({
  animationEnabled: animationsEnabled.value,
  backgroundColor: "transparent",
  axisX:{
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
    lineThickness: 3,
    markerColor: "white",
    dataPoints: chartData.value
  }]
}))

const styleOptions = {
  width: "100%",
  height: "360px"
}
</script>

<template>
  <CanvasJSChart :options="options" :style="styleOptions"/>
</template>

<style scoped>

</style>
