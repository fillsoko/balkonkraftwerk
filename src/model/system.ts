/**
 * Energiemodell: von der Einstrahlung über die Erzeugung zum vermiedenen Netzbezug.
 *
 * Gerechnet wird stündlich über zwölf repräsentative Tage (einer je Monat), die
 * jeweils in drei Wettertypen zerfallen — sonnig, mittel, trüb. Erst diese
 * Streuung erzeugt die Überschussspitzen, an denen sich entscheidet, ob ein
 * Speicher überhaupt etwas einsammeln kann. Ein Monatsmittelwert würde die
 * Spitzen glattbügeln und den Speicher systematisch zu gut aussehen lassen.
 */

import { poaDay, DAYS_IN_MONTH, MONTH_NAMES } from './solar'
import type { Config, EnergyResult, LoadProfileId } from './types'

export { MONTH_NAMES }

/** Wettertypen: [Anteil der Tage, Ertragsfaktor gegenüber dem Mitteltag]. */
const DAY_TYPES: [number, number][] = [
  [0.30, 2.00],
  [0.40, 1.00],
  [0.30, 0.33],
]

/** Saisonale Verteilung des Haushaltsverbrauchs, Anteil am Jahr in %. */
const CONSUMPTION_SHARE = [9.5, 8.7, 8.7, 7.8, 7.6, 7.3, 7.4, 7.4, 7.8, 8.5, 9.1, 10.2]

/**
 * Tagesverläufe der variablen Last (über der Grundlast), stündlich 0–23 Uhr.
 * Werden im Code auf Summe 1 normiert.
 */
const LOAD_PROFILES: Record<LoadProfileId, { label: string; hint: string; shape: number[]; match: number }> = {
  homeoffice: {
    label: 'Homeoffice',
    hint: 'tagsüber zu Hause, gleichmäßige Last',
    shape: [0.2, 0.15, 0.15, 0.15, 0.2, 0.5, 1.1, 1.3, 1.2, 1.1, 1.1, 1.2, 1.3, 1.2, 1.1, 1.1, 1.2, 1.5, 1.7, 1.6, 1.3, 1.0, 0.7, 0.35],
    match: 0.78,
  },
  berufstaetig: {
    label: 'Berufstätig',
    hint: 'tagsüber außer Haus, Abendspitze',
    shape: [0.2, 0.15, 0.15, 0.15, 0.2, 0.6, 1.4, 1.5, 0.7, 0.4, 0.35, 0.35, 0.4, 0.35, 0.35, 0.4, 0.9, 1.8, 2.2, 2.1, 1.7, 1.2, 0.8, 0.4],
    match: 0.6,
  },
  abends: {
    label: 'Abends aktiv',
    hint: 'später Feierabend, Last nach 18 Uhr',
    shape: [0.3, 0.2, 0.15, 0.15, 0.2, 0.4, 0.9, 1.1, 0.6, 0.4, 0.35, 0.4, 0.5, 0.4, 0.35, 0.4, 0.8, 1.6, 2.3, 2.4, 2.1, 1.7, 1.1, 0.5],
    match: 0.55,
  },
  familie: {
    label: 'Familie',
    hint: 'Morgen- und Abendspitze, Wäsche tagsüber',
    shape: [0.25, 0.2, 0.15, 0.15, 0.25, 0.8, 1.6, 1.7, 1.2, 1.0, 1.0, 1.1, 1.2, 1.0, 0.9, 1.0, 1.3, 1.9, 2.1, 1.9, 1.5, 1.1, 0.7, 0.4],
    match: 0.7,
  },
}

export const LOAD_PROFILE_OPTIONS = (Object.keys(LOAD_PROFILES) as LoadProfileId[]).map((id) => ({
  id,
  label: LOAD_PROFILES[id].label,
  hint: LOAD_PROFILES[id].hint,
}))

/** Restanteil der Einstrahlung, wenn die Sonne unter dem Horizont-Hindernis steht. */
const BLOCKED_RESIDUAL = 0.35

export function kwpOf(c: Config): number {
  return (c.panelCount * c.wpPerPanel) / 1000
}

export function batteryKwhOf(c: Config): number {
  return c.batteryUnits * c.batteryUnitKwh
}

/**
 * Energiebilanz eines Betriebsjahres.
 *
 * @param year 1-basiert; steuert Degradation
 * @param overrides erlaubt Vergleichsrechnungen (z. B. ohne Speicher)
 */
