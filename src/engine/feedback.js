// src/engine/feedback.js
// The learning loop. Every time the user accepts, skips or rejects a dish,
// the weights shift a little toward what that choice says they care about.

export const MIN_WEIGHT = 0.05
export const MAX_WEIGHT = 0.60
export const DEFAULT_LEARNING_RATE = 0.05

const CRITERIA = ['variety', 'nutrition', 'effort', 'ingredient_match']

// How strongly each action teaches the engine.
// Rerolls are logged elsewhere but teach nothing: asking for a different
// option does not mean the shown dish was bad.
export const ACTION_SIGNAL = { accepted: 1, skipped: -0.5, rejected: -1, rerolled: 0 }

// Forces a set of weights to add up to 1 with every weight inside [min, max].
// Weights in "locked" are left untouched.
// Method: shift every free weight up or down by the SAME amount, never letting
// one leave its limits, and search for the shift that makes the total exactly 1.
export function projectWeights(weights, { min = MIN_WEIGHT, max = MAX_WEIGHT, locked = [] } = {}) {
  const result = {}
  let target = 1
  for (const key of locked) {
    result[key] = weights[key]
    target -= weights[key]
  }

  const free = Object.keys(weights).filter((k) => !locked.includes(k))
  if (free.length === 0) return result

  // If the limits make the target impossible, fall back to an even split
  if (target < free.length * min - 1e-12 || target > free.length * max + 1e-12) {
    for (const key of free) result[key] = target / free.length
    return result
  }

  const clip = (x) => Math.min(max, Math.max(min, x))
  const totalAfterShift = (shift) => free.reduce((total, k) => total + clip(weights[k] - shift), 0)

  // Bigger shift = smaller total, so we can home in on the right one
  let low = Math.min(...free.map((k) => weights[k])) - max
  let high = Math.max(...free.map((k) => weights[k])) - min
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2
    if (totalAfterShift(mid) > target) low = mid
    else high = mid
  }
  const shift = (low + high) / 2
  for (const key of free) result[key] = clip(weights[key] - shift)
  return result
}

// subScores = the four sub-scores the dish had when it was suggested.
// A criterion with a null score was not in play (e.g. no pantry entered)
// so its weight is left alone.
export function applyFeedback(currentWeights, subScores, action, learningRate = DEFAULT_LEARNING_RATE) {
  const signal = ACTION_SIGNAL[action] ?? 0
  if (signal === 0) return { ...currentWeights }

  const active = CRITERIA.filter((k) => typeof subScores?.[k] === 'number')
  if (active.length < 2) return { ...currentWeights }

  const mean = active.reduce((total, k) => total + subScores[k], 0) / active.length

  const next = { ...currentWeights }
  for (const key of active) {
    // Criteria where this dish was stronger than its own average move the most
    next[key] = currentWeights[key] + learningRate * signal * (subScores[key] - mean)
  }

  const locked = CRITERIA.filter((k) => !active.includes(k))
  return projectWeights(next, { locked })
}