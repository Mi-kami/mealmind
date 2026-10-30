// src/engine/matching.js
// Answers: "How much of this dish can the user make with what they have?"

// Words that describe quantity or preparation, not the ingredient itself
const NOISE = new Set([
  'of', 'a', 'an', 'the', 'some', 'few', 'and', 'or', 'with', 'for', 'to',
  'gram', 'kg', 'kilogram', 'litre', 'liter', 'ml', 'cup', 'tablespoon',
  'tbsp', 'tsp', 'teaspoon', 'spoon', 'cooking', 'piece', 'pinch', 'handful', 'bunch',
  'fresh', 'dried', 'smoked', 'chopped', 'sliced', 'diced', 'minced', 'grated',
  'ground', 'cooked', 'boiled', 'frozen', 'raw', 'whole', 'large', 'small', 'medium', 'big',
  'taste', 'optional', 'cube',
])

// Different names for the same food
const ALIASES = {
  chilli: 'chili', chillies: 'chili', chilies: 'chili',
  okro: 'okra', aubergine: 'eggplant', courgette: 'zucchini',
  prawn: 'shrimp', prawns: 'shrimp', groundnut: 'peanut', groundnuts: 'peanut',
  yoghurt: 'yogurt',
  // Seasoning cubes, bouillon and the popular brands are the same thing
  bouillon: 'seasoning', maggi: 'seasoning', knorr: 'seasoning',
}

const IRREGULAR = { leaves: 'leaf' }

// "tomatoes" -> "tomato", "eggs" -> "egg"
function singularize(word) {
  if (IRREGULAR[word]) return IRREGULAR[word]
  if (word.length <= 3) return word
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y'
  if (/(oes|ches|shes|xes|sses)$/.test(word)) return word.slice(0, -2)
  if (word.endsWith('ss') || word.endsWith('us')) return word
  if (word.endsWith('s')) return word.slice(0, -1)
  return word
}

// Ingredients people nearly always have. They never count as "missing".
// Bare "pepper" is NOT here: in Nigerian cooking it means chili pepper.
const STAPLE_SET = new Set(
  [
    ['salt'], ['water'], ['black', 'pepper'],
    ['oil'], ['vegetable', 'oil'], ['olive', 'oil'], ['sunflower', 'oil'],
  ].map((words) => [...words].sort().join(' '))
)

const cache = new Map()

// "Cooking spoons palm oil" -> ["palm", "oil"]
export function normalizeIngredient(text) {
  const key = String(text)
  if (cache.has(key)) return cache.get(key)

  const tokens = key
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .map((w) => singularize(ALIASES[w] ?? w))
    .filter((w) => !NOISE.has(w))

  const unique = [...new Set(tokens)]
  cache.set(key, unique)
  return unique
}

const isStaple = (tokens) => STAPLE_SET.has([...tokens].sort().join(' '))
const isSubset = (small, big) => small.every((t) => big.includes(t))

// A match if one ingredient's words all appear inside the other's.
// "chicken" matches "chicken breast", and "chicken breast" matches "chicken".
function ingredientsMatch(a, b) {
  return isSubset(a, b) || isSubset(b, a)
}

export function computeIngredientMatch(dish, userIngredients = []) {
  const userTokens = userIngredients.map(normalizeIngredient).filter((t) => t.length > 0)

  // What the dish needs: cleaned up, staples removed, duplicates removed
  const needed = []
  const seen = new Set()
  for (const raw of dish.ingredients ?? []) {
    const tokens = normalizeIngredient(raw)
    if (tokens.length === 0 || isStaple(tokens)) continue
    const key = [...tokens].sort().join(' ')
    if (seen.has(key)) continue
    seen.add(key)
    needed.push({ text: String(raw).trim(), tokens })
  }

  // Nothing real to match means no match. We never claim a perfect score from nothing.
  if (needed.length === 0) return { score: 0, matched: [], missing: [] }

  const matched = []
  const missing = []
  for (const item of needed) {
    const hasIt = userTokens.some((u) => ingredientsMatch(u, item.tokens))
    ;(hasIt ? matched : missing).push(item.text)
  }

  return {
    score: Number((matched.length / needed.length).toFixed(3)),
    matched,
    missing,
  }
}