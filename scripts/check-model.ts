import { DEFAULT_CONFIG, PRESETS } from '../src/model/defaults'
import { evaluate, batteryValue } from '../src/model/finance'
import { orientationFactor } from '../src/model/solar'
import type { Config } from '../src/model/types'

const f = (n: number, d = 0) => n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d })

for (const p of PRESETS) {
  const c: Config = { ...DEFAULT_CONFIG, ...p.patch }
  const r = evaluate(c)
  const e = r.energy
  const fin = r.finance
  const bv = batteryValue(c)
  console.log(`\n=== ${p.label} === ${r.kwp} kWp / ${r.batteryKwh} kWh / Neigung ${c.tilt}° / Ausrichtung ${c.azimuth}°`)
  console.log(`  Ausrichtungsfaktor ${(orientationFactor(c.tilt, c.azimuth)*100).toFixed(0)}%  spez. Ertrag ${f(r.specificYield)} kWh/kWp`)
  console.log(`  Erzeugung ${f(e.generation)} | abgeregelt ${f(e.clipped)} | Standby ${f(e.standby)} | Speicherverlust ${f(e.storageLoss)} | Einspeisung ${f(e.feedIn)}`)
  console.log(`  direkt ${f(e.direct)} + Speicher ${f(e.fromBattery)} = selbst ${f(e.selfUsed)} -> vermieden ${f(e.avoidedGrid)} kWh`)
  console.log(`  EV-Quote ${(e.selfUseRate*100).toFixed(0)}%  Autarkie ${(e.autarky*100).toFixed(0)}%  Vollzyklen ${f(e.fullCycles)}`)
  console.log(`  CAPEX ${f(fin.capexGross,2)} - Foerderung ${f(fin.subsidyEffective)} = ${f(fin.capexNet,2)} EUR`)
  console.log(`  Ersparnis J1 ${f(fin.rows[1].savings,0)} EUR | Amort ${fin.paybackStatic?.toFixed(1) ?? '>Horizont'} a (dyn ${fin.paybackDynamic?.toFixed(1) ?? '>Horizont'})`)
  console.log(`  NPV ${f(fin.npv)} EUR | IRR ${fin.irr ? (fin.irr*100).toFixed(1)+'%' : 'n/a'} | LCOE ${fin.lcoeCt.toFixed(1)} ct | Ueberschuss ${f(fin.totalSurplus)} EUR`)
  console.log(`  [Speicher] +${f(bv.deltaKwh)} kWh = ${f(bv.deltaEur)} EUR/a bei ${f(bv.extraCost)} EUR -> ${bv.paybackYears===Infinity?'nie':bv.paybackYears.toFixed(0)+' a'} | EV ${(bv.selfUseWithout*100).toFixed(0)}% -> ${(bv.selfUseWith*100).toFixed(0)}%`)
}

// Randfaelle
console.log('\n--- Randfaelle ---')
const edge: [string, Partial<Config>][] = [
  ['0 Module', { panelCount: 0 }],
  ['0 Speicher', { batteryUnits: 0 }],
  ['Verbrauch 0', { annualConsumption: 0 }],
  ['Grundlast > Verbrauch', { baseLoadW: 900, annualConsumption: 1000 }],
  ['8 Module', { panelCount: 8, tilt: 30 }],
  ['Horizont 60 Grad', { horizonElevation: 60 }],
  ['Nord', { azimuth: 180, tilt: 30 }],
]
for (const [name, patch] of edge) {
  const c = { ...DEFAULT_CONFIG, ...patch }
  const r = evaluate(c)
  const ok = [r.energy.generation, r.energy.avoidedGrid, r.finance.npv, r.finance.lcoeCt].every(v => Number.isFinite(v) || Number.isNaN(v))
  console.log(`  ${name.padEnd(24)} gen ${f(r.energy.generation).padStart(6)} | verm ${f(r.energy.avoidedGrid).padStart(6)} | NPV ${f(r.finance.npv).padStart(7)} | IRR ${r.finance.irr!==null?(r.finance.irr*100).toFixed(0)+'%':'n/a'} | endlich: ${ok}`)
}
