import { ref, computed} from 'vue'
import { defineStore } from 'pinia'
import type { AlgoInvestment } from '@/types/investment'

export const useAlgorithmStore = defineStore('algorithm', () => {

  // --------------------- bandit run logic ---------------------
  const algorithmsInProgress = ref(false)

  // list of investments
  const investmentsGreedy = ref<AlgoInvestment[]>([])

  return { algorithmsInProgress, investmentsGreedy}
})
