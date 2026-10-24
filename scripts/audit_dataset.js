import fs from 'fs'

const dishes = JSON.parse(fs.readFileSync('data/processed/mealmind_dataset.json', 'utf8'))

const NON_DAIRY = /(?:coconut|almond|soy|soya|oat|rice|cashew) (?:milk|cream)|cream of tartar|peanut butter|nut butter|cocoa butter|butter beans?/g
const ingText = (d) =>
  (d.ingredients ?? []).join(' | ').toLowerCase()
    .replace(/[a-z]+\s+vinegar/g, '')
    .replace(/garden eggs?/g, '')
    .replace(NON_DAIRY, '')
const found = (d, words) =>
  words.filter((w) => new RegExp(`\\b${w}(?:s|es)?\\b`).test(ingText(d)))

const CHECKS = [
  { label: 'tagged VEGAN but has egg/honey/dairy',
    applies: (d) => d.dietary_tags?.vegan === true,
    words: ['egg', 'honey', 'milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'ghee', 'mayonnaise'] },
  { label: 'tagged VEGETARIAN but has animal ingredient',
    applies: (d) => d.dietary_tags?.vegetarian === true,
    words: ['chicken', 'beef', 'pork', 'lamb', 'mutton', 'goat', 'bacon', 'ham', 'sausage', 'chorizo', 'mince', 'steak', 'fish', 'anchovy', 'anchovies', 'shrimp', 'prawn', 'crab', 'lobster', 'squid', 'mussel', 'oyster', 'gelatin', 'lard', 'liver', 'turkey', 'duck', 'meat', 'crayfish', 'stockfish', 'snail', 'suya'] },
  { label: 'tagged GLUTEN-FREE but has gluten',
    applies: (d) => d.dietary_tags?.gluten_free === true,
    words: ['flour', 'wheat', 'bread', 'breadcrumb', 'pasta', 'spaghetti', 'noodle', 'barley', 'rye', 'semolina', 'couscous', 'soy sauce', 'pastry', 'tortilla', 'cracker', 'biscuit', 'pita', 'naan', 'dumpling', 'malt'] },
  { label: 'tagged HALAL but has alcohol or pork',
    applies: (d) => d.dietary_tags?.halal === true,
    words: ['wine', 'beer', 'rum', 'brandy', 'vodka', 'whisky', 'whiskey', 'sake', 'liqueur', 'sherry', 'bourbon', 'stout', 'lager', 'tequila', 'mirin', 'pork', 'bacon', 'ham', 'lard', 'gammon', 'prosciutto', 'pancetta', 'salami', 'chorizo', 'pepperoni'] },
  { label: 'tagged DAIRY-FREE but has dairy',
    applies: (d) => d.health_tags?.dairy_free === true,
    words: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'ghee', 'whey', 'custard', 'paneer'] },
  { label: 'tagged KIDNEY-SAFE but has dairy/beans/potato/tomato/banana/spinach',
    applies: (d) => d.health_tags?.low_phosphorus === true && d.health_tags?.low_potassium === true,
    words: ['milk', 'cheese', 'yogurt', 'yoghurt', 'cream', 'beans', 'lentil', 'potato', 'tomato', 'banana', 'spinach', 'avocado', 'nuts'] },
  { label: 'tagged LOW-SODIUM but has a concentrated salty ingredient',
    applies: (d) => d.health_tags?.low_sodium === true,
    words: ['soy sauce', 'stock', 'broth', 'bouillon', 'seasoning cube', 'maggi', 'fish sauce', 'oyster sauce', 'miso', 'ham', 'bacon', 'gammon', 'sausage', 'salami', 'chorizo', 'pepperoni', 'prosciutto', 'pancetta', 'anchovy', 'anchovies', 'cheese', 'feta', 'olive', 'caper', 'pickle'] },
  { label: 'tagged LOW-SATURATED-FAT but has butter/cream/palm oil/coconut oil/cheese/cured meat',
    applies: (d) => d.health_tags?.low_saturated_fat === true,
    words: ['butter', 'cream', 'lard', 'palm oil', 'coconut oil', 'cheese', 'ghee', 'bacon', 'sausage'] },
]

for (const check of CHECKS) {
  const hits = dishes
    .filter(check.applies)
    .map((d) => ({ d, words: found(d, check.words) }))
    .filter((x) => x.words.length > 0)

  const bySource = {}
  hits.forEach(({ d }) => { bySource[d.source] = (bySource[d.source] ?? 0) + 1 })

  console.log(`\n${check.label}: ${hits.length}`)
  if (hits.length) console.log('  by source:', bySource)
  hits.slice(0, 5).forEach(({ d, words }) =>
    console.log(`   - ${d.name} (${d.source_id}) -> ${words.join(', ')}`)
  )
}

const breakfastOnly = dishes.filter((d) => d.meal_type?.length === 1 && d.meal_type[0] === 'breakfast')
const bySrc = {}
breakfastOnly.forEach((d) => {
  const key = `${d.source} | ${d.category}`
  bySrc[key] = (bySrc[key] ?? 0) + 1
})
console.log(`\nBreakfast-only dishes: ${breakfastOnly.length}`)
console.table(bySrc)

const sodiumOver = dishes.filter(
  (d) => d.health_tags?.low_sodium === true && (d.nutrition?.sodium_mg ?? 0) > 140
)
console.log(`\ntagged LOW-SODIUM but sodium_mg above 140: ${sodiumOver.length}`)

const saltOnly = dishes.filter(
  (d) => d.health_tags?.low_sodium === true && /\bsalt\b/.test(ingText(d))
)
console.log(`Info: low-sodium dishes that still list plain salt (left as validated): ${saltOnly.length}`)