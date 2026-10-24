import fs from 'fs'
import path from 'path'

const OUTPUT_PATH = 'data/processed/mealmind_dataset.json'

// ── Load all three sources ──────────────────────────────────────────
const mealdbRaw    = JSON.parse(fs.readFileSync('data/raw/mealdb_raw.json', 'utf8'))
const nigerianData = JSON.parse(fs.readFileSync('data/raw/nigerian_cleaned.json', 'utf8'))
const worldExtra   = JSON.parse(fs.readFileSync('data/raw/world_extra_cleaned.json', 'utf8'))

console.log(`TheMealDB:    ${mealdbRaw.length} dishes`)
console.log(`Nigerian:     ${nigerianData.length} dishes`)
console.log(`World extra:  ${worldExtra.length} dishes`)

// ── Keyword lists (whole-word matching, plurals allowed) ────────────
const MEAT = [
  'chicken', 'beef', 'pork', 'lamb', 'mutton', 'goat', 'veal', 'venison', 'rabbit',
  'duck', 'turkey', 'bacon', 'ham', 'gammon', 'sausage', 'chorizo', 'salami',
  'pepperoni', 'prosciutto', 'pancetta', 'mince', 'steak', 'brisket', 'oxtail',
  'liver', 'tripe', 'meatball', 'gelatin', 'gelatine', 'lard', 'fish', 'salmon',
  'tuna', 'cod', 'haddock', 'anchovy', 'anchovies', 'sardine', 'mackerel', 'prawn',
  'shrimp', 'crab', 'lobster', 'squid', 'calamari', 'mussel', 'clam', 'oyster',
  'scallop', 'worcestershire', 'meat', 'crayfish', 'stockfish', 'snail', 'suya', 'ponmo', 'kpomo',
]
const PORK = ['pork', 'bacon', 'ham', 'gammon', 'lard', 'prosciutto', 'pancetta', 'chorizo', 'salami', 'pepperoni']
const ALCOHOL = [
  'wine', 'beer', 'rum', 'brandy', 'vodka', 'whisky', 'whiskey', 'sake', 'liqueur',
  'sherry', 'bourbon', 'stout', 'lager', 'ale', 'gin', 'tequila', 'mirin', 'marsala',
  'port', 'cognac', 'champagne', 'prosecco', 'vermouth', 'madeira', 'amaretto', 'kirsch',
]
const DAIRY = [
  'milk', 'butter', 'buttermilk', 'cheese', 'cream', 'yogurt', 'yoghurt', 'ghee', 'whey',
  'custard', 'paneer', 'ricotta', 'mascarpone', 'parmesan', 'mozzarella', 'cheddar',
  'feta', 'halloumi',
]
const EGG_HONEY = ['egg', 'honey', 'mayonnaise', 'mayo']
const GLUTEN = [
  'flour', 'wheat', 'bread', 'breadcrumb', 'pasta', 'spaghetti', 'noodle', 'barley',
  'rye', 'semolina', 'couscous', 'bulgur', 'tortilla', 'pastry', 'cracker', 'biscuit',
  'soy sauce', 'pita', 'naan', 'dumpling', 'lasagne', 'macaroni', 'seitan', 'malt',
]
const HIGH_GI = ['rice', 'white bread', 'bread', 'sugar', 'potato', 'pasta', 'flour', 'noodle', 'honey', 'syrup']
const HIGH_SODIUM = [
  'salt', 'soy sauce', 'stock', 'broth', 'bouillon', 'worcestershire', 'miso',
  'fish sauce', 'oyster sauce', 'seasoning cube', 'maggi',
  // cured, salted and pickled foods
  'ham', 'bacon', 'gammon', 'sausage', 'salami', 'chorizo', 'pepperoni', 'prosciutto',
  'pancetta', 'anchovy', 'anchovies', 'cheese', 'feta', 'halloumi', 'parmesan',
  'olive', 'caper', 'pickle', 'pickled', 'kimchi',
]
// Concentrated sources only. Plain "salt" is left out on purpose (see safety pass).
const SALTY_STRONG = HIGH_SODIUM.filter((w) => w !== 'salt')
const HIGH_SAT_FAT = [
  'butter', 'cream', 'lard', 'coconut oil', 'palm oil', 'cheese', 'ghee', 'suet',
  'coconut milk', 'coconut cream', 'bacon', 'sausage',
]
const HIGH_POTASSIUM = [
  'potato', 'banana', 'spinach', 'tomato', 'avocado', 'beans', 'lentil', 'chickpea',
  'pumpkin', 'squash', 'yam', 'plantain', 'orange', 'apricot', 'raisin', 'mushroom',
  'beetroot',
]
// Non-dairy phosphorus sources. Dairy is checked separately.
const HIGH_PHOSPHORUS = [
  'beans', 'lentil', 'chickpea', 'nuts', 'almond', 'peanut', 'cashew', 'walnut',
  'pistachio', 'hazelnut', 'seeds', 'sesame', 'oats', 'oatmeal', 'bran',
  'whole grain', 'brown rice', 'chocolate', 'cocoa',
]
// Plant "milks", cream of tartar etc. are not dairy
const NON_DAIRY = /(?:coconut|almond|soy|soya|oat|rice|cashew) (?:milk|cream)|cream of tartar|peanut butter|nut butter|cocoa butter|butter beans?/g

