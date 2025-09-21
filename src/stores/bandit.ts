import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import stocks from '@/data/aktien.json'

export const useBanditStore = defineStore('bandit', () => {
  const selectedStocks = ref([0, 1, 2])
  const possibleInvestments = ref(10)
  
  const selectedStocksData = computed(() =>
  selectedStocks.value.map(index => stocks[index])
)

  return { selectedStocks, selectedStocksData, possibleInvestments }
})
