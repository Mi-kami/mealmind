const GUEST_KEY = 'mealmind_guest'

const defaultGuestState = {
  version: 2,
  persona: null,
  dietary_filters: [],
  health_conditions: [],
  disliked_foods: [],
  cuisine_preference: 'both',
  onboarded: false,
  weights: {
    variety: 0.25,
    nutrition: 0.25,
    effort: 0.25,
    ingredient_match: 0.25,
  },
  feedback_count: 0,
  pantry: [],
  meal_history: [],
  session_shown: [],
}

export function getGuestState() {
  try {
    const raw = localStorage.getItem(GUEST_KEY)
    if (!raw) return { ...defaultGuestState }
    const parsed = JSON.parse(raw)
    // migrate older versions if needed
    if (parsed.version !== 2) return { ...defaultGuestState }
    return parsed
  } catch {
    return { ...defaultGuestState }
  }
}

export function setGuestState(state) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(state))
  } catch {
    console.warn('localStorage write failed')
  }
}

export function updateGuestState(partial) {
  const current = getGuestState()
  setGuestState({ ...current, ...partial })
}

export function clearGuestState() {
  localStorage.removeItem(GUEST_KEY)
}