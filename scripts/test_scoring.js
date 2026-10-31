import fs from 'fs'
import {
  rankDishes, computeNutritionScore, computeSubScores, effectiveWeights, SMOOTHING, learningScores,
} from '../src/engine/scoring.js'
import {
  applyFeedback, projectWeights, MIN_WEIGHT, MAX_WEIGHT,
} from '../src/engine/feedback.js'
import { getPersonaDefaults } from '../src/engine/personas.js'

let failures = 0
const check = (label, ok) => {
  if (!ok) failures += 1
  console.log(`  ${ok ? '✓' : '✗ FAILED'} ${label}`)
}
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0)
const near = (a, b, tol = 1e-9) => Math.abs(a - b) < tol

const dishes = JSON.parse(fs.readFileSync('data/processed/mealmind_dataset.json', 'utf8'))
const NOW = new Date('2026-10-30T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000

// ───────────────────────────────────────────────────────────────────
console.log('── 1. Weights always stay valid (20,000 random trials) ──')
let badSum = 0, badBounds = 0
for (let i = 0; i < 20000; i++) {
  const raw = {
    variety: Math.random() * 2 - 0.5, nutrition: Math.random() * 2 - 0.5,
    effort: Math.random() * 2 - 0.5, ingredient_match: Math.random() * 2 - 0.5,
  }
  const lockOne = i % 4 === 0
  const locked = lockOne ? ['ingredient_match'] : []
  if (lockOne) raw.ingredient_match = 0.05 + Math.random() * 0.4
  const w = projectWeights(raw, { locked })
  if (!near(sum(w), 1, 1e-9)) badSum++
  if (Object.values(w).some((v) => v < MIN_WEIGHT - 1e-9 || v > MAX_WEIGHT + 1e-9)) badBounds++
}
check(`every result adds up to 1 (${badSum} failures)`, badSum === 0)
check(`every weight stays between ${MIN_WEIGHT} and ${MAX_WEIGHT} (${badBounds} failures)`, badBounds === 0)

// ───────────────────────────────────────────────────────────────────
console.log('\n── 2. The learning loop moves in the right direction ──')
const prof = getPersonaDefaults('professional')
const easyDish = { variety: 1, nutrition: 0.5, effort: 1, ingredient_match: 0.8 }
const afterAccept = applyFeedback(prof, easyDish, 'accepted')
const afterReject = applyFeedback(prof, easyDish, 'rejected')
check('accepting an easy dish raises the effort weight', afterAccept.effort > prof.effort)
check('accepting it lowers the nutrition weight (the dish was weak there)', afterAccept.nutrition < prof.nutrition)
check('rejecting it does the opposite', afterReject.effort < prof.effort && afterReject.nutrition > prof.nutrition)
check('skipping moves weights less than rejecting',
  Math.abs(applyFeedback(prof, easyDish, 'skipped').effort - prof.effort) <
  Math.abs(afterReject.effort - prof.effort))
check('a reroll changes nothing', applyFeedback(prof, easyDish, 'rerolled').effort === prof.effort)
check('weights still add up to 1 after feedback', near(sum(afterAccept), 1) && near(sum(afterReject), 1))
const noPantrySub = { variety: 1, nutrition: 0.5, effort: 1, ingredient_match: null }
const afterNoPantry = applyFeedback(prof, noPantrySub, 'accepted')
check('with no pantry, the ingredient weight is not touched', afterNoPantry.ingredient_match === prof.ingredient_match)
let w = { ...prof }
for (let i = 0; i < 500; i++) w = applyFeedback(w, easyDish, 'accepted')
check(`500 identical accepts cannot push a weight past the limits (effort = ${w.effort.toFixed(3)})`,
  Object.values(w).every((v) => v >= MIN_WEIGHT - 1e-9 && v <= MAX_WEIGHT + 1e-9) && near(sum(w), 1))

// ───────────────────────────────────────────────────────────────────
console.log('\n── 3. Nutrition score ──')
const balanced = computeNutritionScore({ nutrition: { protein_g: 25, carbs_g: 55, fat_g: 15 } })
const allCarbs = computeNutritionScore({ nutrition: { protein_g: 2, carbs_g: 80, fat_g: 1 } })
const unknown = computeNutritionScore({ nutrition: { protein_g: null, carbs_g: null, fat_g: null } })
check(`balanced macros score 1 (${balanced.score.toFixed(2)})`, balanced.known && near(balanced.score, 1))
check(`almost pure carbs score much lower (${allCarbs.score.toFixed(2)})`, allCarbs.score < 0.4)
check('missing numbers give a neutral 0.5 and are flagged as unknown', unknown.score === 0.5 && unknown.known === false)

// ───────────────────────────────────────────────────────────────────
console.log('\n── 3b. Unknown nutrition is scored as an average dish ──')
const mk = (id, protein, carbs, fat) => ({
  source_id: id, name: id, ingredients: ['rice'], effort_tier: 2, meal_type: ['dinner'],
  dietary_tags: {}, health_tags: {}, nutrition: { protein_g: protein, carbs_g: carbs, fat_g: fat },
})
const known1 = mk('k1', 25, 55, 15)
const known2 = mk('k2', 2, 80, 1)
const unk = mk('u1', null, null, null)
const poolRun = rankDishes([known1, known2, unk], {
  userIngredients: ['rice'], weights: getPersonaDefaults('other'), limit: 3, now: NOW,
})
const expectedFill = (computeNutritionScore(known1).score + computeNutritionScore(known2).score) / 2
const unkResult = poolRun.results.find((r) => r.source_id === 'u1')
check(`the unknown dish gets the pool average (${expectedFill.toFixed(3)}), not a fixed 0.5`,
  Math.abs(unkResult.sub_scores.nutrition - expectedFill) < 0.001)
check('it is still flagged as unknown', unkResult.nutrition_known === false)
check('the learning loop ignores a filled-in nutrition score', learningScores(unkResult).nutrition === null)

// ───────────────────────────────────────────────────────────────────
console.log('\n── 4. Plain rice no longer beats a proper dish ──')
const plainRice = { source_id: 't1', name: 'Plain rice', ingredients: ['rice'] }
const fullDish = { source_id: 't2', name: 'Stew', ingredients: ['rice', 'tomato', 'onion', 'chicken', 'pepper', 'thyme', 'curry', 'bay leaf'] }
const pantry7 = ['rice', 'tomato', 'onion', 'chicken', 'pepper', 'thyme', 'curry']
const a = computeSubScores(plainRice, pantry7).sub_scores.ingredient_match
const b = computeSubScores(fullDish, pantry7).sub_scores.ingredient_match
check(`1 of 1 ingredients scores ${a.toFixed(2)}, 7 of 8 scores ${b.toFixed(2)}`, a < b)

// ───────────────────────────────────────────────────────────────────
console.log('\n── 5. Full pipeline on the dataset ──')
const pantry = ['rice', 'tomatoes', 'onions', 'chicken', 'palm oil', 'pepper', 'crayfish', 'seasoning cubes']
const base = { userIngredients: pantry, weights: getPersonaDefaults('professional'), now: NOW }

const r1 = rankDishes(dishes, base)
check('returns 3 results by default', r1.results.length === 3)
check('results are sorted best first',
  r1.results.every((r, i) => i === 0 || r1.results[i - 1].final_score >= r.final_score))
check('the same inputs always give the same results',
  JSON.stringify(rankDishes(dishes, base).results.map((r) => r.source_id)) === JSON.stringify(r1.results.map((r) => r.source_id)))

const veg = rankDishes(dishes, { ...base, dietaryFilters: ['vegetarian'], limit: 10 })
check('vegetarian filter: every result is vegetarian', veg.results.every((r) => r.dish.dietary_tags.vegetarian === true))
const hyp = rankDishes(dishes, { ...base, healthConditions: ['hypertension'], limit: 10 })
check('hypertension filter: every result is low sodium', hyp.results.every((r) => r.dish.health_tags.low_sodium === true))
const noRice = rankDishes(dishes, { ...base, dislikedFoods: ['rice'], limit: 10 })
check('disliked food never appears', noRice.results.every((r) => !/\brice\b/i.test([r.name, ...r.dish.ingredients].join(' '))))
const nig = rankDishes(dishes, { ...base, cuisinePreference: 'nigerian', limit: 10 })
check('cuisine preference "nigerian" returns only Nigerian dishes', nig.results.every((r) => r.dish.area === 'Nigerian'))

const reroll = rankDishes(dishes, { ...base, shownIds: r1.results.map((r) => r.source_id) })
check('reroll never repeats a shown dish',
  reroll.results.every((r) => !r1.results.some((s) => s.source_id === r.source_id)))

const topId = r1.results[0].source_id
const ate = rankDishes(dishes, {
  ...base, limit: 50,
  history: [{ dish_id: topId, suggested_at: new Date(NOW - DAY).toISOString() }],
})
const topNow = ate.results.find((r) => r.source_id === topId)
check(`a dish eaten yesterday scores lower (${r1.results[0].final_score} -> ${topNow ? topNow.final_score : 'dropped out'})`,
  !topNow || topNow.final_score < r1.results[0].final_score)

const noPantry = rankDishes(dishes, { ...base, userIngredients: [] })
check('no pantry: still returns suggestions', noPantry.results.length === 3)
check('no pantry: ingredient match is off and weights still add up to 1',
  noPantry.results.every((r) => r.sub_scores.ingredient_match === null &&
    r.weights_used.ingredient_match === 0 && near(sum(r.weights_used), 1, 0.01)))

const impossible = rankDishes(dishes, { ...base, userIngredients: ['unobtainium'] })
check('impossible ingredients: no results and a clear message',
  impossible.results.length === 0 && typeof impossible.message === 'string')

const t1 = { source_id: 'a', name: 'A', area: 'Nigerian', source: 'nigerian_curated', ingredients: ['rice', 'tomato'], effort_tier: 2, meal_type: ['dinner'], dietary_tags: {}, health_tags: {}, nutrition: {} }
const t2 = { ...t1, source_id: 'b', name: 'B', area: 'Italian', source: 'mealdb' }
const habitHistory = Array.from({ length: 10 }, () => ({ dish_id: 'a', suggested_at: new Date(NOW - 30 * DAY).toISOString() }))
const tilted = rankDishes([t1, t2], { userIngredients: ['rice', 'tomato'], weights: getPersonaDefaults('other'), history: habitHistory, now: NOW })
check('after many Nigerian meals, an otherwise identical Nigerian dish ranks first',
  tilted.results[0].source_id === 'a' && tilted.results[0].final_score > tilted.results[1].final_score)

// ───────────────────────────────────────────────────────────────────
console.log('\n── 6. What each persona gets (pantry: ' + pantry.join(', ') + ') ──')
for (const persona of ['student', 'professional', 'family']) {
  const out = rankDishes(dishes, { ...base, weights: getPersonaDefaults(persona) })
  console.log(`\n  ${persona.toUpperCase()}  weights ${JSON.stringify(getPersonaDefaults(persona))}`)
  for (const r of out.results) {
    const s = r.sub_scores
    console.log(`   #${r.rank} ${r.name}  final ${r.final_score}  | var ${s.variety} nut ${s.nutrition}${r.nutrition_known ? '' : '(?)'} eff ${s.effort} ing ${s.ingredient_match}  (${r.ingredient.matched.length}/${r.ingredient.matched.length + r.ingredient.missing.length} ingredients)`)
  }
}

// ───────────────────────────────────────────────────────────────────
console.log('\n── 7. Learning over time: a user who always cooks the most involved dish of their top 5 ──')
const bigPantry = [...pantry, 'beans', 'eggs', 'plantain', 'yam']
let learned = getPersonaDefaults('professional')
const startWeights = { ...learned }
let past = []
for (let round = 0; round <= 20; round++) {
  const day = new Date(NOW.getTime() + round * DAY)
  const out = rankDishes(dishes, { userIngredients: bigPantry, weights: learned, history: past, limit: 5, now: day })
  if (round % 10 === 0) {
    const efforts = out.results.map((r) => r.sub_scores.effort)
    console.log(`  round ${String(round).padStart(2)}: effort ${learned.effort.toFixed(3)}  nutrition ${learned.nutrition.toFixed(3)}  variety ${learned.variety.toFixed(3)}  ingredient ${learned.ingredient_match.toFixed(3)}   effort scores of the top 5: [${efforts.join(', ')}]`)
  }
  if (out.results.length === 0) break
  const pick = [...out.results].sort((x, y) => x.sub_scores.effort - y.sub_scores.effort)[0]
  for (const r of out.results) {
    learned = applyFeedback(learned, learningScores(r), r.source_id === pick.source_id ? 'accepted' : 'skipped')
  }
  past.push({ dish_id: pick.source_id, suggested_at: day.toISOString() })
}
check(`the effort weight fell as the user kept choosing involved dishes (${startWeights.effort.toFixed(2)} -> ${learned.effort.toFixed(2)})`,
  learned.effort < startWeights.effort)

console.log(failures === 0 ? '\n✅ All checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)