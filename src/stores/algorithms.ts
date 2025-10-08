import { ref, computed} from 'vue'
import { defineStore } from 'pinia'
import type { AlgoInvestment } from '@/types/investment'

export const useAlgorithmStore = defineStore('algorithm', () => {

  // --------------------- bandit run logic ---------------------
  const algorithmsInProgress = ref(false)

  // list of investments
  const investmentsGreedy = ref<AlgoInvestment[]>([])
  const investmentsEGreedy = ref<AlgoInvestment[]>([])
  const investmentsThompson = ref<AlgoInvestment[]>([])
  const investmentsUCB = ref<AlgoInvestment[]>([])
  const investmentsGradient = ref<AlgoInvestment[]>([])
  const investmentsOptimisticInitial = ref<AlgoInvestment[]>([])
  const investmentsUserAlgorithm = ref<AlgoInvestment[]>([])

  return { algorithmsInProgress, investmentsGreedy, investmentsEGreedy, investmentsThompson, investmentsUCB, investmentsGradient, investmentsOptimisticInitial, investmentsUserAlgorithm }
})
