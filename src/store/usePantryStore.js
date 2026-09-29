import { create } from 'zustand'

export const usePantryStore = create((set) => ({
  pantry: [],
  isLoaded: false,

  setPantry: (pantry) => set({ pantry, isLoaded: true }),

  addIngredient: (ingredient) => set((state) => {
    const normalized = ingredient.trim().toLowerCase()
    const exists = state.pantry.find(i => i.name === normalized)
    if (exists) return state
    return {
      pantry: [...state.pantry, {
        name: normalized,
        category: null,
        added_at: new Date().toISOString()
      }]
    }
  }),

  removeIngredient: (name) => set((state) => ({
    pantry: state.pantry.filter(i => i.name !== name)
  })),

  clearPantry: () => set({ pantry: [] }),
}))