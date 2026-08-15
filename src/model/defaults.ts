import type { Config } from './types'

/**
 * Ausgangslage: EcoFlow STREAM Komplettset M am Südbalkon der Zaubzerstraße 37,
 * 1. Obergeschoss, senkrecht am Geländer, mäßige Baumverschattung.
 */
export const DEFAULT_CONFIG: Config = {
  panelCount: 2,
  wpPerPanel: 500,
  tilt: 90,
  azimuth: 0,

  horizonElevation: 12,
  shadingFactor: 0.9,
  foliageShading: 0.85,

  batteryUnits: 1,
  batteryUnitKwh: 1.92,
  depthOfDischarge: 0.95,
  roundTripEfficiency: 0.85,
  standbyW: 8,
  acLimitW: 800,
  systemLosses: 0.12,
  degradation: 0.005,

  annualConsumption: 2500,
  baseLoadW: 150,
  loadProfile: 'homeoffice',

  electricityPriceCt: 32.44,
  priceEscalation: 0.02,
  feedInCt: 0,
  discountRate: 0.02,
  horizonYears: 20,

  setPrice: 840.65,
  extraBatteryPrice: 520,
  extraPanelPrice: 160,
  mountingCost: 80,
  cablingCost: 35,
  opexPerYear: 5,
  subsidy: 320,
  replacementYear: 0,
  replacementCost: 450,
}

/** Vorgefertigte Szenarien zum Vergleichen. */
export const PRESETS: { id: string; label: string; hint: string; patch: Partial<Config> }[] = [
  {
    id: 'normal',
    label: 'Realistisch',
    hint: 'Senkrecht am Geländer, mäßige Verschattung, Förderung beantragt',
    patch: {},
  },
  {
    id: 'worst',
    label: 'Pessimistisch',
    hint: 'Starke Verschattung, hohes Standby, keine Förderung, Ersatz in Jahr 12',
    patch: {
      tilt: 90,
      horizonElevation: 22,
      shadingFactor: 0.78,
      foliageShading: 0.7,
      standbyW: 14,
      roundTripEfficiency: 0.8,
      annualConsumption: 1800,
      baseLoadW: 100,
      loadProfile: 'berufstaetig',
      electricityPriceCt: 28,
      priceEscalation: 0,
      discountRate: 0.03,
      subsidy: 0,
      mountingCost: 140,
      opexPerYear: 10,
      replacementYear: 12,
      replacementCost: 450,
    },
  },
  {
    id: 'best',
    label: 'Optimistisch',
    hint: 'Aufgeständert 30°, wenig Verschattung, hoher Verbrauch, Förderung',
    patch: {
      tilt: 30,
      horizonElevation: 6,
      shadingFactor: 0.95,
      foliageShading: 0.94,
      standbyW: 4,
      roundTripEfficiency: 0.9,
      annualConsumption: 3500,
      baseLoadW: 220,
      loadProfile: 'homeoffice',
      electricityPriceCt: 36,
      priceEscalation: 0.035,
      discountRate: 0.01,
      subsidy: 320,
      mountingCost: 90,
      opexPerYear: 0,
      replacementYear: 0,
    },
  },
  {
    id: 'nobattery',
    label: 'Ohne Speicher',
    hint: 'Nur Module und Mikrowechselrichter — die Renditevariante',
    patch: {
      batteryUnits: 0,
      standbyW: 2,
      setPrice: 840.65,
    },
  },
  {
    id: 'maxed',
    label: 'Ausgebaut',
    hint: '4 Module aufgeständert, zwei Speichereinheiten',
    patch: {
      panelCount: 4,
      tilt: 30,
      batteryUnits: 2,
      horizonElevation: 8,
      shadingFactor: 0.93,
      foliageShading: 0.9,
      annualConsumption: 3500,
      baseLoadW: 200,
    },
  },
]

/** Münchner FKG-Förderung: 0,40 €/Wp, gedeckelt auf 800 Wp je Wohneinheit. */
export function munichSubsidy(c: Config): number {
  return Math.min(c.panelCount * c.wpPerPanel, 800) * 0.4
}
