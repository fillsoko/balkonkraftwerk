/**
 * Einstrahlungsmodell für einen beliebig geneigten und ausgerichteten Generator.
 *
 * Statt einer Nachschlagetabelle für ein paar feste Winkel wird die Einstrahlung
 * auf die Modulebene (POA, plane of array) physikalisch transponiert. Damit
 * reagieren Neigung und Azimut stetig — der Nutzer kann jeden Winkel schieben.
 *
 * Ablauf je Monat:
 *   1. Sonnenstand für den mittleren Tag des Monats, stündlich
 *   2. Aufteilung der monatlichen Horizontalstrahlung in Direkt- und Diffusanteil
 *   3. Transposition nach Hay & Davies (anisotroper Himmel). Der Diffusanteil
 *      wird in einen zirkumsolaren Teil, der der Sonne folgt, und einen
 *      isotropen Teil zerlegt:
 *        POA = B_h·R_b + D_h·[A·R_b + (1−A)·(1+cos β)/2] + G_h·ρ·(1−cos β)/2
 *      Der Anisotropie-Index A ist der Klarheitsgrad der Direktstrahlung.
 *      Ein rein isotroper Ansatz würde die Abhängigkeit von Neigung und
 *      Azimut deutlich unterschätzen — in München sind rund 52 % der
 *      Einstrahlung diffus.
 *
 * Referenz ist München; die Monatswerte stammen aus der Größenordnung der
 * Globalstrahlung Südbayerns (rund 1.150 kWh/m² horizontal im Jahr).
 */

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
] as const

export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** Repräsentativer Tag je Monat (Klein 1977), als Tag des Jahres. */
const REPRESENTATIVE_DAY = [17, 47, 75, 105, 135, 162, 198, 228, 258, 288, 318, 344]

/** Globalstrahlung München auf die Horizontale, kWh/m² je Monat. Summe ≈ 1.142. */
const GLOBAL_HORIZONTAL = [28, 47, 88, 128, 158, 163, 168, 145, 103, 62, 30, 22]

/** Diffusanteil der Globalstrahlung je Monat — im Winter deutlich höher. */
const DIFFUSE_FRACTION = [
  0.68, 0.60, 0.55, 0.52, 0.50, 0.52,
  0.50, 0.48, 0.46, 0.50, 0.62, 0.70,
]

/** Bodenreflexion (Albedo). Stadt/Balkon eher niedrig. */
const ALBEDO = 0.2

/** Solarkonstante, W/m². */
const I0N = 1367

/** Exzentrizitätskorrektur der Erdbahn. */
function eccentricity(dayOfYear: number): number {
  return 1 + 0.033 * Math.cos((RAD * 360 * dayOfYear) / 365)
}

/** Breitengrad München-Bogenhausen. */
export const LATITUDE = 48.15

const RAD = Math.PI / 180

/** Sonnendeklination nach Cooper, in Grad. */
function declination(dayOfYear: number): number {
  return 23.45 * Math.sin(RAD * 360 * ((284 + dayOfYear) / 365))
}

/** Kosinus des Zenitwinkels (= sin der Sonnenhöhe) für Stunde h (Sonnenzeit). */
function cosZenith(lat: number, dec: number, hour: number): number {
  const omega = (hour - 12) * 15 * RAD // Stundenwinkel
  return (
    Math.sin(lat * RAD) * Math.sin(dec * RAD) +
    Math.cos(lat * RAD) * Math.cos(dec * RAD) * Math.cos(omega)
  )
}

/** Kosinus des Einfallswinkels auf die geneigte Fläche. */
function cosIncidence(
  lat: number,
  dec: number,
  hour: number,
  tilt: number,
  azimuth: number,
): number {
  const omega = (hour - 12) * 15 * RAD
  const b = tilt * RAD
  const g = azimuth * RAD // 0 = Süd, negativ = Ost, positiv = West
  const d = dec * RAD
  const p = lat * RAD

  return (
    Math.sin(d) * Math.sin(p) * Math.cos(b) -
    Math.sin(d) * Math.cos(p) * Math.sin(b) * Math.cos(g) +
    Math.cos(d) * Math.cos(p) * Math.cos(b) * Math.cos(omega) +
    Math.cos(d) * Math.sin(p) * Math.sin(b) * Math.cos(g) * Math.cos(omega) +
    Math.cos(d) * Math.sin(b) * Math.sin(g) * Math.sin(omega)
  )
}

