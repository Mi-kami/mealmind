import { create } from 'zustand'

const DEFAULT_WEIGHTS = {
  variety: 0.25,
  nutrition: 0.25,
  effort: 0.25,
  ingredient_match: 0.25,
}

const PERSONA_PRESETS = {
  student:      { variety: 0.20, nutrition: 0.20, effort: 0.25, ingredient_match: 0.35 },
  professional: { variety: 0.20, nutrition: 0.25, effort: 0.35, ingredient_match: 0.20 },
  family:       { variety: 0.30, nutrition: 0.30, effort: 0.20, ingredient_match: 0.20 },
  other:        { variety: 0.25, nutrition: 0.25, effort: 0.25, ingredient_match: 0.25 },
}

export const useWeightsStore = create((set) => ({
  weights: { ...DEFAULT_WEIGHTS },
  feedbackCount: 0,

  setWeightsFromPersona: (persona) => set({
    weights: { ...PERSONA_PRESETS[persona] ?? DEFAULT_WEIGHTS }
  }),

  setWeights: (weights) => set({ weights }),

  incrementFeedback: () => set((state) => ({
    feedbackCount: state.feedbackCount + 1
  })),

  resetWeights: () => set({
    weights: { ...DEFAULT_WEIGHTS },
    feedbackCount: 0
  }),
}))