import { ref, computed} from 'vue'
import { defineStore } from 'pinia'
import type { selectedStock } from '@/types/bandits'
import type { DisplayDataPoint, Investment } from '@/types/investment'
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

  const displayData = computed(() => {
    var yCounter = 0;
    var portfolioValue = startingCapital.value;
    var dataPoints: DisplayDataPoint[] = [];
    dataPoints.push({ x: 0, y: 0, label: "Start", stock: "-", portfolioValue: "10000", banditResult: "-", winLos: "-" });

    investments.value.forEach((investment, index) => {
      var isWon = false;
      var winValue = 0;
      if (investment.bernoulliReturn !== null) {
        isWon = investment.bernoulliReturn;
      } else if (investment.gaussianReturn !== null) {
        isWon = investment.gaussianReturn > 0;
        winValue = investment.gaussianReturn * investmentStep.value;
      }
      if (isWon) {
        yCounter += 1;
        portfolioValue += winValue;
      }

      dataPoints.push({
        x: index + 1,
        y: yCounter,
        label: `Investment ${index + 1}`,
        stock: investment.stock.stock.name,
        portfolioValue: (portfolioValue).toFixed(2),
        banditResult: investment.bernoulliReturn !== null ? (investment.bernoulliReturn ? "Gewinn" : "Verlust") : (investment.gaussianReturn !== null ? (investment.gaussianReturn > 0 ? `Gewinn` : `Verlust`) : "-"),
        winLos: winValue.toFixed(2)
      });
    })

    return dataPoints;
  });

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

  return { selectedStocks, startingCapital, remainingCapital, possibleInvestments, investmentStep, investments, banditInProgress, pullArm, displayData }
})
