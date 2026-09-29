import { create } from 'zustand'

export const useUserStore = create((set) => ({
  // auth
  user: null,
  isGuest: true,
  isLoading: true,

  // profile
  persona: null,
  dietaryFilters: [],
  healthConditions: [],
  dislikedFoods: [],
  cuisinePreference: 'both',
  onboarded: false,

  // actions
  setUser: (user) => set({ user, isGuest: false }),
  setGuest: () => set({ user: null, isGuest: true }),
  setLoading: (isLoading) => set({ isLoading }),
  setProfile: (profile) => set({ ...profile }),
  setOnboarded: (onboarded) => set({ onboarded }),
  updateDietaryFilters: (filters) => set({ dietaryFilters: filters }),
  updateHealthConditions: (conditions) => set({ healthConditions: conditions }),
  updateDislikedFoods: (foods) => set({ dislikedFoods: foods }),
  reset: () => set({
    user: null,
    isGuest: true,
    persona: null,
    dietaryFilters: [],
    healthConditions: [],
    dislikedFoods: [],
    cuisinePreference: 'both',
    onboarded: false,
  }),
}))