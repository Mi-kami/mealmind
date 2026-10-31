// src/engine/scoring.js
// Puts the whole engine together: filter, score, rank.

import { applyHardFilters, isNigerianDish } from './filters.js'
import { applyVarietyScores, excludeShownThisSession, DEFAULT_WINDOW_DAYS } from './variety.js'
import { computeIngredientMatch } from './matching.js'

// ── Tunable numbers ─────────────────────────────────────────────────
// "Doubt" added to the ingredient match: matching 1 of 1 ingredients counts
// for less than matching 7 of 7. Same idea as trusting 200 reviews more than 1.
export const SMOOTHING = 1

// Easier dishes score higher. How much that matters is up to the user's effort weight.
export const EFFORT_EASE = { 1: 1.0, 2: 0.6, 3: 0.2 }

// Last-resort value, used only if NO dish in the pool has nutrition numbers.
export const NEUTRAL_NUTRITION = 0.5

// Healthy share of calories from each nutrient (the standard "acceptable
// macronutrient distribution ranges" for adults).
const AMDR = { protein: [0.10, 0.35], carbs: [0.45, 0.65], fat: [0.20, 0.35] }
const AMDR_SLACK = 0.20 // 20 percentage points outside the range = zero for that nutrient

// A past-cuisine habit can tilt the final score by at most this much (10%)
export const MAX_CUISINE_TILT = 0.10

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const round3 = (x) => Number(x.toFixed(3))

// ── Sub-score: nutrition ────────────────────────────────────────────
export function computeNutritionScore(dish) {
  const n = dish.nutrition ?? {}
  const grams = [n.protein_g, n.carbs_g, n.fat_g]
  if (grams.some((g) => typeof g !== 'number' || !Number.isFinite(g) || g < 0)) {
    return { score: NEUTRAL_NUTRITION, known: false }
  }

  const calories = 4 * n.protein_g + 4 * n.carbs_g + 9 * n.fat_g
  if (calories < 20) return { score: NEUTRAL_NUTRITION, known: false }

  const shares = {
    protein: (4 * n.protein_g) / calories,
    carbs: (4 * n.carbs_g) / calories,
    fat: (9 * n.fat_g) / calories,
  }

  let total = 0
  for (const [nutrient, [low, high]] of Object.entries(AMDR)) {
    const share = shares[nutrient]
    const distance = share < low ? low - share : share > high ? share - high : 0
    total += 1 - Math.min(1, distance / AMDR_SLACK)
  }
  return { score: total / 3, known: true }
}

// ── Sub-score: effort ───────────────────────────────────────────────
export function computeEffortScore(dish) {
  return EFFORT_EASE[dish.effort_tier] ?? 0.6
}

// ── All four sub-scores for one dish ────────────────────────────────
export function computeSubScores(dish, userIngredients = [], { nutritionFill = NEUTRAL_NUTRITION } = {}) {
  const hasPantry = userIngredients.some((i) => String(i).trim() !== '')
  const nutrition = computeNutritionScore(dish)

  let ingredientMatch = null
  let ingredient = null
  if (hasPantry) {
    const match = computeIngredientMatch(dish, userIngredients)
    const needed = match.matched.length + match.missing.length
    ingredientMatch = needed === 0 ? 0 : match.matched.length / (needed + SMOOTHING)
    ingredient = {
      matched: match.matched,
      missing: match.missing,
      coverage: match.score, // the plain "you have 6 of 7" figure
    }
  }

  return {
    sub_scores: {
      variety: dish.variety_score ?? 1,
      nutrition: nutrition.known ? nutrition.score : nutritionFill,
      effort: computeEffortScore(dish),
      ingredient_match: ingredientMatch,
    },
    nutrition_known: nutrition.known,
    ingredient,
  }
}

// With no pantry entered, ingredient match is switched off and the other
// three weights are rescaled to add up to 1 again.
export function effectiveWeights(weights, hasPantry) {
  if (hasPantry) return { ...weights }
  const others = ['variety', 'nutrition', 'effort']
  const sum = others.reduce((total, k) => total + weights[k], 0)
  return {
    variety: weights.variety / sum,
    nutrition: weights.nutrition / sum,
    effort: weights.effort / sum,
    ingredient_match: 0,
  }
}

export function scoreDish(subScores, weights) {
  let total = 0
  for (const key of Object.keys(weights)) {
    if (typeof subScores[key] === 'number') total += weights[key] * subScores[key]
  }
  return total
}

