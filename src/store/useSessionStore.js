import { create } from 'zustand'

export const useSessionStore = create((set) => ({
  // current ingredient input (quick list mode)
  quickIngredients: [],

  // current suggestion session
  rankedSuggestions: [],
  shownDishIds: [],
  selectedMealType: 'any',
  selectedRequestType: 'single',
  isLoadingSuggestions: false,
  narrations: {},

  // actions
  setQuickIngredients: (ingredients) => set({ quickIngredients: ingredients }),

  addQuickIngredient: (ingredient) => set((state) => {
    const normalized = ingredient.trim().toLowerCase()
    if (state.quickIngredients.includes(normalized)) return state
    return { quickIngredients: [...state.quickIngredients, normalized] }
  }),

  removeQuickIngredient: (ingredient) => set((state) => ({
    quickIngredients: state.quickIngredients.filter(i => i !== ingredient)
  })),

  setMealType: (type) => set({ selectedMealType: type }),
  setRequestType: (type) => set({ selectedRequestType: type }),

  setSuggestions: (suggestions) => set({
    rankedSuggestions: suggestions,
    shownDishIds: suggestions.map(s => s.id),
  }),

  addShownDishId: (id) => set((state) => ({
    shownDishIds: [...state.shownDishIds, id]
  })),

  setNarration: (dishId, narration) => set((state) => ({
    narrations: { ...state.narrations, [dishId]: narration }
  })),

  setLoadingSuggestions: (loading) => set({ isLoadingSuggestions: loading }),

  clearSession: () => set({
    quickIngredients: [],
    rankedSuggestions: [],
    shownDishIds: [],
    selectedMealType: 'any',
    selectedRequestType: 'single',
    isLoadingSuggestions: false,
    narrations: {},
  }),
}))