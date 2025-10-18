import { describe, it, expect } from 'vitest'
import { buildDisplayDataPoints } from '@/stores/utils/displayData'

describe('buildDisplayDataPoints', () => {
  it('erstellt Bernoulli-Datenpunkte mit kumulativer Trefferzahl und Standardlabeln', () => {
    const result = buildDisplayDataPoints({
      investments: [
        { id: 'a', outcome: true },
        { id: 'b', outcome: false },
        { id: 'c', outcome: true }
      ],
      activeBandit: 'bernoulli',
      startingCapital: 100,
      investmentStep: 10,
      getStockName: investment => investment.id,
      getBernoulliResult: investment => investment.outcome
    })

    expect(result).toHaveLength(4)

    expect(result[0]).toEqual({
      x: 0,
      y: 0,
      label: 'Start',
      stock: '-',
      portfolioValue: '100.00',
      banditResult: '-'
    })

    expect(result[1]).toMatchObject({
      x: 1,
      y: 1,
      label: 'Investment 1',
      stock: 'a',
      banditResult: 'Gewinn'
    })

    expect(result[2]).toMatchObject({
      x: 2,
      y: 1,
      label: 'Investment 2',
      stock: 'b',
      banditResult: 'Verlust'
    })

    expect(result[3]).toMatchObject({
      x: 3,
      y: 2,
      portfolioValue: '100.00'
    })
  })

  it('berechnet für Gaussian-Banditen kumulative Gewinne und Portfolioverlauf', () => {
    const result = buildDisplayDataPoints({
      investments: [
        { id: 'a', gaussian: 0.2 },
        { id: 'b', gaussian: -0.05 }
      ],
      activeBandit: 'gaussian',
      startingCapital: 1_000,
      investmentStep: 100,
      getStockName: investment => investment.id,
      getGaussianResult: investment => investment.gaussian
    })

    expect(result).toHaveLength(3)

    expect(result[1]).toMatchObject({
      x: 1,
      y: 20,
      portfolioValue: '1020.00',
      banditResult: '20.00'
    })

    expect(result[2]).toMatchObject({
      x: 2,
      y: 15,
      portfolioValue: '1015.00',
      banditResult: '-5.00'
    })
  })
})