// ── Helpers ─────────────────────────────────────────────────────────
const textOf = (ingredients) => (ingredients ?? []).join(' | ').toLowerCase()

// Whole-word match, so "ham" does not match "graham"
const hasAny = (text, words) =>
  words.some((w) => new RegExp(`\\b${w}(?:s|es)?\\b`).test(text))

// "red wine vinegar" is not treated as alcohol
function mentionsAlcohol(ingredients) {
  const text = textOf(ingredients).replace(/[a-z]+\s+vinegar/g, '')
  return hasAny(text, ALCOHOL)
}

// ── Normalize TheMealDB dishes to our schema ────────────────────────
function inferMealType(category) {
  const cat = (category || '').toLowerCase()
  if (cat.includes('breakfast')) return ['breakfast']
  if (cat.includes('dessert')) return ['dessert']
  return ['lunch', 'dinner']
}

function inferEffortTier(ingredients) {
  const count = ingredients.length
  if (count <= 5) return 1
  if (count <= 10) return 2
  return 3
}

function inferDietaryTags(ingredients) {
  const text = textOf(ingredients)
  const dairyText = text.replace(NON_DAIRY, '')
  const hasMeat = hasAny(text, MEAT)
  const hasPork = hasAny(text, PORK)
  const hasDairy = hasAny(dairyText, DAIRY)
  const hasEggHoney = hasAny(text, EGG_HONEY)

  return {
    vegetarian:    !hasMeat,
    vegan:         !hasMeat && !hasDairy && !hasEggHoney,
    halal:         !hasPork && !mentionsAlcohol(ingredients),
    contains_pork: hasPork,
    gluten_free:   !hasAny(text, GLUTEN),
  }
}

function inferHealthTags(ingredients) {
  const text = textOf(ingredients)
  const dairyText = text.replace(NON_DAIRY, '')
  const hasDairy = hasAny(dairyText, DAIRY)

  return {
    low_gi:            !hasAny(text, HIGH_GI),
    low_sodium:        !hasAny(text, HIGH_SODIUM),
    low_saturated_fat: !hasAny(text, HIGH_SAT_FAT),
    dairy_free:        !hasDairy,
    low_potassium:     !hasAny(text, HIGH_POTASSIUM),
    low_phosphorus:    !hasDairy && !hasAny(text, HIGH_PHOSPHORUS),
  }
}

function inferNutritionTier(ingredients) {
  const joined = textOf(ingredients)
  const proteinWords = ['chicken', 'beef', 'fish', 'eggs', 'beans', 'lentil', 'tofu', 'shrimp', 'salmon', 'tuna']
  const carbWords = ['rice', 'pasta', 'bread', 'potato', 'flour', 'oats', 'noodle']
  const hasProtein = proteinWords.some((w) => joined.includes(w))
  const hasCarb = carbWords.some((w) => joined.includes(w))

  if (hasProtein && !hasCarb) return 'protein_heavy'
  if (hasCarb && !hasProtein) return 'carb_heavy'
  if (!hasProtein && !hasCarb) return 'light'
  return 'balanced'
}

const normalizedMealdb = mealdbRaw.map((dish, i) => ({
  source_id:         `mdb_${String(i + 1).padStart(4, '0')}`,
  source:            'mealdb',
  name:              dish.name,
  area:              dish.area || 'International',
  category:          dish.category || 'Main Course',
  meal_type:         inferMealType(dish.category),
  ingredients:       dish.ingredients,
  effort_tier:       inferEffortTier(dish.ingredients),
  prep_time_minutes: null,
  dietary_tags:      inferDietaryTags(dish.ingredients),
  health_tags:       inferHealthTags(dish.ingredients),
  nutrition: {
    calories_per_serving: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    fiber_g: null,
  },
  nutrition_tier: inferNutritionTier(dish.ingredients),
  image_url:      dish.image_url || null,
  instructions:   dish.instructions || null,
}))

