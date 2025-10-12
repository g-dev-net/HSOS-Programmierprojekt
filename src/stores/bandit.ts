import { ref, computed, type Ref } from 'vue'
import { defineStore } from 'pinia'
import type { selectedStock } from '@/types/bandits'
import type { DisplayDataPoint, Investment } from '@/types/investment'
import { bernoulli } from '@/bandits/bernoulli'
import { gaussian } from '@/bandits/gaussian'

export const useBanditStore = defineStore('bandit', () => {

  // --------------------- general values ---------------------
  const bandits = [
    { name: 'Bernoulli-Bandit', key: 'bernoulli' },
    { name: 'Gaussian-Bandit', key: 'gaussian' },
  ];
  const activeBandit: Ref<string> = ref(bandits[0].key);

  const startingCapital = ref(10000)
  const currentCapital: Ref<number> = computed(() => { return parseFloat(displayData.value[investments.value.length].portfolioValue) })
  const remainingCapital = computed(() => { return startingCapital.value - (investmentStep.value * investments.value.length) })
  const possibleInvestments = ref(10)
  const investmentStep = computed(() => (startingCapital.value / possibleInvestments.value))
  const bernoutliPortfolioSubtitle = computed(() => {
    return investments.value.filter(inv => inv.bernoulliReturn === true).length;
  })

  const gaussianPortfolioSubtitle: Ref<number> = computed(() => {
    return parseFloat(investments.value
      .filter(inv => inv.gaussianReturn !== null)
      .reduce((sum, inv) => sum + (inv.gaussianReturn! * investmentStep.value), 0)
      .toFixed(2));
  })

  // Liste mit den ausgewählten Aktien und deren Parametern
  const selectedStocks = ref<selectedStock[]>([])

  // --------------------- bandit run logic ---------------------
  const banditInProgress = ref(false)

  // list of investments
  const investments = ref<Investment[]>([])

  const isInvestmentPossible = computed(() => {
    return investments.value.length < possibleInvestments.value;
  });

  const resetBandit = () => {
    investments.value = [];
    banditInProgress.value = false;
  }

  const displayData = computed(() => {
    var yCounter = 0;
    var winSum = 0;
    var portfolioValue = startingCapital.value;
    var dataPoints: DisplayDataPoint[] = [];
    dataPoints.push({ x: 0, y: 0, label: "Start", stock: "-", portfolioValue: "10000", banditResult: "-" });

    investments.value.forEach((investment, index) => {
      var isWon = false;
      var winValue = 0;
      if (investment.bernoulliReturn !== null) {
        isWon = investment.bernoulliReturn;
      } else if (investment.gaussianReturn !== null) {
        isWon = investment.gaussianReturn > 0;
        winValue = investment.gaussianReturn * investmentStep.value;
        winSum += winValue;
        portfolioValue += winValue;
      }
      if (isWon) {
        yCounter += 1;
      }
      var yValue = 0;
      if (activeBandit.value === 'bernoulli') {
        yValue = yCounter;
      } else if (activeBandit.value === 'gaussian') {
        yValue = winSum;
      }

      dataPoints.push({
        x: index + 1,
        y: yValue,
        label: `Investment ${index + 1}`,
        stock: investment.stock.stock.name,
        portfolioValue: (portfolioValue).toFixed(2),
        banditResult: investment.bernoulliReturn !== null ? (investment.bernoulliReturn ? "Gewinn" : "Verlust") : (investment.gaussianReturn !== null ? winValue.toFixed(2) : "-")
      });
    })

    return dataPoints;
  });

  // pull arm function
  const pullArm = (algorithm: string, stock: selectedStock) => {
    if (!isInvestmentPossible.value) {
      return;
    }

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

  return { bandits, activeBandit, selectedStocks, startingCapital, currentCapital, remainingCapital, possibleInvestments, investmentStep, investments, banditInProgress, pullArm, displayData, isInvestmentPossible, resetBandit, bernoutliPortfolioSubtitle, gaussianPortfolioSubtitle}
})