export interface PoaHour {
  /** Einstrahlung auf die Modulebene, kWh/m² in dieser Stunde. */
  poa: number
  /** Sonnenhöhe in Grad — für die Horizontverschattung gebraucht. */
  elevation: number
}

/**
 * Stündliche POA-Einstrahlung für den repräsentativen Tag eines Monats.
 * Rückgabe: 24 Werte in kWh/m², die zusammen den mittleren Tag ergeben.
 */
export function poaDay(month: number, tilt: number, azimuth: number): PoaHour[] {
  const dayOfYear = REPRESENTATIVE_DAY[month]
  const dec = declination(dayOfYear)
  const days = DAYS_IN_MONTH[month]
  const globalDay = GLOBAL_HORIZONTAL[month] / days
  const diffuseDay = globalDay * DIFFUSE_FRACTION[month]
  const beamDay = globalDay - diffuseDay

  // Verteilung der Tagessumme auf die Stunden proportional zu cos(Zenit).
  const cosZ: number[] = []
  let sumCosZ = 0
  for (let h = 0; h < 24; h++) {
    const c = Math.max(0, cosZenith(LATITUDE, dec, h + 0.5))
    cosZ.push(c)
    sumCosZ += c
  }

  const viewSky = (1 + Math.cos(tilt * RAD)) / 2
  const viewGround = (1 - Math.cos(tilt * RAD)) / 2

  const out: PoaHour[] = []
  for (let h = 0; h < 24; h++) {
    if (sumCosZ === 0 || cosZ[h] <= 0) {
      out.push({ poa: 0, elevation: 0 })
      continue
    }
    const share = cosZ[h] / sumCosZ
    const beamH = beamDay * share
    const diffH = diffuseDay * share
    const globH = globalDay * share

    // Direktstrahlung auf die geneigte Fläche.
    // cos(Zenit) wird nach unten begrenzt, damit R_b bei flachem Sonnenstand
    // nicht divergiert.
    const cosInc = Math.max(0, cosIncidence(LATITUDE, dec, h + 0.5, tilt, azimuth))
    const rb = Math.min(cosInc / Math.max(cosZ[h], 0.087), 4) // 0.087 ≈ 5° Sonnenhöhe

    // Anisotropie-Index nach Hay & Davies: Anteil der Direktstrahlung an der
    // extraterrestrischen Strahlung auf die Horizontale.
    const extraterrestrialH = (I0N * eccentricity(dayOfYear) * cosZ[h]) / 1000
    const anisotropy =
      extraterrestrialH > 0 ? Math.min(1, Math.max(0, beamH / extraterrestrialH)) : 0

    const diffusePoa = diffH * (anisotropy * rb + (1 - anisotropy) * viewSky)
    const poa = beamH * rb + diffusePoa + globH * ALBEDO * viewGround
    out.push({
      poa: Math.max(0, poa),
      elevation: Math.asin(Math.min(1, cosZ[h])) / RAD,
    })
  }
  return out
}

/** Jahressumme der POA-Einstrahlung in kWh/m² für Neigung/Azimut. */
export function annualPoa(tilt: number, azimuth: number): number {
  let sum = 0
  for (let m = 0; m < 12; m++) {
    const day = poaDay(m, tilt, azimuth)
    const dayTotal = day.reduce((a, b) => a + b.poa, 0)
    sum += dayTotal * DAYS_IN_MONTH[m]
  }
  return sum
}

/**
 * Ertragsfaktor gegenüber der optimalen Ausrichtung (Süd, ca. 35°).
 * Praktisch für die Anzeige "so viel Prozent des Möglichen holt diese Montage".
 */
const OPTIMAL_POA = annualPoa(35, 0)

export function orientationFactor(tilt: number, azimuth: number): number {
  return annualPoa(tilt, azimuth) / OPTIMAL_POA
}

export { OPTIMAL_POA }
