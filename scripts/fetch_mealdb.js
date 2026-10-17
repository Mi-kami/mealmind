import fs from 'fs'
import path from 'path'

const BASE_URL = 'https://www.themealdb.com/api/json/v1/1'
const OUTPUT_PATH = 'data/raw/mealdb_raw.json'

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('')

async function fetchMealsByLetter(letter) {
  const res = await fetch(`${BASE_URL}/search.php?f=${letter}`)
  const data = await res.json()
  return data.meals ?? []
}

function extractIngredients(meal) {
  const ingredients = []
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`]?.trim()
    if (ingredient && ingredient !== '') {
      ingredients.push(ingredient.toLowerCase())
    }
  }
  return ingredients
}

async function main() {
  console.log('Fetching meals from TheMealDB by letter...')
  const allMeals = []
  const seenIds = new Set()

  for (const letter of LETTERS) {
    console.log(`  Fetching letter: ${letter.toUpperCase()}`)
    const meals = await fetchMealsByLetter(letter)

    for (const meal of meals) {
      if (seenIds.has(meal.idMeal)) continue
      seenIds.add(meal.idMeal)

      allMeals.push({
        source_id: meal.idMeal,
        source: 'mealdb',
        name: meal.strMeal,
        area: meal.strArea,
        category: meal.strCategory,
        ingredients: extractIngredients(meal),
        instructions: meal.strInstructions,
        image_url: meal.strMealThumb,
      })
    }

    console.log(`  ✓ ${letter.toUpperCase()}: ${meals.length} meals`)
    await new Promise(r => setTimeout(r, 200))
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allMeals, null, 2))
  console.log(`\n✅ Done. ${allMeals.length} meals saved to ${OUTPUT_PATH}`)
}

main().catch(console.error)