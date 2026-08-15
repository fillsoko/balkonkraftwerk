/**
 * Finanzmodell: Kapitalwert, interner Zinsfuß, Amortisation, Stromgestehungskosten.
 *
 * Bewertet wird der tatsächlich vermiedene Netzbezug, nicht die "selbst genutzte"
 * Energie. Der Unterschied ist das Standby des Speichergeräts: Es ist eine Last,
 * die es ohne die Anlage nicht gäbe, und wird deshalb voll gegengerechnet.
 */

import { simulate, kwpOf, batteryKwhOf } from './system'
import { orientationFactor } from './solar'
import type { CashflowRow, Config, FinanceResult, Result } from './types'

export function capexGross(c: Config): number {
  const extraPanels = Math.max(0, c.panelCount - 2) * c.extraPanelPrice
  const extraBatteries = Math.max(0, c.batteryUnits - 1) * c.extraBatteryPrice
  // Ohne Speicher entfällt der Anteil des Speichers am Setpreis.
  const base = c.batteryUnits === 0 ? c.setPrice - c.extraBatteryPrice : c.setPrice
  return Math.max(0, base) + extraPanels + extraBatteries + c.mountingCost + c.cablingCost
}

export function subsidyEffective(c: Config): number {
  return Math.min(c.subsidy, 0.5 * capexGross(c))
}

export function capexNet(c: Config): number {
  return capexGross(c) - subsidyEffective(c)
}

export function buildCashflows(c: Config): CashflowRow[] {
  const net = capexNet(c)
  const rows: CashflowRow[] = [{
    year: 0, generation: 0, avoidedGrid: 0, feedIn: 0, price: 0,
    savings: 0, feedInRevenue: 0, costs: net,
    cashflow: -net, cumulative: -net, discounted: -net, cumulativeDiscounted: -net,
  }]

  let cumulative = -net
  let cumulativeDiscounted = -net

  for (let y = 1; y <= c.horizonYears; y++) {
    const e = simulate(c, y)
    const price = (c.electricityPriceCt / 100) * Math.pow(1 + c.priceEscalation, y - 1)
    const savings = e.avoidedGrid * price
    const feedInRevenue = (e.feedIn * c.feedInCt) / 100

    let costs = c.opexPerYear
    if (c.replacementYear > 0 && y === c.replacementYear) costs += c.replacementCost

    const cashflow = savings + feedInRevenue - costs
    cumulative += cashflow
    const discounted = cashflow / Math.pow(1 + c.discountRate, y)
    cumulativeDiscounted += discounted

    rows.push({
      year: y,
      generation: e.generation,
      avoidedGrid: e.avoidedGrid,
      feedIn: e.feedIn,
      price: price * 100,
      savings, feedInRevenue, costs, cashflow,
      cumulative, discounted, cumulativeDiscounted,
    })
  }
  return rows
}

function payback(rows: CashflowRow[], key: 'cumulative' | 'cumulativeDiscounted'): number | null {
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][key] >= 0) {
      const prev = rows[i - 1][key]
      const cur = rows[i][key]
      if (cur === prev) return rows[i].year
      return rows[i - 1].year + -prev / (cur - prev)
    }
  }
  return null
}

function irr(rows: CashflowRow[]): number | null {
  const flows = rows.map((r) => r.cashflow)
  const f = (rate: number) => flows.reduce((a, cf, i) => a + cf / Math.pow(1 + rate, i), 0)

  let lo = -0.95
  let hi = 2.0
  if (f(lo) * f(hi) > 0) return null
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (f(lo) * f(mid) <= 0) hi = mid
    else lo = mid
  }
  return (lo + hi) / 2
}

function lcoe(c: Config, rows: CashflowRow[]): number {
  let cost = capexNet(c)
  let energy = 0
  for (const r of rows.slice(1)) {
    cost += r.costs / Math.pow(1 + c.discountRate, r.year)
    energy += (r.avoidedGrid + r.feedIn) / Math.pow(1 + c.discountRate, r.year)
  }
  return energy > 0 ? (cost / energy) * 100 : NaN
}

export function evaluateFinance(c: Config): FinanceResult {
  const rows = buildCashflows(c)
  return {
    capexGross: capexGross(c),
    subsidyEffective: subsidyEffective(c),
    capexNet: capexNet(c),
    rows,
    paybackStatic: payback(rows, 'cumulative'),
    paybackDynamic: payback(rows, 'cumulativeDiscounted'),
    npv: rows[rows.length - 1].cumulativeDiscounted,
    irr: irr(rows),
    lcoeCt: lcoe(c, rows),
    totalSurplus: rows[rows.length - 1].cumulative,
  }
}

export function evaluate(c: Config): Result {
  const energy = simulate(c, 1)
  const kwp = kwpOf(c)
  return {
    kwp,
    batteryKwh: batteryKwhOf(c),
    orientationFactor: orientationFactor(c.tilt, c.azimuth),
    specificYield: kwp > 0 ? energy.generation / kwp : 0,
    energy,
    finance: evaluateFinance(c),
  }
}

/**
 * Nutzen des Speichers isoliert: Vergleich mit derselben Anlage ohne Speicher.
 * Ohne Speicher entfällt auch der größte Teil des Standby-Verbrauchs.
 */
export function batteryValue(c: Config) {
  const withBattery = simulate(c, 1)
  const without = simulate(c, 1, { batteryKwh: 0, standbyW: 2 })
  const price = c.electricityPriceCt / 100

  const deltaKwh = withBattery.avoidedGrid - without.avoidedGrid
  const deltaEur = deltaKwh * price
  const extraCost = c.batteryUnits * c.extraBatteryPrice

  return {
    withBattery: withBattery.avoidedGrid,
    without: without.avoidedGrid,
    deltaKwh,
    deltaEur,
    extraCost,
    paybackYears: deltaEur > 0.5 ? extraCost / deltaEur : Infinity,
    selfUseWith: withBattery.selfUseRate,
    selfUseWithout: without.selfUseRate,
    cycles: withBattery.fullCycles,
  }
}
