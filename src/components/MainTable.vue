<script setup lang="ts">
import { computed } from 'vue'
import type { Row, Header } from '@/types/table'

const props = defineProps<{
  headers: Header[]
  rows: Row[]
}>()

const headerKeys = computed(() => props.headers.map(header => Object.keys(header)[0]))

const formattedRows = computed(() => props.rows.map((row, index) => {
  const cells = headerKeys.value.map((key, headerIndex) => ({
    key,
    label: String(props.headers[headerIndex][key]),
    value: formatCellValue(row[key]),
  }))

  const stepRaw = row['x']
  const stepNumber = getNumericValue(stepRaw, index)

  const labelValue = row['label']
  const label = typeof labelValue === 'string' && labelValue.trim().length > 0
    ? labelValue
    : stepNumber === 0
      ? 'Start'
      : `Investment ${stepNumber}`

  const badge = buildBadge(row['banditResult'], cells.find(cell => cell.key === 'banditResult')?.label ?? '')

  const stockCell = cells.find(cell => cell.key === 'stock')
  const hasStockValue = stockCell ? hasDisplayValue(stockCell.value) : false

  return {
    id: `${index}-${label}`,
    label,
    step: stepNumber,
    isStart: stepNumber === 0,
    badge: shouldShowBadge(stepNumber, badge) ? badge : undefined,
    stockCell: hasStockValue ? stockCell : undefined,
    cells: cells.filter(cell => {
      if (cell.key === 'banditResult' || cell.key === 'x') {
        return false
      }

      if (cell.key === 'stock' && !hasStockValue) {
        return false
      }

      return hasDisplayValue(cell.value)
    }),
  }
}))

type BadgeState = 'positive' | 'negative' | 'neutral'

interface BadgeInfo {
  text: string
  state: BadgeState
}

function formatCellValue(value: string | number | undefined): string {
  if (value === undefined || value === null) {
    return '-'
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toString() : value.toFixed(2)
  }

  return value
}

function getNumericValue(value: string | number | undefined, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  return fallback
}

function buildBadge(rawValue: string | number | undefined, label: string): BadgeInfo | undefined {
  if (rawValue === undefined || rawValue === null) {
    return undefined
  }

  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim()

    if (!trimmed || trimmed === '-') {
      return undefined
    }

    if (trimmed === 'Gewinn' || trimmed === 'Verlust') {
      const state: BadgeState = trimmed === 'Gewinn' ? 'positive' : 'negative'

      return {
        text: trimmed === 'Gewinn' ? 'Gewonnen' : 'Verloren',
        state,
      }
    }

    const numeric = Number(trimmed.replace(',', '.'))

    if (!Number.isNaN(numeric)) {
      return buildNumericBadge(numeric, label)
    }

    return {
      text: trimmed,
      state: 'neutral',
    }
  }

  if (typeof rawValue === 'number') {
    return buildNumericBadge(rawValue, label)
  }

  return undefined
}

function buildNumericBadge(value: number, label: string): BadgeInfo {
  const state: BadgeState = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'
  const suffix = label.toLowerCase().includes('€') ? ' €' : ''
  const absolute = Math.abs(value)
  const formatted = `${value > 0 ? '+' : value < 0 ? '-' : ''}${absolute.toFixed(2)}${suffix}`

  return {
    text: formatted,
    state,
  }
}

function hasDisplayValue(value: string | undefined) {
  if (!value) {
    return false
  }

  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed !== '-'
}

function shouldShowBadge(step: number, badge: BadgeInfo | undefined) {
  if (!badge) {
    return false
  }

  if (step === 0 && badge.text === '-') {
    return false
  }

  return true
}
</script>

<template>
  <div class="investment-table">
    <div
      v-for="row in formattedRows"
      :key="row.id"
      class="investment-table__item"
      :class="{ 'investment-table__item--start': row.isStart }"
    >
      <div class="investment-table__header">
        <div class="investment-table__title">
          <span class="investment-table__step">{{ row.step }}</span>
          <div class="investment-table__label-group">
            <div class="investment-table__label-row">
              <span class="investment-table__label">{{ row.label }}</span>
              <span
                v-if="row.stockCell"
                class="investment-table__stock-inline"
              >
                <span class="investment-table__stock-inline-label">{{ row.stockCell.label }}</span>
                <span class="investment-table__stock-inline-value">{{ row.stockCell.value }}</span>
              </span>
            </div>
          </div>
        </div>
        <div
          v-if="row.badge"
          class="investment-table__badge"
          :class="`investment-table__badge--${row.badge.state}`"
        >
          {{ row.badge.text }}
        </div>
      </div>
      <div class="investment-table__grid" v-if="row.cells.length">
        <div
          v-for="cell in row.cells"
          :key="cell.key"
          class="investment-table__cell"
          :class="[{ 'investment-table__cell--stock': cell.key === 'stock' }]"
        >
          <span class="investment-table__cell-label">{{ cell.label }}</span>
          <span class="investment-table__cell-value">{{ cell.value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.investment-table {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.investment-table__item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1rem 1.25rem;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.investment-table__item:hover {
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.investment-table__item--start {
  border-style: dashed;
  opacity: 0.8;
}

.investment-table__header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.25rem;
}

.investment-table__title {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1 1 auto;
  min-width: 0;
}

.investment-table__step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  font-weight: bold;
  font-size: 1rem;
}

.investment-table__label-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.investment-table__label-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.investment-table__label {
  font-size: 1.25rem;
  font-weight: 600;
}

.investment-table__badge {
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-weight: 600;
  letter-spacing: 0.02em;
  font-size: 0.95rem;
  margin-left: auto;
}

.investment-table__stock-inline {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.investment-table__stock-inline-label {
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.75rem;
}

.investment-table__stock-inline-value {
  font-weight: 600;
}

.investment-table__badge--positive {
  background: rgba(17, 227, 116, 0.15);
  color: #61ffa0;
}

.investment-table__badge--negative {
  background: rgba(255, 45, 85, 0.15);
  color: #ff6b81;
}

.investment-table__badge--neutral {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.8);
}

.investment-table__grid {
  display: flex;
  align-items: center;
  gap: 0 1.5rem;
  margin-top: 1rem;
  flex-wrap: nowrap;
  display: none;
}

.investment-table__cell {
  display: flex;
  flex: 1;
  min-width: 140px;
  flex-direction: column;
  gap: 0.25rem;
}

.investment-table__cell--stock {
  display: none;
}

.investment-table__cell-label {
  color: var(--text-secondary);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.investment-table__cell-value {
  color: var(--text-primary);
  font-size: 1.05rem;
  font-weight: 600;
}

@media (max-width: 1024px) {
  .investment-table__grid {
    gap: 0.75rem 1.5rem;
  }

  .investment-table__cell {
    min-width: 160px;
  }
}

@media (max-width: 860px) {
  .investment-table__stock-inline {
    display: none;
  }

  .investment-table__grid {
    flex-wrap: wrap;
    gap: 1rem 1.5rem;
    display: flex;
  }

  .investment-table__cell {
    flex: 1 1 160px;
  }

  .investment-table__cell--stock {
    display: flex;
  }
}

@media (max-width: 768px) {
  .investment-table__item {
    padding: 0.85rem 1rem;
  }

  .investment-table__label {
    font-size: 1.1rem;
  }
}
</style>
