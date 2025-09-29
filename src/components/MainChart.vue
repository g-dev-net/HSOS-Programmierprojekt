<script setup lang="ts">
import { color } from 'chart.js/helpers';


const props = defineProps({
  data: {
    type: Array,
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

const options = {
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
          dataPoints: [
            { label: "2016", y: 0 },
            { label: "2017", y: 1 },
            { label: "2018", y: 1 },
            { label: "2019", y: 2 },
            { label: "2020", y: 3 },
            { label: "2021", y: 3 },
            { label: "2022 (Jan-Oct)", y: 4 },
            { label: "2022 (Jan-Oct)", y: 4 }
          ]
        }]
      }
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
