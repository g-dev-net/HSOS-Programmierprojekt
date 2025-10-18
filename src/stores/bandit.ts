import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { selectedStock } from '@/types/bandits'
import type { Investment } from '@/types/investment'
import { bernoulli } from '@/bandits/bernoulli'
import { gaussian } from '@/bandits/gaussian'
import { buildDisplayDataPoints } from './utils/displayData'

export const useBanditStore = defineStore('bandit', () => {
  type BanditKey = 'bernoulli' | 'gaussian'

  // --------------------- general values ---------------------
  const bandits = [
    { name: 'Bernoulli-Bandit', key: 'bernoulli' as BanditKey },
    { name: 'Gaussian-Bandit', key: 'gaussian' as BanditKey },
  ]
  const activeBandit = ref<BanditKey>(bandits[0].key)

  const startingCapital = ref(10000)
  const possibleInvestments = ref(10)
  const investmentStep = computed(() => startingCapital.value / possibleInvestments.value)

  const totalGaussianGain = computed(() => investments.value.reduce((sum, investment) => {
    if (investment.gaussianReturn === null) {
      return sum
    }

    return sum + investment.gaussianReturn * investmentStep.value
  }, 0))

  const currentCapital = computed(() =>
    parseFloat((startingCapital.value + totalGaussianGain.value).toFixed(2))
  )

  const remainingCapital = computed(() =>
    parseFloat((startingCapital.value - investmentStep.value * investments.value.length).toFixed(2))
  )

  const remainingInvestments = computed(() =>
    Math.max(possibleInvestments.value - investments.value.length, 0)
  )

  const bernoutliPortfolioSubtitle = computed(() =>
    investments.value.filter(inv => inv.bernoulliReturn === true).length
  )

  const gaussianPortfolioSubtitle = computed(() =>
    parseFloat(totalGaussianGain.value.toFixed(2))
  )

  // Liste mit den ausgewählten Aktien und deren Parametern
  const selectedStocks = ref<selectedStock[]>([])

  // --------------------- bandit run logic ---------------------
  const banditInProgress = ref(false)

  // list of investments
  const investments = ref<Investment[]>([])

  const isInvestmentPossible = computed(() =>
    investments.value.length < possibleInvestments.value
  )

  const resetBandit = () => {
    investments.value = []
    banditInProgress.value = false
  }

  const displayData = computed(() => {
    return buildDisplayDataPoints<Investment>({
      investments: investments.value,
      activeBandit: activeBandit.value,
      startingCapital: startingCapital.value,
      investmentStep: investmentStep.value,
      getStockName: investment => investment.stock.stock.name,
      getBernoulliResult: investment => investment.bernoulliReturn,
      getGaussianResult: investment => investment.gaussianReturn,
    })
  })

  // pull arm function
  const pullArm = (algorithm: BanditKey, stock: selectedStock) => {
    if (!isInvestmentPossible.value) {
      return
    }

    if (algorithm === 'bernoulli') {

      const result = bernoulli(stock.bernoulli_param)
      investments.value.push({
        stock: stock,
        gaussianReturn: null,
        bernoulliReturn: result
      })

    } else if (algorithm === 'gaussian') {

      const result = gaussian(stock.gaussian_param)
      investments.value.push({
        stock: stock,
        gaussianReturn: result,
        bernoulliReturn: null
      })
    }
  }

  return {
    bandits,
    activeBandit,
    selectedStocks,
    startingCapital,
    currentCapital,
    remainingCapital,
    possibleInvestments,
    investmentStep,
    investments,
    banditInProgress,
    pullArm,
    displayData,
    isInvestmentPossible,
    remainingInvestments,
    resetBandit,
    bernoutliPortfolioSubtitle,
    gaussianPortfolioSubtitle,
  }
})
