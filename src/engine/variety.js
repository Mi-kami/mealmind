// src/engine/variety.js
// Variety = "how fresh does this dish feel right now?"
// 1.0 = not eaten recently, 0.0 = eaten just now.

const MS_PER_DAY = 24 * 60 * 60 * 1000
export const DEFAULT_WINDOW_DAYS = 5

// For each dish, finds the most recent time it was accepted
function latestSeenByDish(history) {
  const latest = new Map()
  for (const entry of history) {
    const time = new Date(entry.suggested_at).getTime()
    if (Number.isNaN(time)) continue
    const previous = latest.get(entry.dish_id)
    if (previous === undefined || time > previous) {
      latest.set(entry.dish_id, time)
    }
  }
  return latest
}

// Attaches a variety_score (0 to 1) to every dish
export function applyVarietyScores(
  dishes,
  history = [],
  windowDays = DEFAULT_WINDOW_DAYS,
  now = new Date()
) {
  const latest = latestSeenByDish(history)
  const nowMs = now.getTime()

  return dishes.map((dish) => {
    const lastSeen = latest.get(dish.source_id)
    if (lastSeen === undefined) return { ...dish, variety_score: 1 }

    const daysSince = Math.max(0, (nowMs - lastSeen) / MS_PER_DAY)
    const score = Math.min(daysSince / windowDays, 1)
    return { ...dish, variety_score: Number(score.toFixed(3)) }
  })
}

// Reroll memory: removes dishes already shown in this session
export function excludeShownThisSession(dishes, shownIds = []) {
  if (shownIds.length === 0) return dishes
  const shown = new Set(shownIds)
  return dishes.filter((dish) => !shown.has(dish.source_id))
}