// ── Cuisine habit: leans toward what the user actually picks ────────
const cuisineGroup = (dish) => (isNigerianDish(dish) ? 'nigerian' : 'international')

function buildCuisineHabit(history, dishById) {
  const counts = { nigerian: 0, international: 0 }
  for (const entry of history) {
    const dish = dishById.get(entry.dish_id)
    if (dish) counts[cuisineGroup(dish)] += 1
  }
  const total = counts.nigerian + counts.international
  // The +1 / +2 keeps a brand new user at exactly 50/50 (no tilt)
  return (group) => (counts[group] + 1) / (total + 2)
}

// ── The full pipeline ───────────────────────────────────────────────
export function rankDishes(
  allDishes,
  {
    userIngredients = [],
    weights,
    history = [],
    shownIds = [],
    dietaryFilters = [],
    healthConditions = [],
    dislikedFoods = [],
    mealType = 'any',
    cuisinePreference = 'both',
    limit = 3,
    now = new Date(),
    windowDays = DEFAULT_WINDOW_DAYS,
  } = {}
) {
  const hasPantry = userIngredients.some((i) => String(i).trim() !== '')

  // 1. Hard filters, then reroll memory, then variety
  const filtered = applyHardFilters(allDishes, {
    dietaryFilters, healthConditions, dislikedFoods, mealType, cuisinePreference,
  })
  const fresh = excludeShownThisSession(filtered, shownIds)
  const withVariety = applyVarietyScores(fresh, history, windowDays, now)

  // A dish with no nutrition numbers is scored as an AVERAGE dish: the mean of the
  // dishes that do have numbers. "No data" must not look the same as "mediocre".
  const known = withVariety.map(computeNutritionScore).filter((n) => n.known)
  const nutritionFill = known.length > 0
    ? known.reduce((total, n) => total + n.score, 0) / known.length
    : NEUTRAL_NUTRITION

  // 2. Score every remaining dish
  const dishById = new Map(allDishes.map((d) => [d.source_id, d]))
  const habit = buildCuisineHabit(history, dishById)
  const activeWeights = effectiveWeights(weights, hasPantry)

  const scored = []
  for (const dish of withVariety) {
    const { sub_scores, nutrition_known, ingredient } = computeSubScores(dish, userIngredients, { nutritionFill })
    // If the user listed ingredients, a dish sharing none of them is not an option
    if (hasPantry && ingredient.matched.length === 0) continue

    const base = scoreDish(sub_scores, activeWeights)
    const tilt = MAX_CUISINE_TILT * (2 * habit(cuisineGroup(dish)) - 1)
    scored.push({
      dish,
      source_id: dish.source_id,
      name: dish.name,
      final_score: clamp01(base * (1 + tilt)),
      base_score: base,
      cuisine_tilt: tilt,
      sub_scores,
      nutrition_known,
      ingredient,
    })
  }

  // 3. Rank (ties broken by id so results are always repeatable)
  scored.sort((a, b) => b.final_score - a.final_score || a.source_id.localeCompare(b.source_id))

  const results = scored.slice(0, limit).map((r, i) => ({
    rank: i + 1,
    ...r,
    final_score: round3(r.final_score),
    base_score: round3(r.base_score),
    cuisine_tilt: round3(r.cuisine_tilt),
    sub_scores: Object.fromEntries(
      Object.entries(r.sub_scores).map(([k, v]) => [k, v === null ? null : round3(v)])
    ),
    weights_used: Object.fromEntries(Object.entries(activeWeights).map(([k, v]) => [k, round3(v)])),
  }))

  // 4. A clear explanation whenever there is nothing, or less than asked for
  let message = null
  if (results.length === 0) {
    if (filtered.length === 0) message = 'No dishes match your dietary, health and dislike settings for this meal type.'
    else if (fresh.length === 0) message = 'You have seen every matching dish. Start a new search to see them again.'
    else message = 'Nothing we know can be made with those ingredients yet. Try adding more.'
  } else if (results.length < limit) {
    message = `Only ${results.length} dish${results.length === 1 ? '' : 'es'} fit your settings and ingredients.`
  }

  return {
    results,
    message,
    stats: {
      total: allDishes.length,
      after_filters: filtered.length,
      after_reroll_memory: fresh.length,
      scored: scored.length,
      nutrition_fill: round3(nutritionFill),
    },
  }
}

// What the learning loop should learn from. A filled-in nutrition score is an
// estimate, not something about the dish, so it is left out (null = ignore).
export function learningScores(result) {
  return { ...result.sub_scores, nutrition: result.nutrition_known ? result.sub_scores.nutrition : null }
}