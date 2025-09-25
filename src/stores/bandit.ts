import { ref, computed, compileToFunction } from 'vue'
import { defineStore } from 'pinia'
import type { selectedStock } from '@/types/bandits'
import type { Investment } from '@/types/investment'
import { bernoulli } from '@/bandits/bernoulli'
import { gaussian } from '@/bandits/gaussian'

export const useBanditStore = defineStore('bandit', () => {

  // --------------------- general values ---------------------
  const startingCapital = ref(10000)
  const remainingCapital = ref(startingCapital.value) // TODO - anzahl investments
  const possibleInvestments = ref(10)
  const investmentStep = computed(() => Math.round(startingCapital.value / possibleInvestments.value))

  // Liste mit den ausgewählten Aktien und deren Parametern
  const selectedStocks = ref<selectedStock[]>([])

  // --------------------- bandit run logic ---------------------
  const banditInProgress = ref(false)

  // list of investments
  const investments = ref<Investment[]>([])

  // pull arm function
  const pullArm = (algorithm: string, stock: selectedStock) => {
    if (algorithm === 'bernoulli') {
     
      const result = bernoulli(stock.bernoulli_param);
      investments.value.push({
        stock: stock,
        gaussianReturn: null,
        bernoulliReturn: result
      });

    } else if (algorithm === 'gaussian') {

      const result = gaussian(stock.gaussian_param);
      investments.value.push({
        stock: stock,
        gaussianReturn: result,
        bernoulliReturn: null
      });
    }
  }

  return { selectedStocks, startingCapital, remainingCapital, possibleInvestments, investmentStep, investments, banditInProgress, pullArm }
})
