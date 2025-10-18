import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MainTable from '@/components/MainTable.vue'
import type { Header } from '@/types/table'

const gaussianHeaders: Header[] = [
  { x: 'Investment' },
  { stock: 'Aktie' },
  { banditResult: 'Ergebnis (€)' },
  { portfolioValue: 'Portfolio-Stand' }
]

const bernoulliHeaders: Header[] = [
  { x: 'Investment' },
  { stock: 'Aktie' },
  { banditResult: 'Gewonnen' }
]

describe('MainTable', () => {
  it('zeigt numerische Ergebnisse mit Badge und Euro-Suffix an', () => {
    const wrapper = mount(MainTable, {
      props: {
        headers: gaussianHeaders,
        rows: [
          { x: 0, label: 'Start', stock: '-', banditResult: '-', portfolioValue: '100.00' },
          { x: 1, label: '', stock: 'ACME Corp', banditResult: '15.00', portfolioValue: '115.00' }
        ]
      }
    })

    const rows = wrapper.findAll('.investment-table__item')
    expect(rows).toHaveLength(2)

    const secondRow = rows[1]
    expect(secondRow.text()).toContain('Investment 1')
    expect(secondRow.text()).toContain('ACME Corp')

    const badge = secondRow.get('.investment-table__badge')
    expect(badge.text()).toBe('+15.00 €')
    expect(badge.classes()).toContain('investment-table__badge--positive')
  })

  it('formatiert Bernoulli-Ergebnisse als Gewinn/Verlust-Badges', () => {
    const wrapper = mount(MainTable, {
      props: {
        headers: bernoulliHeaders,
        rows: [
          { x: 0, label: 'Start', stock: '-', banditResult: '-' },
          { x: 1, label: 'Eigener Text', stock: 'Stock X', banditResult: 'Gewinn' },
          { x: 2, label: '', stock: 'Stock Y', banditResult: 'Verlust' }
        ]
      }
    })

    const rows = wrapper.findAll('.investment-table__item')
    expect(rows).toHaveLength(3)

    const winBadge = rows[1].get('.investment-table__badge')
    expect(winBadge.text()).toBe('Gewonnen')
    expect(winBadge.classes()).toContain('investment-table__badge--positive')

    const lossBadge = rows[2].get('.investment-table__badge')
    expect(lossBadge.text()).toBe('Verloren')
    expect(lossBadge.classes()).toContain('investment-table__badge--negative')

    expect(rows[2].text()).toContain('Investment 2')
  })
})
