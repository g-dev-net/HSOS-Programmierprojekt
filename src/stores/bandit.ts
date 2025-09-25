import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import stocks from '@/data/aktien.json'
import type { selectedStock } from '@/types/bandits'
import { generateBernoulliParam, generateGaussianParam } from '@/assets/utils/banditHelpers'

export const useBanditStore = defineStore('bandit', () => {

  const startingCapital = ref(10000)
  const remainingCapital = ref(startingCapital.value) // TODO - anzahl investments
  const possibleInvestments = ref(10)
  const investmentStep = computed(() => Math.round(startingCapital.value / possibleInvestments.value))

  // Liste mit den ausgewählten Aktien und deren Parametern
  const selectedStocks = ref<selectedStock[]>([
    { stock: 0, bernoulli_param: generateBernoulliParam(), gaussian_param: generateGaussianParam() },
    { stock: 1, bernoulli_param: generateBernoulliParam(), gaussian_param: generateGaussianParam() },
    { stock: 2, bernoulli_param: generateBernoulliParam(), gaussian_param: generateGaussianParam() }
  ])
  
  // Greife auf die Stockdaten zu
  const selectedStocksData = computed(() =>
    selectedStocks.value.map((sel: selectedStock) => ({
      ...stocks[sel.stock],
      bernoulli_param: sel.bernoulli_param,
      gaussian_param: sel.gaussian_param
    }))
  )

  const banditInProgress = ref(false)

  // Liste mit Investments und deren Parametern
  const investments = ref<{ stock: number; amount: number }[]>([])

  return { selectedStocks, selectedStocksData, startingCapital, remainingCapital, possibleInvestments, investmentStep, investments, banditInProgress }
})
