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

// ── Normalize TheMealDB dishes to our schema ────────────────────────
function inferMealType(category) {
  const cat = (category || '').toLowerCase()
  if (['breakfast', 'dessert', 'starter'].some(c => cat.includes(c))) return ['breakfast']
  if (['side', 'miscellaneous', 'goat', 'lamb', 'pasta', 'seafood',
       'vegetarian', 'vegan'].some(c => cat.includes(c))) return ['lunch', 'dinner']
  return ['lunch', 'dinner']
}

function inferEffortTier(ingredients) {
  const count = ingredients.length
  if (count <= 5)  return 1
  if (count <= 10) return 2
  return 3
}

function inferDietaryTags(ingredients) {
  const joined = ingredients.join(' ').toLowerCase()
  const meatWords = ['chicken','beef','pork','lamb','fish','shrimp','bacon',
                     'ham','turkey','salmon','tuna','crab','lobster','sausage']
  const porkWords = ['pork','bacon','ham','lard','prosciutto','pancetta']
  const dairyWords = ['milk','butter','cheese','cream','yogurt','yoghurt']
  const glutenWords = ['flour','wheat','bread','pasta','barley','rye','semolina']

  const hasMeat  = meatWords.some(w => joined.includes(w))
  const hasPork  = porkWords.some(w => joined.includes(w))
  const hasDairy = dairyWords.some(w => joined.includes(w))
  const hasGluten = glutenWords.some(w => joined.includes(w))

  return {
    vegetarian:    !hasMeat,
    vegan:         !hasMeat && !hasDairy,
    halal:         !hasPork,
    contains_pork: hasPork,
    gluten_free:   !hasGluten,
  }
}

function inferHealthTags(ingredients, dietaryTags) {
  const joined = ingredients.join(' ').toLowerCase()

  const highGiWords  = ['rice','white bread','sugar','potato','pasta','flour']
  const highNaWords  = ['soy sauce','salt','stock','broth','worcestershire','miso']
  const satFatWords  = ['butter','cream','lard','coconut oil','palm oil','cheese']
  const dairyWords   = ['milk','butter','cheese','cream','yogurt']
  const highKWords   = ['potato','banana','spinach','tomato','beans','lentil','avocado']
  const highPWords   = ['beans','lentil','dairy','nuts','seeds','whole grain','brown rice']

  return {
    low_gi:            !highGiWords.some(w => joined.includes(w)),
    low_sodium:        !highNaWords.some(w => joined.includes(w)),
    low_saturated_fat: !satFatWords.some(w => joined.includes(w)),
    dairy_free:        !dairyWords.some(w => joined.includes(w)),
    low_potassium:     !highKWords.some(w => joined.includes(w)),
    low_phosphorus:    !highPWords.some(w => joined.includes(w)),
  }
}

function inferNutritionTier(ingredients) {
  const joined = ingredients.join(' ').toLowerCase()
  const proteinWords = ['chicken','beef','fish','eggs','beans','lentil','tofu','shrimp','salmon','tuna']
  const carbWords    = ['rice','pasta','bread','potato','flour','oats','noodle']

  const hasProtein = proteinWords.some(w => joined.includes(w))
  const hasCarb    = carbWords.some(w => joined.includes(w))

  if (hasProtein && !hasCarb) return 'protein_heavy'
  if (hasCarb && !hasProtein) return 'carb_heavy'
  if (!hasProtein && !hasCarb) return 'light'
  return 'balanced'
}

const normalizedMealdb = mealdbRaw.map((dish, i) => {
  const dietary = inferDietaryTags(dish.ingredients)
  return {
    source_id:         `mdb_${String(i + 1).padStart(4, '0')}`,
    source:            'mealdb',
    name:              dish.name,
    area:              dish.area || 'International',
    category:          dish.category || 'Main Course',
    meal_type:         inferMealType(dish.category),
    ingredients:       dish.ingredients,
    effort_tier:       inferEffortTier(dish.ingredients),
    prep_time_minutes: null,
    dietary_tags:      dietary,
    health_tags:       inferHealthTags(dish.ingredients, dietary),
    nutrition: {
      calories_per_serving: null,
      protein_g:  null,
      carbs_g:    null,
      fat_g:      null,
      fiber_g:    null,
    },
    nutrition_tier: inferNutritionTier(dish.ingredients),
    image_url:      dish.image_url || null,
    instructions:   dish.instructions || null,
  }
})

// ── Merge all three sources ─────────────────────────────────────────
const allDishes = [...normalizedMealdb, ...nigerianData, ...worldExtra]

// ── Deduplicate by name (case-insensitive) ──────────────────────────
const seen = new Set()
const deduplicated = allDishes.filter(dish => {
  const key = dish.name.toLowerCase().trim()
  if (seen.has(key)) return false
  seen.add(key)
  return true
})

console.log(`\nAfter deduplication: ${deduplicated.length} dishes`)
console.log(`Removed: ${allDishes.length - deduplicated.length} duplicates`)

// ── Source breakdown ────────────────────────────────────────────────
const breakdown = deduplicated.reduce((acc, d) => {
  acc[d.source] = (acc[d.source] || 0) + 1
  return acc
}, {})
console.log('\nBreakdown by source:')
Object.entries(breakdown).forEach(([src, count]) => {
  console.log(`  ${src}: ${count}`)
})

// ── Save final dataset ──────────────────────────────────────────────
fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(deduplicated, null, 2))
console.log(`\n✅ Final dataset saved: ${deduplicated.length} dishes → ${OUTPUT_PATH}`)