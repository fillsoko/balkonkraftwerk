export type LoadProfileId = 'homeoffice' | 'berufstaetig' | 'abends' | 'familie'

export interface Config {
  // --- Generator ---
  /** Anzahl Module */
  panelCount: number
  /** Nennleistung je Modul in Wp */
  wpPerPanel: number
  /** Neigung gegen die Horizontale, 0° = flach liegend, 90° = senkrecht */
  tilt: number
  /** Abweichung von Süden in Grad, negativ = Ost, positiv = West */
  azimuth: number

  // --- Verschattung ---
  /** Sonnenhöhe in Grad, unterhalb derer die Direktstrahlung blockiert ist */
  horizonElevation: number
  /** Ganzjährige Teilverschattung, 1,0 = frei */
  shadingFactor: number
  /** Zusätzliche Verschattung durch Laub, nur Mai–Oktober */
  foliageShading: number

  // --- Technik ---
  /** Anzahl Speichereinheiten à batteryUnitKwh */
  batteryUnits: number
  /** Nennkapazität je Einheit in kWh */
  batteryUnitKwh: number
  /** Nutzbare Entladetiefe */
  depthOfDischarge: number
  /** Round-Trip-Wirkungsgrad des Speichers */
  roundTripEfficiency: number
  /** Dauerhafter Eigenverbrauch der Elektronik in W */
  standbyW: number
  /** Einspeisegrenze am AC-Ausgang in W */
  acLimitW: number
  /** Systemverluste gesamt (Kabel, Temperatur, Verschmutzung, MPPT) */
  systemLosses: number
  /** Jährliche Degradation der Module */
  degradation: number

  // --- Verbrauch ---
  /** Jahresstromverbrauch des Haushalts in kWh */
  annualConsumption: number
  /** Grundlast in W (Kühlschrank, Router, Standby) */
  baseLoadW: number
  /** Lastprofil */
  loadProfile: LoadProfileId

  // --- Wirtschaft ---
  /** Arbeitspreis in ct/kWh */
  electricityPriceCt: number
  /** Jährliche Strompreissteigerung */
  priceEscalation: number
  /** Einspeisevergütung in ct/kWh */
  feedInCt: number
  /** Kalkulatorischer Zinssatz */
  discountRate: number
  /** Betrachtungszeitraum in Jahren */
  horizonYears: number

  // --- Kosten ---
  /** Kaufpreis des Basissets */
  setPrice: number
  /** Aufpreis je zusätzlicher Speichereinheit */
  extraBatteryPrice: number
  /** Aufpreis je zusätzlichem Modul über die zwei im Set hinaus */
  extraPanelPrice: number
  /** Montagematerial, Halterungen, Schienen */
  mountingCost: number
  /** Kabel, Stecker, Smart Plugs */
  cablingCost: number
  /** Laufende Rücklage pro Jahr */
  opexPerYear: number
  /** Förderung in € (München: 0,40 €/Wp, max. 800 Wp) */
  subsidy: number
  /** Ersatz des Wechselrichters/Speichers — Jahr, 0 = kein Ersatz */
  replacementYear: number
  /** Kosten des Ersatzes */
  replacementCost: number
}

export interface EnergyResult {
  /** Bruttoerzeugung nach Verschattung und Systemverlusten, kWh */
  generation: number
  /** Durch die 800-W-Grenze abgeregelt, kWh */
  clipped: number
  /** Standby-Bedarf des Geräts, kWh */
  standby: number
  /** Direkt verbrauchte PV-Energie, kWh */
  direct: number
  /** Aus dem Speicher entnommen, kWh */
  fromBattery: number
  /** In den Speicher geladen, kWh */
  toBattery: number
  /** Round-Trip-Verluste, kWh */
  storageLoss: number
  /** Unvergütet bzw. vergütet ins Netz, kWh */
  feedIn: number
  /** Selbst genutzte PV-Energie insgesamt, kWh */
  selfUsed: number
  /** Tatsächlich vermiedener Netzbezug = selfUsed − standby, kWh */
  avoidedGrid: number
  /** Eigenverbrauchsquote (Anteil der Erzeugung) */
  selfUseRate: number
  /** Autarkiegrad (Anteil des Haushaltsbedarfs) */
  autarky: number
  /** Vollzyklen des Speichers pro Jahr */
  fullCycles: number
  /** Monatliche Erzeugung, kWh */
  monthlyGeneration: number[]
  /** Monatlich vermiedener Netzbezug, kWh */
  monthlyAvoided: number[]
  /** Mittlerer Tagesverlauf im Juni: Erzeugung / Last / Speicherstand */
  sampleDay: { pv: number[]; load: number[]; soc: number[] }
}

export interface CashflowRow {
  year: number
  generation: number
  avoidedGrid: number
  feedIn: number
  price: number
  savings: number
  feedInRevenue: number
  costs: number
  cashflow: number
  cumulative: number
  discounted: number
  cumulativeDiscounted: number
}

export interface FinanceResult {
  capexGross: number
  subsidyEffective: number
  capexNet: number
  rows: CashflowRow[]
  paybackStatic: number | null
  paybackDynamic: number | null
  npv: number
  irr: number | null
  lcoeCt: number
  totalSurplus: number
}

export interface Result {
  kwp: number
  batteryKwh: number
  orientationFactor: number
  specificYield: number
  energy: EnergyResult
  finance: FinanceResult
}
