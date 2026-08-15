import { useMemo, useState } from 'react'
import { DEFAULT_CONFIG, PRESETS, munichSubsidy } from './model/defaults'
import { evaluate, batteryValue } from './model/finance'
import { LOAD_PROFILE_OPTIONS } from './model/system'
import { MONTH_NAMES, orientationFactor } from './model/solar'
import type { Config, LoadProfileId } from './model/types'
import { Choice, Group, Slider } from './components/controls'
import { CashflowChart, DayChart, MonthlyBars, SweepChart, useTooltip } from './components/charts'

const nf = (n: number, d = 0) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d })

const eur = (n: number, d = 0) => `${nf(n, d)} €`
const pct = (n: number, d = 0) => `${nf(n * 100, d)} %`

export default function App() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG)
  const [activePreset, setActivePreset] = useState('normal')
  const tip = useTooltip()

  const set = <K extends keyof Config>(key: K, value: Config[K]) => {
    setConfig((c) => ({ ...c, [key]: value }))
    setActivePreset('')
  }

  const applyPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)
    if (!p) return
    setConfig({ ...DEFAULT_CONFIG, ...p.patch })
    setActivePreset(id)
  }

  const result = useMemo(() => evaluate(config), [config])
  const battery = useMemo(() => batteryValue(config), [config])
  const orientation = useMemo(
    () => orientationFactor(config.tilt, config.azimuth),
    [config.tilt, config.azimuth],
  )

  const { energy, finance } = result
  const maxSubsidy = munichSubsidy(config)

  /* Empfindlichkeit: Amortisation über der Neigung */
  const tiltSweep = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    for (let t = 0; t <= 90; t += 5) {
      const f = evaluate({ ...config, tilt: t }).finance
      pts.push({ x: t, y: f.paybackStatic ?? config.horizonYears + 2 })
    }
    return pts
  }, [config])

  const payback = finance.paybackStatic
  const paybackLabel = payback === null ? `> ${config.horizonYears}` : nf(payback, 1)
  const paybackTone = payback === null ? 'k-bad' : payback <= 6 ? 'k-good' : payback <= 12 ? 'k-warn' : 'k-bad'

  const balance = [
    { label: 'Direkt verbraucht', value: energy.direct, color: 'var(--key)' },
    { label: 'Über den Speicher', value: energy.fromBattery, color: 'var(--good)' },
    { label: 'Standby des Geräts', value: energy.standby, color: 'var(--bad)' },
    { label: 'Speicherverluste', value: energy.storageLoss, color: 'var(--rule-strong)' },
    { label: 'Ins Netz', value: energy.feedIn, color: 'var(--surface-2)' },
    { label: 'Abgeregelt (800 W)', value: energy.clipped, color: 'var(--surface-2)' },
  ].filter((b) => b.value > 0.5)
  const balanceMax = Math.max(...balance.map((b) => b.value), 1)

  return (
    <div className="app">
      {tip.node}

      <header className="topbar">
        <div className="brand">
          <h1>Balkonkraftwerk-Rechner</h1>
          <p>
            Stündliche Ertrags- und Speichersimulation für München. Alle Parameter links sind
            frei einstellbar — Ergebnisse rechnen sofort neu.
          </p>
        </div>
        <div className="presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className={`preset${activePreset === p.id ? ' active' : ''}`}
              onClick={() => applyPreset(p.id)}
              title={p.hint}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      <div className="layout">
        {/* ------------------------------ Steuerung ------------------------------ */}
        <aside className="controls">
          <Group title="Generator" summary={`${nf(result.kwp, 2)} kWp`} open>
            <Slider
              label="Anzahl Module" value={config.panelCount} min={0} max={8} step={1}
              onChange={(v) => set('panelCount', v)}
              display={`${config.panelCount}`}
              hint={`${nf(result.kwp, 2)} kWp gesamt · ${nf(config.panelCount * 1.8 * 1.134, 1)} m² Fläche`}
            />
            <Slider
              label="Leistung je Modul" value={config.wpPerPanel} min={300} max={650} step={10}
              onChange={(v) => set('wpPerPanel', v)}
              display={`${config.wpPerPanel} Wp`}
            />
            <Slider
              label="Neigungswinkel" value={config.tilt} min={0} max={90} step={1}
              onChange={(v) => set('tilt', v)}
              display={`${config.tilt}°`}
              hint={
                config.tilt >= 80
                  ? 'Senkrecht am Geländer — flaches Jahresprofil, guter Winterertrag'
                  : config.tilt <= 10
                    ? 'Fast flach liegend — im Winter sehr schwach'
                    : 'Aufgeständert — Optimum liegt bei 30–35°'
              }
            />
            <Slider
              label="Ausrichtung" value={config.azimuth} min={-180} max={180} step={5}
              onChange={(v) => set('azimuth', v)}
              display={azimuthLabel(config.azimuth)}
              hint={`Ertrag ${pct(orientation)} des Optimums (Süd, 35°)`}
            />
          </Group>

          <Group title="Verschattung" summary={pct(effectiveShading(config))}>
            <Slider
              label="Höhe der Hindernisse" value={config.horizonElevation} min={0} max={45} step={1}
              onChange={(v) => set('horizonElevation', v)}
              display={`${config.horizonElevation}°`}
              hint="Sonnenhöhe, unter der Bäume oder Nachbarhäuser die Sonne verdecken. 1. OG mit Straßenbäumen: eher 10–20°."
            />
            <Slider
              label="Grundverschattung" value={config.shadingFactor} min={0.5} max={1} step={0.01}
              onChange={(v) => set('shadingFactor', v)}
              display={pct(config.shadingFactor)}
              hint="Ganzjährige Minderung durch Balkondecke, Brüstung, Geländerstäbe"
            />
            <Slider
              label="Laub Mai–Oktober" value={config.foliageShading} min={0.5} max={1} step={0.01}
              onChange={(v) => set('foliageShading', v)}
              display={pct(config.foliageShading)}
              hint="Zusätzliche Verschattung durch belaubte Bäume. 100 % = kein Laubeinfluss."
            />
          </Group>

          <Group
            title="Speicher"
            summary={config.batteryUnits ? `${nf(result.batteryKwh, 2)} kWh` : 'keiner'}
          >
            <Slider
              label="Speichereinheiten" value={config.batteryUnits} min={0} max={6} step={1}
              onChange={(v) => set('batteryUnits', v)}
              display={config.batteryUnits === 0 ? 'ohne' : `${config.batteryUnits} ×`}
              hint={`${nf(result.batteryKwh, 2)} kWh gesamt · STREAM Ultra bis 6 Einheiten stapelbar`}
            />
            <Slider
              label="Kapazität je Einheit" value={config.batteryUnitKwh} min={0.96} max={3.84} step={0.96}
              onChange={(v) => set('batteryUnitKwh', v)}
              display={`${nf(config.batteryUnitKwh, 2)} kWh`}
              hint="1,92 kWh = STREAM Ultra · 3,84 kWh = STREAM Ultra X"
            />
            <Slider
              label="Entladetiefe (DoD)" value={config.depthOfDischarge} min={0.7} max={1} step={0.01}
              onChange={(v) => set('depthOfDischarge', v)}
              display={pct(config.depthOfDischarge)}
            />
            <Slider
              label="Round-Trip-Wirkungsgrad" value={config.roundTripEfficiency} min={0.7} max={0.95} step={0.01}
              onChange={(v) => set('roundTripEfficiency', v)}
              display={pct(config.roundTripEfficiency)}
              hint="Tests messen für die STREAM-Serie rund 80–85 %"
            />
            <Slider
              label="Standby des Geräts" value={config.standbyW} min={0} max={25} step={1}
              onChange={(v) => set('standbyW', v)}
              display={`${config.standbyW} W`}
              hint={`${nf((config.standbyW * 8760) / 1000)} kWh im Jahr — läuft rund um die Uhr und wird voll gegengerechnet`}
            />
          </Group>

          <Group title="Technik" summary={`${config.acLimitW} W AC`}>
            <Slider
              label="Einspeisegrenze" value={config.acLimitW} min={400} max={2000} step={50}
              onChange={(v) => set('acLimitW', v)}
              display={`${config.acLimitW} W`}
              hint="800 W nach Solarpaket I. Höhere Werte nur mit anderer Anlagenklasse zulässig."
            />
            <Slider
              label="Systemverluste" value={config.systemLosses} min={0.05} max={0.25} step={0.01}
              onChange={(v) => set('systemLosses', v)}
              display={pct(config.systemLosses)}
              hint="Kabel, Temperatur, Verschmutzung, MPPT-Anpassung"
            />
            <Slider
              label="Degradation pro Jahr" value={config.degradation} min={0} max={0.015} step={0.001}
              onChange={(v) => set('degradation', v)}
              display={pct(config.degradation, 1)}
            />
          </Group>

          <Group title="Verbrauch" summary={`${nf(config.annualConsumption)} kWh`}>
            <Slider
              label="Jahresverbrauch" value={config.annualConsumption} min={800} max={8000} step={100}
              onChange={(v) => set('annualConsumption', v)}
              display={`${nf(config.annualConsumption)} kWh`}
            />
            <Slider
              label="Grundlast" value={config.baseLoadW} min={40} max={500} step={10}
              onChange={(v) => set('baseLoadW', v)}
              display={`${config.baseLoadW} W`}
              hint={`Kühlschrank, Router, Standby — entspricht ${nf((config.baseLoadW * 8760) / 1000)} kWh im Jahr`}
            />
            <Choice<LoadProfileId>
              label="Lastprofil"
              value={config.loadProfile}
              options={LOAD_PROFILE_OPTIONS}
              onChange={(v) => set('loadProfile', v)}
            />
          </Group>

          <Group title="Wirtschaft" summary={`${nf(config.electricityPriceCt, 1)} ct`}>
            <Slider
              label="Arbeitspreis Strom" value={config.electricityPriceCt} min={15} max={55} step={0.5}
              onChange={(v) => set('electricityPriceCt', v)}
              display={`${nf(config.electricityPriceCt, 2)} ct`}
              hint="SWM Grundversorgung München liegt bei 32,44 ct/kWh"
            />
            <Slider
              label="Strompreissteigerung" value={config.priceEscalation} min={-0.02} max={0.08} step={0.005}
              onChange={(v) => set('priceEscalation', v)}
              display={pct(config.priceEscalation, 1)}
            />
            <Slider
              label="Einspeisevergütung" value={config.feedInCt} min={0} max={15} step={0.1}
              onChange={(v) => set('feedInCt', v)}
              display={`${nf(config.feedInCt, 1)} ct`}
              hint="Für Balkonkraftwerke praktisch 0 — der Zweirichtungszähler kostet mehr als der Erlös bringt."
            />
            <Slider
              label="Kalkulationszins" value={config.discountRate} min={0} max={0.07} step={0.005}
              onChange={(v) => set('discountRate', v)}
              display={pct(config.discountRate, 1)}
              hint="Entgangene Rendite einer Alternativanlage (Tagesgeld, Festgeld)"
            />
            <Slider
              label="Betrachtungszeitraum" value={config.horizonYears} min={5} max={30} step={1}
              onChange={(v) => set('horizonYears', v)}
              display={`${config.horizonYears} Jahre`}
            />
          </Group>

          <Group title="Kosten" summary={eur(finance.capexNet)}>
            <Slider
              label="Kaufpreis Set" value={config.setPrice} min={0} max={2500} step={5}
              onChange={(v) => set('setPrice', v)}
              display={eur(config.setPrice, 2)}
              hint="Angebot Svea Solar: 840,65 € statt 989,00 €"
            />
            <Slider
              label="Montage & Halterung" value={config.mountingCost} min={0} max={400} step={5}
              onChange={(v) => set('mountingCost', v)}
              display={eur(config.mountingCost)}
              hint="Geländerhalterungen, Schienen, Schrauben — im Set nicht enthalten"
            />
            <Slider
              label="Kabel & Smart Plugs" value={config.cablingCost} min={0} max={150} step={5}
              onChange={(v) => set('cablingCost', v)}
              display={eur(config.cablingCost)}
            />
            <Slider
              label="Aufpreis je Speichereinheit" value={config.extraBatteryPrice} min={200} max={900} step={10}
              onChange={(v) => set('extraBatteryPrice', v)}
              display={eur(config.extraBatteryPrice)}
            />
            <Slider
              label="Aufpreis je Zusatzmodul" value={config.extraPanelPrice} min={60} max={400} step={5}
              onChange={(v) => set('extraPanelPrice', v)}
              display={eur(config.extraPanelPrice)}
            />
            <Slider
              label="Rücklage pro Jahr" value={config.opexPerYear} min={0} max={40} step={1}
              onChange={(v) => set('opexPerYear', v)}
              display={`${eur(config.opexPerYear)}/a`}
              hint="Reinigung, Reparaturen, kleine Ersatzteile"
            />
            <Slider
              label="Förderung" value={config.subsidy} min={0} max={600} step={10}
              onChange={(v) => set('subsidy', v)}
              display={eur(config.subsidy)}
              hint={`München (FKG): 0,40 €/Wp, max. 800 Wp → ${eur(maxSubsidy)} möglich. Antrag muss vor dem Kauf gestellt werden.`}
            />
            <Slider
              label="Ersatzinvestition im Jahr" value={config.replacementYear} min={0} max={25} step={1}
              onChange={(v) => set('replacementYear', v)}
              display={config.replacementYear === 0 ? 'keine' : `Jahr ${config.replacementYear}`}
              hint="Wechselrichter oder Speicher tauschen — typisch nach 10–15 Jahren"
            />
            {config.replacementYear > 0 && (
              <Slider
                label="Kosten des Ersatzes" value={config.replacementCost} min={0} max={1200} step={10}
                onChange={(v) => set('replacementCost', v)}
                display={eur(config.replacementCost)}
              />
            )}
          </Group>

          <button className="reset" onClick={() => applyPreset('normal')}>
            Auf Ausgangslage zurücksetzen
          </button>
        </aside>

        {/* ------------------------------ Ergebnisse ------------------------------ */}
        <main className="results">
          <div className="kpis">
            <div className="kpi">
              <div className="k-lbl">Amortisation</div>
              <div className={`k-val ${paybackTone}`}>
                {paybackLabel} <span className="unit">Jahre</span>
              </div>
              <div className="k-sub">
                {finance.paybackDynamic !== null
                  ? `abgezinst ${nf(finance.paybackDynamic, 1)} Jahre`
                  : 'abgezinst nicht im Zeitraum'}
              </div>
            </div>
            <div className="kpi">
              <div className="k-lbl">Ersparnis Jahr 1</div>
              <div className="k-val k-key">
                {nf(finance.rows[1]?.savings ?? 0)} <span className="unit">€</span>
              </div>
              <div className="k-sub">{nf(energy.avoidedGrid)} kWh weniger aus dem Netz</div>
            </div>
            <div className="kpi">
              <div className="k-lbl">Überschuss {config.horizonYears} Jahre</div>
              <div className={`k-val ${finance.totalSurplus >= 0 ? 'k-good' : 'k-bad'}`}>
                {finance.totalSurplus >= 0 ? '+' : ''}{nf(finance.totalSurplus)} <span className="unit">€</span>
              </div>
              <div className="k-sub">Kapitalwert {nf(finance.npv)} € bei {pct(config.discountRate, 1)}</div>
            </div>
            <div className="kpi">
              <div className="k-lbl">Rendite (IRR)</div>
              <div className={`k-val ${(finance.irr ?? -1) > 0.05 ? 'k-good' : 'k-bad'}`}>
                {finance.irr === null ? '—' : nf(finance.irr * 100, 1)} <span className="unit">% p. a.</span>
              </div>
              <div className="k-sub">Stromkosten {nf(finance.lcoeCt, 1)} ct/kWh</div>
            </div>
            <div className="kpi">
              <div className="k-lbl">Autarkiegrad</div>
              <div className="k-val k-key">
                {nf(energy.autarky * 100)} <span className="unit">%</span>
              </div>
              <div className="k-sub">Eigenverbrauchsquote {nf(energy.selfUseRate * 100)} %</div>
            </div>
            <div className="kpi">
              <div className="k-lbl">Erzeugung Jahr 1</div>
              <div className="k-val k-key">
                {nf(energy.generation)} <span className="unit">kWh</span>
              </div>
              <div className="k-sub">
                {nf(result.specificYield)} kWh/kWp · {pct(orientation)} des Optimums
              </div>
            </div>
          </div>

          <Verdict config={config} battery={battery} payback={payback} orientation={orientation} />

          <section className="card">
            <h2>Wohin der Strom fließt</h2>
            <p className="c-sub">
              Jahr 1, in kWh. Gezählt wird am Ende nur, was den Netzbezug wirklich ersetzt.
            </p>
            <div className="balance">
              {balance.map((b) => (
                <div className="brow" key={b.label}>
                  <span className="b-lbl">{b.label}</span>
                  <div className="btrack">
                    <div
                      className="bfill"
                      style={{
                        width: `${(b.value / balanceMax) * 100}%`,
                        background: b.color,
                        boxShadow: b.color === 'var(--surface-2)' ? 'inset 0 0 0 1px var(--rule)' : undefined,
                      }}
                    />
                  </div>
                  <span className="b-val">{nf(b.value)}</span>
                </div>
              ))}
            </div>
            <p style={{ marginTop: 16, fontSize: 13, color: 'var(--ink-3)' }}>
              Erzeugung {nf(energy.generation)} kWh → selbst genutzt {nf(energy.selfUsed)} kWh →
              abzüglich Standby ergibt <strong style={{ color: 'var(--ink)' }}>{nf(energy.avoidedGrid)} kWh</strong> vermiedenen Netzbezug.
            </p>
          </section>

          <section className="card">
            <h2>Monatsertrag</h2>
            <p className="c-sub">Erzeugung und tatsächlich vermiedener Netzbezug je Monat, Jahr 1</p>
            <div className="legend">
              <span><i className="swatch" style={{ background: 'var(--key)' }} />Erzeugung</span>
              <span><i className="swatch" style={{ background: 'var(--good)' }} />vermiedener Netzbezug</span>
            </div>
            <MonthlyBars
              labels={MONTH_NAMES}
              unit="kWh"
              tip={tip}
              series={[
                { name: 'Erzeugung', color: 'var(--key)', data: energy.monthlyGeneration },
                { name: 'Vermieden', color: 'var(--good)', data: energy.monthlyAvoided },
              ]}
            />
          </section>

          <section className="card">
            <h2>Ein Tag im Juni</h2>
            <p className="c-sub">
              Mittlerer sonniger Tag, stündlich in kWh. Die Lücke zwischen Erzeugung und Last am
              Mittag ist genau das, was der Speicher einsammeln kann.
            </p>
            <div className="legend">
              <span><i className="swatch" style={{ background: 'var(--pv)' }} />Erzeugung</span>
              <span><i className="swatch line" style={{ background: 'var(--load)' }} />Last inkl. Standby</span>
              {config.batteryUnits > 0 && (
                <span><i className="swatch line" style={{ background: 'var(--soc)' }} />Speicherstand</span>
              )}
            </div>
            <DayChart
              pv={energy.sampleDay.pv}
              load={energy.sampleDay.load}
              soc={energy.sampleDay.soc}
              hasBattery={config.batteryUnits > 0}
              tip={tip}
            />
          </section>

          <section className="card">
            <h2>Kumulierter Cashflow</h2>
            <p className="c-sub">
              Vom Kaufpreis bis zum Ende des Betrachtungszeitraums, in Euro. Der Schnittpunkt mit
              der Nulllinie ist die Amortisation.
            </p>
            <CashflowChart rows={finance.rows} breakEven={payback} tip={tip} />
          </section>

          <section className="card">
            <h2>Was bringt ein anderer Neigungswinkel?</h2>
            <p className="c-sub">
              Amortisation in Jahren über dem Montagewinkel — alle übrigen Einstellungen bleiben,
              wie sie links stehen.
            </p>
            <SweepChart
              points={tiltSweep}
              current={config.tilt}
              xLabel={(v) => `${v}°`}
              yLabel="Amortisation"
              format={(v) => `${nf(v, 1)} a`}
              tip={tip}
            />
          </section>

          <section className="card">
            <h2>Kostenaufstellung</h2>
            <p className="c-sub">Investition und Ergebnis im Überblick</p>
            <table>
              <thead>
                <tr><th>Position</th><th>Betrag</th></tr>
              </thead>
              <tbody>
                <tr><td>Set{config.batteryUnits === 0 ? ' ohne Speicher' : ''}</td>
                    <td>{eur(config.batteryUnits === 0 ? Math.max(0, config.setPrice - config.extraBatteryPrice) : config.setPrice, 2)}</td></tr>
                {config.panelCount > 2 && (
                  <tr><td>{config.panelCount - 2} Zusatzmodule</td>
                      <td>{eur((config.panelCount - 2) * config.extraPanelPrice)}</td></tr>
                )}
                {config.batteryUnits > 1 && (
                  <tr><td>{config.batteryUnits - 1} weitere Speichereinheiten</td>
                      <td>{eur((config.batteryUnits - 1) * config.extraBatteryPrice)}</td></tr>
                )}
                <tr><td>Montage & Halterung</td><td>{eur(config.mountingCost)}</td></tr>
                <tr><td>Kabel & Smart Plugs</td><td>{eur(config.cablingCost)}</td></tr>
                <tr><td><strong>Investition brutto</strong></td><td><strong>{eur(finance.capexGross, 2)}</strong></td></tr>
                <tr><td>Förderung</td><td>−{eur(finance.subsidyEffective)}</td></tr>
                <tr><td><strong>Netto-Investition</strong></td><td><strong>{eur(finance.capexNet, 2)}</strong></td></tr>
              </tbody>
            </table>
          </section>

          <footer>
            <p>
              <strong>Modell.</strong> Die Einstrahlung auf die Modulebene wird für jeden Winkel
              physikalisch transponiert (Hay & Davies, anisotroper Himmel) aus der Globalstrahlung
              Münchens — rund 1.140 kWh/m² im Jahr auf der Horizontalen. Simuliert werden zwölf
              repräsentative Tage, je aufgeteilt in sonnig, mittel und trüb, stündlich mit
              Lastprofil und Speicherdispatch. Bewertet wird der tatsächlich vermiedene Netzbezug;
              das Standby des Geräts wird als zusätzliche Last voll gegengerechnet.
            </p>
            <p>
              <strong>Grenzen.</strong> Kein echtes Wetterjahr, keine Verschattungssimulation
              einzelner Bäume, keine Modulverschaltung. Die Ergebnisse sind belastbar für den
              Vergleich von Varianten, nicht als Ertragsgarantie. Angaben ohne Gewähr.{' '}
              <a href="/bericht.html">Ausführlicher Bericht zur Ausgangslage →</a>
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Verdict({
  config,
  battery,
  payback,
  orientation,
}: {
  config: Config
  battery: ReturnType<typeof batteryValue>
  payback: number | null
  orientation: number
}) {
  const notes: { tone: string; text: React.ReactNode }[] = []

  if (config.batteryUnits > 0) {
    const yrs = battery.paybackYears
    const tone = yrs <= 10 ? 'is-good' : yrs <= 18 ? '' : 'is-bad'
    notes.push({
      tone,
      text: (
        <>
          <strong>Speicher:</strong> bringt {nf(battery.deltaKwh)} kWh im Jahr zusätzlich
          ({eur(battery.deltaEur)}) und hebt die Eigenverbrauchsquote von{' '}
          {pct(battery.selfUseWithout)} auf {pct(battery.selfUseWith)}. Bei {eur(battery.extraCost)}{' '}
          Aufpreis amortisiert er sich{' '}
          {yrs === Infinity ? <>gar nicht</> : <>nach {nf(yrs, 0)} Jahren</>}
          . Er läuft auf {nf(battery.cycles)} Vollzyklen im Jahr.
        </>
      ),
    })
  }

  if (config.tilt >= 75 && orientation < 0.8) {
    notes.push({
      tone: '',
      text: (
        <>
          <strong>Montagewinkel:</strong> Senkrecht holt die Anlage {pct(orientation)} des
          Möglichen. Schon 20–30° Aufständerung bringen deutlich mehr — schieben Sie den Regler
          links, um den Effekt zu sehen.
        </>
      ),
    })
  }

  if (config.subsidy < munichSubsidy(config)) {
    notes.push({
      tone: 'is-bad',
      text: (
        <>
          <strong>Förderung:</strong> München zahlt für diese Anlage bis zu{' '}
          {eur(munichSubsidy(config))} (0,40 €/Wp, max. 800 Wp). Eingerechnet sind aktuell{' '}
          {eur(config.subsidy)}. Der Antrag muss <em>vor</em> der Bestellung gestellt werden — wer
          zuerst kauft, verliert den Anspruch vollständig.
        </>
      ),
    })
  }

  const standbyShare = config.standbyW * 8.76
  if (standbyShare > 0 && config.batteryUnits > 0 && standbyShare > battery.deltaKwh) {
    notes.push({
      tone: 'is-bad',
      text: (
        <>
          <strong>Standby frisst den Speichernutzen:</strong> Das Gerät zieht{' '}
          {nf(standbyShare)} kWh im Jahr — mehr als die {nf(battery.deltaKwh)} kWh, die der
          Speicher zusätzlich einbringt.
        </>
      ),
    })
  }

  if (payback !== null && payback <= 5) {
    notes.push({
      tone: 'is-good',
      text: (
        <>
          <strong>Diese Konfiguration rechnet sich klar.</strong> Amortisation nach{' '}
          {nf(payback, 1)} Jahren, bei 20–25 Jahren Modullebensdauer.
        </>
      ),
    })
  }

  if (!notes.length) return null

  return (
    <section className="card">
      <h2>Befunde zu dieser Einstellung</h2>
      <p className="c-sub">Was an der aktuellen Konfiguration auffällt</p>
      <div className="findings">
        {notes.map((n, i) => (
          <div className={`finding ${n.tone}`} key={i}>
            <span className="dot" />
            <p>{n.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function azimuthLabel(a: number): string {
  const dirs: [number, string][] = [
    [-180, 'Nord'], [-135, 'Nordost'], [-90, 'Ost'], [-45, 'Südost'],
    [0, 'Süd'], [45, 'Südwest'], [90, 'West'], [135, 'Nordwest'], [180, 'Nord'],
  ]
  const nearest = dirs.reduce((p, c) => (Math.abs(c[0] - a) < Math.abs(p[0] - a) ? c : p))
  return a === nearest[0] ? nearest[1] : `${nearest[1]} ${a > 0 ? '+' : ''}${a}°`
}

function effectiveShading(c: Config): number {
  return c.shadingFactor * (0.5 + 0.5 * c.foliageShading)
}
