<script setup lang="ts">
import { computed } from 'vue'
import type { Row, Header } from '@/types/table'

const props = defineProps<{
  headers: Header[]
  rows: Row[]
}>()

const headerKeys = computed(() => props.headers.map(header => Object.keys(header)[0]))
</script>

<template>
  <table>
    <thead>
      <tr>
        <th
          v-for="(key, index) in headerKeys"
          :key="key"
        >
          {{ props.headers[index][key] }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, rowIndex) in props.rows" :key="rowIndex">
        <td v-for="key in headerKeys" :key="key">
          {{ row[key] }}
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
table {
  border-collapse: collapse;
  width: 100%;
}
th, td {
  border: 1px solid #ccc;
  padding: 8px;
  text-align: left;
}
</style>
