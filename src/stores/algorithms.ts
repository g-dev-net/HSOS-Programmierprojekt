import { ref, computed, type Ref} from 'vue'
import { defineStore } from 'pinia'
import type { AlgoInvestment, DisplayDataPoint } from '@/types/investment'
import { greedy_bernoulli, greedy_gaussian } from '@/algorithms/greedy'
import { useBanditStore } from './bandit'
import { thompsonSampling_bernoulli, thompsonSampling_gaussian } from '@/algorithms/thompsonSampling'
import { upperConfidenceBound_bernoulli, upperConfidenceBound_gaussian } from '@/algorithms/UpperConfidenceBound'

export const useAlgorithmStore = defineStore('algorithm', () => {
  var banditStore = useBanditStore()

  // --------------------- bandit run logic ---------------------
  const algorithmsInProgress = ref(false)
  const algorithmsCompleted = ref(false)

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

    // clear previous results
    investmentsGreedy.value = []
    investmentsThompson.value = []
    investmentsUCB.value = []
    investmentsGradient.value = []
    investmentsOptimisticInitial.value = []
    investmentsUserAlgorithm.value = []

    console.log("run algorithms for bandit: " + banditStore.activeBandit)

    if (banditStore.activeBandit == 'bernoulli') {
      greedy_bernoulli()
      thompsonSampling_bernoulli()
      upperConfidenceBound_bernoulli()
    } else if (banditStore.activeBandit == 'gaussian') {
      greedy_gaussian()
      thompsonSampling_gaussian()
      upperConfidenceBound_gaussian()
    }

    algorithmsInProgress.value = false
    algorithmsCompleted.value = true
  }

  function resetAlgorithms() {
    console.log("reset algorithms")
    algorithmsInProgress.value = false
    algorithmsCompleted.value = false

    investmentsGreedy.value = []
    investmentsThompson.value = []
    investmentsUCB.value = []
    investmentsGradient.value = []
    investmentsOptimisticInitial.value = []
    investmentsUserAlgorithm.value = []
  }

   const greedyDataPoints: Ref<DisplayDataPoint[]> = computed(() => {
    var yCounter = 0;
    var winSum = 0;
    var portfolioValue = banditStore.startingCapital;
    var dataPoints: DisplayDataPoint[] = [];
    dataPoints.push({ x: 0, y: 0, label: "Start", stock: "-", portfolioValue: "10000", banditResult: "-" });

    investmentsGreedy.value.forEach((investment, index) => {
      var isWon = false;
      var winValue = 0;
      if (banditStore.activeBandit === 'bernoulli') {
        isWon = Boolean(investment.greedyReturn);
      } else if (banditStore.activeBandit === 'gaussian' && investment.greedyReturn !== null) {
        isWon = investment.greedyReturn > 0;
        winValue = investment.greedyReturn * banditStore.investmentStep;
        winSum += winValue;
        portfolioValue += winValue;
      }
      if (isWon) {
        yCounter += 1;
      }
      var yValue = 0;
      if (banditStore.activeBandit === 'bernoulli') {
        yValue = yCounter;
      } else if (banditStore.activeBandit === 'gaussian') {
        yValue = winSum;
      }

      dataPoints.push({
        x: index + 1,
        y: yValue,
        label: `Investment ${index + 1}`,
        stock: investment.stock.stock.name,
        portfolioValue: (portfolioValue).toFixed(2),
        banditResult: ""
      });
    })

    return dataPoints;
  })

  const thompsonSamplingDataPoints: Ref<DisplayDataPoint[]> = computed(() => {
    var yCounter = 0;
    var winSum = 0;
    var portfolioValue = banditStore.startingCapital;
    var dataPoints: DisplayDataPoint[] = [];
    dataPoints.push({ x: 0, y: 0, label: "Start", stock: "-", portfolioValue: "10000", banditResult: "-" });

    investmentsThompson.value.forEach((investment, index) => {
      var isWon = false;
      var winValue = 0;
      if (banditStore.activeBandit === 'bernoulli') {
        isWon = Boolean(investment.thompsonReturn);
      } else if (banditStore.activeBandit === 'gaussian' && investment.thompsonReturn !== null) {
        isWon = investment.thompsonReturn > 0;
        winValue = investment.thompsonReturn * banditStore.investmentStep;
        winSum += winValue;
        portfolioValue += winValue;
      }   
      if (isWon) {
        yCounter += 1;
      }
      var yValue = 0;
      if (banditStore.activeBandit === 'bernoulli') {
        yValue = yCounter;
      } else if (banditStore.activeBandit === 'gaussian') {
        yValue = winSum;
      }

      dataPoints.push({
        x: index + 1,
        y: yValue,
        label: `Investment ${index + 1}`,
        stock: investment.stock.stock.name,
        portfolioValue: (portfolioValue).toFixed(2),
        banditResult: ""
      });
    })

    return dataPoints;
  })

  const upperConfidenceBoundDataPoints: Ref<DisplayDataPoint[]> = computed(() => {
    var yCounter = 0;
    var winSum = 0;
    var portfolioValue = banditStore.startingCapital;
    var dataPoints: DisplayDataPoint[] = [];
    dataPoints.push({ x: 0, y: 0, label: "Start", stock: "-", portfolioValue: "10000", banditResult: "-" });

    investmentsUCB.value.forEach((investment, index) => {
      var isWon = false;
      var winValue = 0;
      if (banditStore.activeBandit === 'bernoulli') {
        isWon = Boolean(investment.ucbReturn);
      } else if (banditStore.activeBandit === 'gaussian' && investment.ucbReturn !== null) {
        isWon = investment.ucbReturn > 0;
        winValue = investment.ucbReturn * banditStore.investmentStep;
        winSum += winValue;
        portfolioValue += winValue;
      }   
      if (isWon) {
        yCounter += 1;
      }
      var yValue = 0;
      if (banditStore.activeBandit === 'bernoulli') {
        yValue = yCounter;
      } else if (banditStore.activeBandit === 'gaussian') {
        yValue = winSum;
      }

      dataPoints.push({
        x: index + 1,
        y: yValue,
        label: `Investment ${index + 1}`,
        stock: investment.stock.stock.name,
        portfolioValue: (portfolioValue).toFixed(2),
        banditResult: ""
      });
    })

    return dataPoints;
  })


  return { algorithmsInProgress, algorithmsCompleted, investmentsGreedy, investmentsThompson, investmentsUCB, investmentsGradient, investmentsOptimisticInitial, investmentsUserAlgorithm, runAlgorithms, resetAlgorithms, greedyDataPoints, thompsonSamplingDataPoints, upperConfidenceBoundDataPoints }
})