export function simulate(
  c: Config,
  year = 1,
  overrides?: { batteryKwh?: number; standbyW?: number },
): EnergyResult {
  const kwp = kwpOf(c)
  const batteryNominal = overrides?.batteryKwh ?? batteryKwhOf(c)
  const standbyW = overrides?.standbyW ?? c.standbyW

  const degradationFactor = Math.pow(1 - c.degradation, year - 1)
  const usableCapacity = batteryNominal * c.depthOfDischarge
  const acLimitKwh = c.acLimitW / 1000 // je Stunde

  const profile = LOAD_PROFILES[c.loadProfile]
  const shapeSum = profile.shape.reduce((a, b) => a + b, 0)

  // Grundlast kann den Jahresverbrauch nicht überschreiten.
  const baseAnnual = (c.baseLoadW * 8760) / 1000
  const baseShare = Math.min(baseAnnual, c.annualConsumption * 0.95)
  const variableAnnual = Math.max(0, c.annualConsumption - baseShare)

  const dayTypeNorm = DAY_TYPES.reduce((a, [w, f]) => a + w * f, 0)

  const totals = {
    generation: 0, clipped: 0, standby: 0, direct: 0, fromBattery: 0,
    toBattery: 0, storageLoss: 0, feedIn: 0,
  }
  const monthlyGeneration: number[] = []
  const monthlyAvoided: number[] = []
  let sampleDay: EnergyResult['sampleDay'] = { pv: [], load: [], soc: [] }

  for (let m = 0; m < 12; m++) {
    const days = DAYS_IN_MONTH[m]
    const irradiance = poaDay(m, c.tilt, c.azimuth)

    // Laubverschattung nur in der Vegetationsperiode (Mai–Oktober).
    const leafy = m >= 4 && m <= 9
    const shading = c.shadingFactor * (leafy ? c.foliageShading : 1)

    // Tageswerte für Verbrauch. Die Grundlast läuft konstant durch, der
    // variable Anteil folgt der saisonalen Verteilung.
    const baseDay = baseShare / 365
    const variableMonth =
      variableAnnual * (CONSUMPTION_SHARE[m] / 100)
    const variableDay = variableMonth / days
    const standbyDay = (standbyW * 24) / 1000

    let monthGen = 0
    let monthAvoided = 0

    for (const [weight, factor] of DAY_TYPES) {
      const nDays = days * weight
      let soc = 0
      const dayPv: number[] = []
      const dayLoad: number[] = []
      const daySoc: number[] = []

      for (let h = 0; h < 24; h++) {
        const { poa, elevation } = irradiance[h]

        // Horizontverschattung: unter der Hindernishöhe bleibt nur Diffuslicht.
        const horizonFactor = poa > 0 && elevation < c.horizonElevation ? BLOCKED_RESIDUAL : 1

        // Rohertrag DC: POA [kWh/m²] × kWp entspricht der STC-Definition.
        const pv =
          poa *
          (factor / dayTypeNorm) *
          kwp *
          shading *
          horizonFactor *
          (1 - c.systemLosses) *
          degradationFactor

        const load =
          baseDay / 24 +
          (variableDay * profile.shape[h]) / shapeSum +
          standbyDay / 24

        // Nur ein Teil der Stundenlast fällt zeitlich wirklich mit der Erzeugung
        // zusammen; kurze Spitzen und Erzeugungslücken innerhalb der Stunde
        // müssen aus Speicher oder Netz kommen.
        // Die AC-Grenze wirkt auf die Ausgabe ins Haus, nicht auf die DC-seitige
        // Ladung des Speichers — der STREAM lädt auch oberhalb von 800 W weiter.
        const direct = Math.min(pv, load * profile.match, acLimitKwh)
        const restLoad = load - direct
        const surplus = pv - direct

        const charge = Math.max(0, Math.min(surplus, usableCapacity - soc))
        soc += charge

        // Was weder verbraucht noch gespeichert wird, geht bis zur AC-Grenze
        // ins Netz; darüber hinaus regelt der Wechselrichter ab.
        const exportable = surplus - charge
        const feed = Math.min(exportable, Math.max(0, acLimitKwh - direct))
        const clippedHour = exportable - feed

        const discharge = Math.min(soc, restLoad / c.roundTripEfficiency, acLimitKwh)
        soc -= discharge
        const delivered = discharge * c.roundTripEfficiency

        totals.generation += (pv - clippedHour) * nDays
        totals.clipped += clippedHour * nDays
        totals.direct += direct * nDays
        totals.fromBattery += delivered * nDays
        totals.toBattery += charge * nDays
        totals.storageLoss += (discharge - delivered) * nDays
        totals.feedIn += feed * nDays

        monthGen += (pv - clippedHour) * nDays
        monthAvoided += (direct + delivered) * nDays

        // Für die Anzeige wird der sonnige Tagtyp erfasst — an ihm zeigt sich
        // das Zusammenspiel von Erzeugung, Last und Speicher am deutlichsten.
        if (m === 5 && factor === 2.0) {
          dayPv.push(pv)
          dayLoad.push(load)
          daySoc.push(usableCapacity > 0 ? soc / usableCapacity : 0)
        }
      }
      if (m === 5 && factor === 2.0 && dayPv.length === 24) {
        sampleDay = { pv: dayPv, load: dayLoad, soc: daySoc }
      }
    }

    totals.standby += standbyDay * days
    monthlyGeneration.push(monthGen)
    monthlyAvoided.push(Math.max(0, monthAvoided - standbyDay * days))
  }

  const selfUsed = totals.direct + totals.fromBattery
  const avoidedGrid = Math.max(0, selfUsed - totals.standby)

  return {
    generation: totals.generation,
    clipped: totals.clipped,
    standby: totals.standby,
    direct: totals.direct,
    fromBattery: totals.fromBattery,
    toBattery: totals.toBattery,
    storageLoss: totals.storageLoss,
    feedIn: totals.feedIn,
    selfUsed,
    avoidedGrid,
    selfUseRate: totals.generation > 0 ? selfUsed / totals.generation : 0,
    autarky: c.annualConsumption > 0 ? avoidedGrid / c.annualConsumption : 0,
    fullCycles: usableCapacity > 0 ? totals.toBattery / usableCapacity : 0,
    monthlyGeneration,
    monthlyAvoided,
    sampleDay,
  }
}
