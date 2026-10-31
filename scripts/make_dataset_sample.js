// Makes two SMALL files a new chat can read, so the 1,277-dish dataset itself never has to be uploaded.
//   data/processed/dataset_sample.json   3 real dishes per source (shows every field)
//   data/processed/dataset_profile.json  counts and tag statistics for the whole dataset
import fs from 'fs'

const dishes = JSON.parse(fs.readFileSync('data/processed/mealmind_dataset.json', 'utf8'))

const bySource = {}
for (const dish of dishes) (bySource[dish.source] ??= []).push(dish)

const sample = Object.values(bySource).flatMap((list) =>
  list.slice(0, 3).map((d) => ({
    ...d,
    instructions: d.instructions ? d.instructions.slice(0, 200) + '...' : d.instructions,
  }))
)

const count = (items, keyFn) => {
  const out = {}
  for (const item of items) for (const key of [].concat(keyFn(item))) out[key] = (out[key] ?? 0) + 1
  return out
}
const countTrue = (items, group) => {
  const out = {}
  for (const item of items) for (const [tag, value] of Object.entries(item[group] ?? {})) if (value === true) out[tag] = (out[tag] ?? 0) + 1
  return out
}

const profile = {
  total_dishes: dishes.length,
  per_source: count(dishes, (d) => d.source),
  per_area_top10: Object.fromEntries(Object.entries(count(dishes, (d) => d.area)).sort((a, b) => b[1] - a[1]).slice(0, 10)),
  meal_type_counts: count(dishes, (d) => d.meal_type ?? []),
  effort_tier_counts: count(dishes, (d) => String(d.effort_tier)),
  nutrition_tier_counts: count(dishes, (d) => d.nutrition_tier),
  dishes_with_nutrition_numbers: dishes.filter((d) => typeof d.nutrition?.protein_g === 'number').length,
  dishes_with_prep_time: dishes.filter((d) => typeof d.prep_time_minutes === 'number').length,
  dishes_with_instructions: dishes.filter((d) => d.instructions).length,
  dietary_tags_true_counts: countTrue(dishes, 'dietary_tags'),
  health_tags_true_counts: countTrue(dishes, 'health_tags'),
  all_field_names: [...new Set(dishes.flatMap((d) => Object.keys(d)))].sort(),
}

fs.writeFileSync('data/processed/dataset_sample.json', JSON.stringify(sample, null, 2))
fs.writeFileSync('data/processed/dataset_profile.json', JSON.stringify(profile, null, 2))
console.log(`Wrote dataset_sample.json (${sample.length} dishes) and dataset_profile.json`)
console.log(profile)