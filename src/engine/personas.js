// src/engine/personas.js
// Cold start: before the app knows anything about a user, their persona
// sets sensible starting weights. Each set of weights adds up to 1.

export const DEFAULT_WEIGHTS = {
  variety: 0.25,
  nutrition: 0.25,
  effort: 0.25,
  ingredient_match: 0.25,
}

export const PERSONA_PRESETS = {
  student:      { variety: 0.20, nutrition: 0.20, effort: 0.25, ingredient_match: 0.35 },
  professional: { variety: 0.20, nutrition: 0.25, effort: 0.35, ingredient_match: 0.20 },
  family:       { variety: 0.30, nutrition: 0.30, effort: 0.20, ingredient_match: 0.20 },
  other:        { ...DEFAULT_WEIGHTS },
}

// Returns a COPY, so changing one user's weights never changes the presets
export function getPersonaDefaults(persona) {
  return { ...(PERSONA_PRESETS[persona] ?? DEFAULT_WEIGHTS) }
}