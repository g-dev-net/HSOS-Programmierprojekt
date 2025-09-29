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
  }
})

const chartData = computed(() => 
  props.data.map((point) => ({ x: point.x, y: point.y }))
)

const options = computed(() => ({
  animationEnabled: true,
  backgroundColor: "transparent",
  axisX:{
    title: "Investments",
    titleFontColor: "white",
    labelTextAlign: "center",
    lineColor: "white",
    tickColor: "white",
  },
  axisY: {
    title: "Gewinn",
    titleFontColor: "white",
    lineColor: "white",
    tickColor: "white",
    gridColor: "gray",
    gridDashType: "dash",
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
