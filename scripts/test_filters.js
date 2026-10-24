import fs from 'fs'
import {
  filterByDietary, filterByHealth, filterByDislikes, filterByMealType,
} from '../src/engine/filters.js'
import { applyVarietyScores, excludeShownThisSession } from '../src/engine/variety.js'

const dishes = JSON.parse(fs.readFileSync('data/processed/mealmind_dataset.json', 'utf8'))
console.log(`Full dataset: ${dishes.length} dishes\n`)

console.log('── Dietary filters (dishes that survive) ──')
for (const f of ['vegetarian', 'vegan', 'halal', 'no_pork', 'gluten_free']) {
  console.log(`  ${f}: ${filterByDietary(dishes, [f]).length}`)
}

console.log('\n── Health conditions (dishes that survive) ──')
for (const c of ['diabetes', 'hypertension', 'high_cholesterol', 'lactose_intolerance', 'celiac', 'kidney_disease']) {
  console.log(`  ${c}: ${filterByHealth(dishes, [c]).length}`)
}

console.log('\n── Meal types (dishes that survive) ──')
for (const m of ['breakfast', 'lunch', 'dinner']) {
  console.log(`  ${m}: ${filterByMealType(dishes, m).length}`)
}

console.log('\n── Dislike check: word-boundary matching ──')
for (const term of ['ram', 'liver', 'okra']) {
  const kept = new Set(filterByDislikes(dishes, [term]).map((d) => d.source_id))
  const removed = dishes.filter((d) => !kept.has(d.source_id))
  console.log(`  "${term}" removed ${removed.length} dishes. First 4:`)
  removed.slice(0, 4).forEach((d) => console.log(`     - ${d.name}`))
}

console.log('\n── Variety scores ──')
const day = 24 * 60 * 60 * 1000
const history = [
  { dish_id: dishes[0].source_id, suggested_at: new Date(Date.now() - 1 * day).toISOString() },
  { dish_id: dishes[1].source_id, suggested_at: new Date(Date.now() - 3 * day).toISOString() },
  { dish_id: dishes[2].source_id, suggested_at: new Date(Date.now() - 10 * day).toISOString() },
]
const scored = applyVarietyScores(dishes, history)
console.log('  Eaten 1 day ago  (expect ~0.2):', scored[0].variety_score)
console.log('  Eaten 3 days ago (expect ~0.6):', scored[1].variety_score)
console.log('  Eaten 10 days ago (expect 1):  ', scored[2].variety_score)
console.log('  Never eaten      (expect 1):   ', scored[3].variety_score)

console.log('\n── Reroll memory ──')
const afterReroll = excludeShownThisSession(dishes, [dishes[0].source_id, dishes[1].source_id])
console.log(`  Excluded 2 shown dishes: ${dishes.length} → ${afterReroll.length}`)