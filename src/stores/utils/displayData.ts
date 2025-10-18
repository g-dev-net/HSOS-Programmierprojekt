import type { DisplayDataPoint } from '@/types/investment';

interface BuildDisplayDataPointsOptions<T> {
  investments: readonly T[];
  activeBandit: 'bernoulli' | 'gaussian';
  startingCapital: number;
  investmentStep: number;
  getStockName: (investment: T) => string;
  getBernoulliResult?: (investment: T) => boolean | null;
  getGaussianResult?: (investment: T) => number | null;
  formatBanditResult?: (context: {
    bernoulli: boolean | null;
    gaussianReturn: number | null;
    gain: number;
  }) => string;
}

export function buildDisplayDataPoints<T>(options: BuildDisplayDataPointsOptions<T>): DisplayDataPoint[] {
  const {
    investments,
    activeBandit,
    startingCapital,
    investmentStep,
    getStockName,
    getBernoulliResult,
    getGaussianResult,
    formatBanditResult,
  } = options;

  let successCount = 0;
  let gaussianSum = 0;
  let portfolioValue = startingCapital;

  const dataPoints: DisplayDataPoint[] = [
    {
      x: 0,
      y: 0,
      label: 'Start',
      stock: '-',
      portfolioValue: startingCapital.toFixed(2),
      banditResult: '-',
    },
  ];

  investments.forEach((investment, index) => {
    const bernoulliResult = getBernoulliResult ? getBernoulliResult(investment) : null;
    const gaussianReturn = getGaussianResult ? getGaussianResult(investment) : null;

    let isSuccess = false;
    let gain = 0;

    if (bernoulliResult !== null) {
      isSuccess = bernoulliResult;
    } else if (gaussianReturn !== null) {
      gain = gaussianReturn * investmentStep;
      gaussianSum += gain;
      portfolioValue += gain;
      isSuccess = gaussianReturn > 0;
    }

    if (isSuccess) {
      successCount += 1;
    }

    const yValue = activeBandit === 'bernoulli'
      ? successCount
      : parseFloat(gaussianSum.toFixed(2));

    const banditResult = formatBanditResult
      ? formatBanditResult({ bernoulli: bernoulliResult, gaussianReturn, gain })
      : bernoulliResult !== null
        ? (bernoulliResult ? 'Gewinn' : 'Verlust')
        : gaussianReturn !== null
          ? gain.toFixed(2)
          : '-';

    dataPoints.push({
      x: index + 1,
      y: yValue,
      label: `Investment ${index + 1}`,
      stock: getStockName(investment),
      portfolioValue: portfolioValue.toFixed(2),
      banditResult,
    });
  });

  return dataPoints;
}