// ── Your curated sets: safety pass ──────────────────────────────────
// Your tags stay as validated, with one rule: a tag may flip from true
// to false when the dish's own ingredient list contradicts it. It never
// flips from false to true. Every flip is logged for review.
const SAFETY_RULES = [
  { group: 'dietary_tags', tag: 'vegetarian',  breaks: (t) => hasAny(t, MEAT) },
  { group: 'dietary_tags', tag: 'vegan',       breaks: (t, d) => hasAny(t, MEAT) || hasAny(d, DAIRY) || hasAny(t, EGG_HONEY) },
  { group: 'dietary_tags', tag: 'halal',       breaks: (t) => hasAny(t.replace(/[a-z]+\s+vinegar/g, ''), ALCOHOL) },
  { group: 'dietary_tags', tag: 'gluten_free', breaks: (t) => hasAny(t, GLUTEN) },
  { group: 'health_tags',  tag: 'dairy_free',     breaks: (t, d) => hasAny(d, DAIRY) },
  { group: 'health_tags',  tag: 'low_potassium',  breaks: (t) => hasAny(t, HIGH_POTASSIUM) },
  { group: 'health_tags',  tag: 'low_phosphorus', breaks: (t, d) => hasAny(d, DAIRY) || hasAny(t, HIGH_PHOSPHORUS) },
  { group: 'health_tags', tag: 'low_sodium', breaks: (t) => hasAny(t, SALTY_STRONG) },
  { group: 'health_tags', tag: 'low_sodium', breaks: (t, d, dish) => (dish.nutrition?.sodium_mg ?? 0) > 140 },
  { group: 'health_tags', tag: 'low_saturated_fat', breaks: (t) => hasAny(t.replace(/butter beans?|cream of tartar/g, ''), HIGH_SAT_FAT) },
]

const flipped = []
function safetyPass(dish) {
  // "garden egg" is the Nigerian eggplant, not an egg
  const t = textOf(dish.ingredients).replace(/garden eggs?/g, '')
  const d = t.replace(NON_DAIRY, '')
  const next = {
    ...dish,
    dietary_tags: { ...dish.dietary_tags },
    health_tags: { ...dish.health_tags },
  }
  for (const rule of SAFETY_RULES) {
    if (next[rule.group][rule.tag] === true && rule.breaks(t, d, dish)) {
      next[rule.group][rule.tag] = false
      flipped.push({ source_id: dish.source_id, name: dish.name, source: dish.source, tag: rule.tag })
    }
  }
  return next
}
const curated = [...nigerianData, ...worldExtra].map(safetyPass)
// ── Merge and deduplicate by name ───────────────────────────────────
const allDishes = [...normalizedMealdb, ...curated]
const seen = new Set()
const deduplicated = allDishes.filter((dish) => {
  const key = dish.name.toLowerCase().trim()
  if (seen.has(key)) return false
  seen.add(key)
  return true
})

console.log(`\nAfter deduplication: ${deduplicated.length} dishes`)
console.log(`Removed: ${allDishes.length - deduplicated.length} duplicates`)

const breakdown = deduplicated.reduce((acc, d) => {
  acc[d.source] = (acc[d.source] || 0) + 1
  return acc
}, {})
console.log('\nBreakdown by source:')
Object.entries(breakdown).forEach(([src, count]) => console.log(`  ${src}: ${count}`))

const isDessertOnly = (d) => d.meal_type?.length === 1 && d.meal_type[0] === 'dessert'
const isBreakfastOnly = (d) => d.meal_type?.length === 1 && d.meal_type[0] === 'breakfast'
console.log(`\nDessert-only dishes:    ${deduplicated.filter(isDessertOnly).length}`)
console.log(`Breakfast-only dishes:  ${deduplicated.filter(isBreakfastOnly).length}`)

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(deduplicated, null, 2))

const flipSummary = {}
flipped.forEach((f) => {
  const key = `${f.source} | ${f.tag}`
  flipSummary[key] = (flipSummary[key] ?? 0) + 1
})
console.log('\nSafety pass: tags flipped from true to false in your curated sets')
console.table(flipSummary)
fs.writeFileSync('data/processed/safety_flips.json', JSON.stringify(flipped, null, 2))

console.log(`\n✅ Final dataset saved: ${deduplicated.length} dishes → ${OUTPUT_PATH}`)