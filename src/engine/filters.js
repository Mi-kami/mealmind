// src/engine/filters.js
// Hard filters: these remove dishes BEFORE any scoring happens.
// A dish removed here can never be recommended, whatever its score would be.

// ── Rules: each one answers "is this dish OK for this filter?" ──────
const DIETARY_RULES = {
  vegetarian:  (d) => d.dietary_tags?.vegetarian === true,
  vegan:       (d) => d.dietary_tags?.vegan === true,
  halal:       (d) => d.dietary_tags?.halal === true,
  no_pork:     (d) => d.dietary_tags?.contains_pork === false,
  gluten_free: (d) => d.dietary_tags?.gluten_free === true,
}

const HEALTH_RULES = {
  diabetes:            (d) => d.health_tags?.low_gi === true,
  hypertension:        (d) => d.health_tags?.low_sodium === true,
  high_cholesterol:    (d) => d.health_tags?.low_saturated_fat === true,
  lactose_intolerance: (d) => d.health_tags?.dairy_free === true,
  celiac:              (d) => d.dietary_tags?.gluten_free === true,
  kidney_disease:      (d) =>
    d.health_tags?.low_potassium === true &&
    d.health_tags?.low_phosphorus === true,
}

// Keeps only dishes that pass EVERY active rule
function applyRules(dishes, activeKeys, rules, label) {
  const activeRules = []
  for (const key of activeKeys) {
    if (rules[key]) activeRules.push(rules[key])
    else console.warn(`[filters] Unknown ${label}: "${key}" (ignored)`)
  }
  if (activeRules.length === 0) return dishes
  return dishes.filter((dish) => activeRules.every((rule) => rule(dish)))
}

export function filterByDietary(dishes, dietaryFilters = []) {
  return applyRules(dishes, dietaryFilters, DIETARY_RULES, 'dietary filter')
}

export function filterByHealth(dishes, healthConditions = []) {
  return applyRules(dishes, healthConditions, HEALTH_RULES, 'health condition')
}

// ── Dislikes ────────────────────────────────────────────────────────
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Matches the WHOLE word only (plus a plural "s"/"es").
// So "ram" will not match "gram", and "okra" will match "okras".
function buildDislikeMatcher(term) {
  const cleaned = term.trim().toLowerCase()
  if (!cleaned) return null
  return new RegExp(`\\b${escapeRegExp(cleaned)}(?:s|es)?\\b`, 'i')
}

export function filterByDislikes(dishes, dislikedFoods = []) {
  const matchers = dislikedFoods.map(buildDislikeMatcher).filter(Boolean)
  if (matchers.length === 0) return dishes

  return dishes.filter((dish) => {
    const textsToCheck = [dish.name ?? '', ...(dish.ingredients ?? [])]
    const isDisliked = matchers.some((matcher) =>
      textsToCheck.some((text) => matcher.test(text))
    )
    return !isDisliked
  })
}

// ── Meal type ───────────────────────────────────────────────────────
// Desserts stay in the dataset but only appear if a dessert is asked for.
export function filterByMealType(dishes, mealType = 'any') {
  if (mealType === 'any') {
    return dishes.filter((d) => !(d.meal_type?.length === 1 && d.meal_type[0] === 'dessert'))
  }
  return dishes.filter(
    (d) => d.meal_type?.includes(mealType) || d.meal_type?.includes('any')
  )
}

// ── Cuisine preference ──────────────────────────────────────────────
export const isNigerianDish = (d) => d.area === 'Nigerian' || d.source === 'nigerian_curated'

export function filterByCuisine(dishes, preference = 'both') {
  if (preference === 'nigerian') return dishes.filter(isNigerianDish)
  if (preference === 'international') return dishes.filter((d) => !isNigerianDish(d))
  return dishes
}

// ── Runs everything in the agreed order ─────────────────────────────
export function applyHardFilters(
  dishes,
  {
    dietaryFilters = [],
    healthConditions = [],
    dislikedFoods = [],
    mealType = 'any',
    cuisinePreference = 'both',
  } = {}
) {
  let result = filterByMealType(dishes, mealType)
  result = filterByCuisine(result, cuisinePreference)
  result = filterByDietary(result, dietaryFilters)
  result = filterByHealth(result, healthConditions)
  result = filterByDislikes(result, dislikedFoods)
  return result
}