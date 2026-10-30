import fs from 'fs'
import { computeIngredientMatch, normalizeIngredient } from '../src/engine/matching.js'
import { PERSONA_PRESETS } from '../src/engine/personas.js'

const check = (label, ok) => console.log(`  ${ok ? '✓' : '✗ FAILED'} ${label}`)

console.log('── Cleaning messy ingredient text ──')
for (const raw of ['Tomatoes', 'cooking spoons palm oil', 'grams assorted meats', 'of okra', 'Okro', 'bay leaves', 'ground crayfish']) {
  console.log(`  "${raw}" -> [${normalizeIngredient(raw).join(', ')}]`)
}

console.log('\n── Persona weights ──')
for (const [name, w] of Object.entries(PERSONA_PRESETS)) {
  const sum = Object.values(w).reduce((a, b) => a + b, 0)
  check(`${name} adds up to 1 (${sum.toFixed(2)})`, Math.abs(sum - 1) < 0.001)
}

console.log('\n── Matching rules ──')
check('"Tomatoes" matches "tomato", staples ignored',
  computeIngredientMatch({ ingredients: ['tomato', 'salt', 'water'] }, ['Tomatoes']).score === 1)
check('"chicken breast" covers "chicken"',
  computeIngredientMatch({ ingredients: ['chicken'] }, ['chicken breast']).score === 1)
check('A dish of only staples scores 0',
  computeIngredientMatch({ ingredients: ['salt', 'water'] }, ['rice']).score === 0)
check('An empty pantry scores 0',
  computeIngredientMatch({ ingredients: ['rice', 'beans'] }, []).score === 0)
const partial = computeIngredientMatch({ ingredients: ['rice', 'bay leaves'] }, ['rice'])
check('Half matched, and bay leaves reported missing',
  partial.score === 0.5 && partial.missing[0] === 'bay leaves')
check('Bare "pepper" is not a staple',
  computeIngredientMatch({ ingredients: ['pepper', 'rice'] }, ['rice']).missing.includes('pepper'))

const dishes = JSON.parse(fs.readFileSync('data/processed/mealmind_dataset.json', 'utf8'))
const pantry = ['rice', 'tomatoes', 'onions', 'chicken', 'palm oil', 'pepper', 'crayfish', 'seasoning cubes']
console.log(`\n── Real dataset, pantry: ${pantry.join(', ')} ──`)

const ranked = dishes
  .map((d) => ({ d, m: computeIngredientMatch(d, pantry) }))
  .sort((a, b) => b.m.score - a.m.score)

ranked.slice(0, 8).forEach(({ d, m }) => {
  console.log(`  ${(m.score * 100).toFixed(0)}%  ${d.name} (${d.source_id})  ${m.matched.length}/${m.matched.length + m.missing.length}  missing: ${m.missing.slice(0, 3).join(', ') || 'nothing'}`)
})
console.log(`\n  Dishes at 80% or more: ${ranked.filter((x) => x.m.score >= 0.8).length}`)
console.log(`  Dishes with any match: ${ranked.filter((x) => x.m.score > 0).length} of ${dishes.length}`)