import { annualPoa, orientationFactor, OPTIMAL_POA, poaDay, DAYS_IN_MONTH, MONTH_NAMES } from '../src/model/solar'

console.log('POA optimal (35 Grad Sued):', OPTIMAL_POA.toFixed(0), 'kWh/m2')
console.log('POA horizontal (0 Grad)   :', annualPoa(0, 0).toFixed(0), '(erwartet ~1142)')
console.log('')
console.log('Neigung  Sued   Faktor | SO -45   SW +45   Ost -90')
for (const t of [0, 15, 20, 30, 35, 45, 60, 75, 90]) {
  const s = orientationFactor(t, 0)
  console.log(
    `${String(t).padStart(3)} Grad  ${annualPoa(t,0).toFixed(0).padStart(5)}  ${(s*100).toFixed(0).padStart(4)}% |`,
    `${(orientationFactor(t,-45)*100).toFixed(0).padStart(4)}%`,
    `${(orientationFactor(t,45)*100).toFixed(0).padStart(6)}%`,
    `${(orientationFactor(t,-90)*100).toFixed(0).padStart(7)}%`,
  )
}
console.log('\nMonatsprofil POA (kWh/m2):')
for (const [label, t] of [['senkrecht 90', 90], ['geneigt 20', 20], ['geneigt 35', 35]] as const) {
  const per = MONTH_NAMES.map((_, m) => poaDay(m, t as number, 0).reduce((a,b)=>a+b.poa,0) * DAYS_IN_MONTH[m])
  console.log(label.padEnd(13), per.map(v=>v.toFixed(0).padStart(4)).join(' '), '=', per.reduce((a,b)=>a+b,0).toFixed(0))
}
