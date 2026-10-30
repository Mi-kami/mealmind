import { create } from 'zustand'
import { getPersonaDefaults, DEFAULT_WEIGHTS } from '../engine/personas.js'

export const useWeightsStore = create((set) => ({
  weights: { ...DEFAULT_WEIGHTS },
  feedbackCount: 0,

  setWeightsFromPersona: (persona) => set({ weights: getPersonaDefaults(persona) }),
  setWeights: (weights) => set({ weights }),
  incrementFeedback: () => set((state) => ({ feedbackCount: state.feedbackCount + 1 })),
  resetWeights: () => set({ weights: { ...DEFAULT_WEIGHTS }, feedbackCount: 0 }),
}))