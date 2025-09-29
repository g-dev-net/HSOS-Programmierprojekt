<script setup lang="ts">

interface Row {
  [key: string]: string | number;
}

interface Header {
  [key: string]: string | number;
}

const props = defineProps<{
  headers: Header[];
  rows: Row[];
}>();
</script>

<template>
  <table>
    <thead>
      <tr>
        <th v-for="header in props.headers" :key="header">{{ header[Object.keys(header)[0]] }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, rowIndex) in props.rows" :key="rowIndex">
        <td v-for="header in props.headers" :key="header">{{ row[Object.keys(header)[0]] }}</td>
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