<script setup lang="ts">
import { computed } from 'vue'
import * as d3 from 'd3'

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

const padding = 10

const rangeX = computed(() => {
  const w = props.width - padding
  return [0, w]
})

const rangeY = computed(() => {
  const h = props.height - padding
  return [0, h]
})

const pathGen = computed(() => {
  const x = d3.scaleLinear().range(rangeX.value)
  const y = d3.scaleLinear().range(rangeY.value)

  //@ts-ignore
  x.domain(d3.extent(props.data, (_d, i) => i))
  //@ts-ignore
  y.domain([0, d3.max(props.data, d => d)])

  return d3.line()
    .x((_d, i) => x(i))
    //@ts-ignore
    .y(d => y(d))
})

//@ts-ignore
const line = computed(() => pathGen.value(props.data))

const viewBox = computed(() => `0 0 ${props.width} ${props.height}`)
</script>

<template>
  <svg class="line-chart" :viewBox="viewBox">
    <g transform="translate(0, 10)">
      <path class="line-chart__line" :d="line" />
    </g>
  </svg>
</template>

<style scoped>
.line-chart {
    margin: 25px;
    fill: none;
    stroke: #76BF8A;
    stroke-width: 3px;
}

</style>
