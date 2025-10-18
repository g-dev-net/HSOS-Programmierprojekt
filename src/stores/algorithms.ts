import { ref, computed, type Ref } from 'vue'
import { defineStore } from 'pinia'
import type { AlgoInvestment, DisplayDataPoint } from '@/types/investment'
import { eGreedy_bernoulli, eGreedy_gaussian, greedy_bernoulli, greedy_gaussian, OIV_bernoulli, OIV_gaussian } from '@/algorithms/e_greedy_OIV'
import { useBanditStore } from './bandit'
import { thompsonSampling_bernoulli, thompsonSampling_gaussian } from '@/algorithms/thompsonSampling'
import { upperConfidenceBound_bernoulli, upperConfidenceBound_gaussian } from '@/algorithms/UpperConfidenceBound'
import { gradientBandit_bernoulli, gradientBandit_gaussian } from '@/algorithms/gradientBandit'
import { buildDisplayDataPoints } from './utils/displayData'

export const useAlgorithmStore = defineStore('algorithm', () => {
  var banditStore = useBanditStore()

  // --------------------- bandit run logic ---------------------
  const algorithmsInProgress = ref(false)
  const algorithmsCompleted = ref(false)
  const algorithmsCompare = ref(false)
  const optimalActions = ref(true)
  const currentCompareParam = ref<number | undefined>(undefined)

  // list of investments
  const investmentsGreedy = ref<AlgoInvestment[]>([])
  const investmentsEGreedy = ref<AlgoInvestment[]>([])
  const investmentsThompson = ref<AlgoInvestment[]>([])
  const investmentsUCB = ref<AlgoInvestment[]>([])
  const investmentsGradient = ref<AlgoInvestment[]>([])
  const investmentsOptimisticInitial = ref<AlgoInvestment[]>([])
  const investmentsUserAlgorithm = ref<AlgoInvestment[]>([])

  function runAlgorithms() {
    algorithmsInProgress.value = true
    algorithmsCompleted.value = false
    algorithmsCompare.value = false
    optimalActions.value = true

    // clear previous results
    investmentsGreedy.value = []
    investmentsEGreedy.value = []
    investmentsThompson.value = []
    investmentsUCB.value = []
    investmentsGradient.value = []
    investmentsOptimisticInitial.value = []
    investmentsUserAlgorithm.value = []

    if (banditStore.activeBandit == 'bernoulli') {
      greedy_bernoulli()
      eGreedy_bernoulli()
      thompsonSampling_bernoulli()
      upperConfidenceBound_bernoulli()
      OIV_bernoulli()
      gradientBandit_bernoulli()
    } else if (banditStore.activeBandit == 'gaussian') {
      greedy_gaussian()
      eGreedy_gaussian()
      thompsonSampling_gaussian()
      upperConfidenceBound_gaussian()
      OIV_gaussian()
      gradientBandit_gaussian()
    }

    algorithmsInProgress.value = false
    algorithmsCompleted.value = true
  }

  function resetAlgorithms() {
    algorithmsInProgress.value = false
    algorithmsCompleted.value = false
    algorithmsCompare.value = false
    optimalActions.value = true
    investmentsGreedy.value = []
    investmentsEGreedy.value = []
    investmentsThompson.value = []
    investmentsUCB.value = []
    investmentsGradient.value = []
    investmentsOptimisticInitial.value = []
    investmentsUserAlgorithm.value = []
  }

  const createAlgorithmDataPoints = (
    source: Ref<AlgoInvestment[]>,
    accessor: (investment: AlgoInvestment) => number | null,
  ): Ref<DisplayDataPoint[]> => {
    return computed(() => {
      const activeBandit = banditStore.activeBandit as 'bernoulli' | 'gaussian'

      return buildDisplayDataPoints<AlgoInvestment>({
        investments: source.value,
        activeBandit,
        startingCapital: banditStore.startingCapital,
        investmentStep: banditStore.investmentStep,
        getStockName: investment => investment.stock.stock.name,
        getBernoulliResult: activeBandit === 'bernoulli'
          ? investment => {
              const reward = accessor(investment)
              return reward !== null ? reward > 0 : null
            }
          : undefined,
        getGaussianResult: activeBandit === 'gaussian'
          ? accessor
          : undefined,
        formatBanditResult: () => '',
      })
    })
  }

  const greedyDataPoints = createAlgorithmDataPoints(
    investmentsGreedy,
    investment => investment.greedyReturn,
  )

  const thompsonSamplingDataPoints = createAlgorithmDataPoints(
    investmentsThompson,
    investment => investment.thompsonReturn,
  )

  const upperConfidenceBoundDataPoints = createAlgorithmDataPoints(
    investmentsUCB,
    investment => investment.ucbReturn,
  )

  const eGreedyDataPoints = createAlgorithmDataPoints(
    investmentsEGreedy,
    investment => investment.eGreedyReturn,
  )

  const oivDataPoints = createAlgorithmDataPoints(
    investmentsOptimisticInitial,
    investment => investment.optimisticInitialReturn,
  )

  const gradientDataPoints = createAlgorithmDataPoints(
    investmentsGradient,
    investment => investment.gradientReturn,
  )


  return { algorithmsInProgress, algorithmsCompleted, algorithmsCompare, optimalActions, currentCompareParam, investmentsGreedy, investmentsEGreedy, investmentsThompson, investmentsUCB, investmentsGradient, investmentsOptimisticInitial, investmentsUserAlgorithm, runAlgorithms, resetAlgorithms, greedyDataPoints, thompsonSamplingDataPoints, upperConfidenceBoundDataPoints, eGreedyDataPoints, oivDataPoints, gradientDataPoints }
})
