// Are some data sources unfairly favoured or buried by the scoring?
import fs from 'fs'
import { rankDishes, computeSubScores } from '../src/engine/scoring.js'
import { applyHardFilters } from '../src/engine/filters.js'
import { getPersonaDefaults } from '../src/engine/personas.js'

const dishes = JSON.parse(fs.readFileSync('data/processed/mealmind_dataset.json', 'utf8'))
const pantries = {
  'Nigerian staples': ['rice', 'tomatoes', 'onions', 'chicken', 'palm oil', 'pepper', 'crayfish', 'seasoning cubes'],
  'Mixed kitchen': ['pasta', 'chicken', 'garlic', 'onions', 'cheese', 'tomatoes', 'olive oil', 'butter', 'eggs', 'potatoes'],
}
const sources = [...new Set(dishes.map((d) => d.source))]
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

console.log('Dishes per source:', Object.fromEntries(sources.map((s) => [s, dishes.filter((d) => d.source === s).length])))

for (const [pantryName, pantry] of Object.entries(pantries)) {
  console.log(`\n══ Pantry: ${pantryName} ══`)

  // 1. Average sub-scores per source, over dishes that share at least one ingredient
  const pool = applyHardFilters(dishes, { mealType: 'any' })
    .map((d) => ({ d, s: computeSubScores(d, pantry) }))
    .filter((x) => x.s.ingredient.matched.length > 0)
  const table = {}
  for (const src of sources) {
    const rows = pool.filter((x) => x.d.source === src)
    table[src] = {
      dishes: rows.length,
      avg_nutrition: Number(avg(rows.map((x) => x.s.sub_scores.nutrition)).toFixed(2)),
      avg_effort: Number(avg(rows.map((x) => x.s.sub_scores.effort)).toFixed(2)),
      avg_ingredient: Number(avg(rows.map((x) => x.s.sub_scores.ingredient_match)).toFixed(2)),
      pct_nutrition_known: Number(((rows.filter((x) => x.s.nutrition_known).length / Math.max(rows.length, 1)) * 100).toFixed(0)),
    }
  }
  console.log('Average sub-scores of dishes you could partly make:')
  console.table(table)

  // 2. Who actually makes the top 10 and top 30?
  console.log('Where the top suggestions come from:')
  const mix = {}
  for (const persona of ['student', 'professional', 'family']) {
    const out = rankDishes(dishes, { userIngredients: pantry, weights: getPersonaDefaults(persona), limit: 30 })
    const count = (n) => {
      const c = Object.fromEntries(sources.map((s) => [s, 0]))
      out.results.slice(0, n).forEach((r) => { c[r.dish.source] += 1 })
      return Object.entries(c).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}`).join(', ')
    }
    mix[persona] = { 'top 10': count(10), 'top 30': count(30) }
  }
  console.table(mix)
}