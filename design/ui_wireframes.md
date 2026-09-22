# MealMind — UI-WIREFRAMES.md

> **Day 52 Design Document** | AB Talks 60-Day AI Challenge — Capstone  
> Complete user flows, screen inventory, and low-fidelity wireframes.

---

## 1. User Flow Overview

```
App Load
   │
   ├── Guest (no session)
   │      │
   │      ├── First visit → Onboarding Flow → Home
   │      └── Return visit → Home (state from localStorage)
   │
   └── Signed-in User
          │
          ├── First visit → Onboarding Flow → Home
          └── Return visit → Home (state from Supabase)

Home
   │
   ├── Suggest a Meal
   │      │
   │      ├── Choose mode: Single Meal or Full Day
   │      ├── Choose input: Quick List or Saved Pantry
   │      │      └── Quick List → enter ingredients
   │      │      └── Saved Pantry → auto-loaded
   │      ├── (optional) Apply dietary filters
   │      ├── Tap "Find My Meal"
   │      └── Suggestion Results Screen
   │             │
   │             ├── View top 2-3 ranked cards
   │             ├── Expand card → Reasoning Breakdown
   │             ├── Accept → logs meal, updates weights
   │             ├── Skip → nudges weights, shows next
   │             └── Reroll → shows next batch
   │
   ├── My Pantry
   │      ├── View saved ingredients
   │      ├── Add ingredient
   │      └── Remove ingredient
   │
   ├── Settings / Profile
   │      ├── Update persona
   │      ├── Update dietary filters
   │      ├── Update cuisine preference
   │      ├── View confidence indicator
   │      └── Sign in / Sign up / Sign out
   │
   └── Auth Screens (sign in / sign up)
```

---

## 2. Screen Inventory

| Screen | Route | Auth Required |
|---|---|---|
| Onboarding (persona) | `/onboarding` | No |
| Onboarding (dietary) | `/onboarding/dietary` | No |
| Home / Dashboard | `/` | No |
| Ingredient Input | `/suggest/ingredients` | No |
| Suggestion Results | `/suggest/results` | No |
| My Pantry | `/pantry` | No (localStorage for guests) |
| Settings / Profile | `/settings` | No (limited for guests) |
| Sign In | `/auth/signin` | No |
| Sign Up | `/auth/signup` | No |

---

## 3. Wireframes

### Screen 1: Onboarding — Persona Selection

```
┌────────────────────────────────────┐
│                                    │
│        🧠 MealMind                 │
│                                    │
│   Let's personalize your           │
│   recommendations.                 │
│                                    │
│   Who are you cooking for?         │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  👤 Just me (Student)        │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  💼 Just me (Professional)   │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  👨‍👩‍👧 My Family               │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  🍽️  Other                   │  │
│  └──────────────────────────────┘  │
│                                    │
│  [Skip for now]                    │
│                                    │
└────────────────────────────────────┘
```

---

### Screen 2: Onboarding — Dietary Filters

```
┌────────────────────────────────────┐
│                                    │
│   Any dietary restrictions?        │
│   (Select all that apply)          │
│                                    │
│  ☐  Vegetarian                     │
│  ☐  Vegan                          │
│  ☐  Halal                          │
│  ☐  No Pork                        │
│  ☐  Gluten Free                    │
│                                    │
│  ┌──────────────────────────────┐  │
│  │        Continue →            │  │
│  └──────────────────────────────┘  │
│                                    │
│  [Skip — no restrictions]          │
│                                    │
└────────────────────────────────────┘
```

---

### Screen 3: Home / Dashboard

```
┌────────────────────────────────────┐
│  🧠 MealMind        [Profile icon] │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  Good evening, Temi 👋       │  │
│  │  What shall we eat?          │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────┐  ┌────────────────┐  │
│  │  🍽️      │  │    📅          │  │
│  │ One Meal │  │  Plan My Day   │  │
│  └──────────┘  └────────────────┘  │
│                                    │
│  ──────── Recent suggestions ───── │
│                                    │
│  • Jollof Rice (dinner, yesterday) │
│  • Omelette (breakfast, 2d ago)    │
│                                    │
│  ── How well does MealMind        │
│     know you? ──                   │
│                                    │
│  [●●●●●○○○○○]  5 / 10             │
│  Getting there! Keep using it.     │
│                                    │
│  ─────────────────────────────     │
│  [My Pantry]  [Settings]           │
└────────────────────────────────────┘
```

---

### Screen 4: Ingredient Input

```
┌────────────────────────────────────┐
│  ← Back        What do you have?  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  ⚡ Quick List               │  │◄── tab active
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  🗄️  My Saved Pantry         │  │
│  └──────────────────────────────┘  │
│                                    │
│  Type ingredients you have:        │
│  ┌──────────────────────────────┐  │
│  │  rice, tomatoes, onions...   │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────┐ ┌────────┐ ┌─────────┐  │
│  │ rice │ │tomatoes│ │ onions  │  │  ← chips
│  └──────┘ └────────┘ └─────────┘  │
│                                    │
│  Meal type:                        │
│  [Breakfast] [Lunch] [Dinner] [Any]│
│                                    │
│  Request type:                     │
│  [One Meal]  [Full Day]            │
│                                    │
│  ┌──────────────────────────────┐  │
│  │      🔍 Find My Meal         │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

---

### Screen 5: Suggestion Results

```
┌────────────────────────────────────┐
│  ← Back        Your Suggestions   │
│                                    │
│  Based on what you have:           │
│  rice · tomatoes · onions + 3 more │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  #1  Jollof Rice    ★ 86%   │  │
│  │  🇳🇬  Dinner · 60 min         │  │
│  │                              │  │
│  │  [Why this?  ▼]             │  │  ← expands below
│  │                              │  │
│  │  [✓ I'll make this]  [Skip →]│  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  #2  Tomato Egg Stir Fry  74%│  │
│  │  🌍  Dinner · 20 min          │  │
│  │  [Why this? ▼]              │  │
│  │  [✓ I'll make this] [Skip →] │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  #3  Rice and Stew    69%   │  │
│  │  🇳🇬  Dinner · 45 min         │  │
│  │  [Why this? ▼]              │  │
│  │  [✓ I'll make this] [Skip →] │  │
│  └──────────────────────────────┘  │
│                                    │
│  [🔄 Give me different options]    │
└────────────────────────────────────┘
```

---

### Screen 6: Reasoning Breakdown (expanded card)

```
┌────────────────────────────────────┐
│  #1  Jollof Rice          ★ 86%   │
│  🇳🇬 Dinner · 60 min · Halal       │
│                                    │
│  Why MealMind picked this:         │
│                                    │
│  "Jollof Rice is a strong match    │
│   tonight — you have almost         │
│   everything you need, it fits     │
│   your weeknight effort range,     │
│   and you haven't had it recently. │
│   The nutritional balance is solid │
│   for a dinner serving."           │
│                                    │
│  Score breakdown:                  │
│                                    │
│  Ingredient match  ████████░░  88% │
│  Effort fit        █████████░  91% │
│  Variety           ████████░░  82% │
│  Nutrition         ███████░░░  74% │
│                                    │
│  Missing: bay leaves               │
│                                    │
│  [✓ I'll make this]  [Skip →]     │
└────────────────────────────────────┘
```

---

### Screen 7: My Pantry

```
┌────────────────────────────────────┐
│  ← Back          My Pantry        │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  + Add ingredient...         │  │
│  └──────────────────────────────┘  │
│                                    │
│  Proteins (3)                      │
│  ┌────────┐ ┌────────┐ ┌────────┐ │
│  │chicken │ │  eggs  │ │ beans  │ │
│  │   [×]  │ │  [×]   │ │  [×]  │ │
│  └────────┘ └────────┘ └────────┘ │
│                                    │
│  Carbs (2)                         │
│  ┌────────┐ ┌────────┐             │
│  │  rice  │ │  yam   │             │
│  │  [×]   │ │  [×]   │             │
│  └────────┘ └────────┘             │
│                                    │
│  Vegetables (4)                    │
│  ...                               │
│                                    │
│  [🗑 Clear all pantry]             │
│                                    │
│  [Sign in to save across devices] │  ← guest only
└────────────────────────────────────┘
```

---

### Screen 8: Settings / Profile

```
┌────────────────────────────────────┐
│  ← Back          Settings         │
│                                    │
│  Account                          │
│  ┌──────────────────────────────┐  │
│  │  temi@example.com            │  │
│  │  [Sign out]                  │  │
│  └──────────────────────────────┘  │
│                                    │
│  My Persona                        │
│  [Student] [●Professional] [Family]│
│                                    │
│  Dietary Filters                   │
│  [●Halal] [ Vegetarian] [No Pork] │
│                                    │
│  Cuisine Preference                │
│  [Nigerian] [●Both] [International]│
│                                    │
│  MealMind knows you...             │
│  [●●●●●●○○○○]  6/10 feedback events│
│  Keep rating suggestions to        │
│  improve recommendations.          │
│                                    │
│  ─────────────────────────────     │
│  [Reset my preferences]            │
└────────────────────────────────────┘
```

---

### Screen 9: Sign In

```
┌────────────────────────────────────┐
│                                    │
│        🧠 MealMind                 │
│                                    │
│   Sign in to sync your             │
│   preferences everywhere.          │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  G  Continue with Google     │  │
│  └──────────────────────────────┘  │
│                                    │
│           ── or ──                 │
│                                    │
│  Email                             │
│  ┌──────────────────────────────┐  │
│  │  you@example.com             │  │
│  └──────────────────────────────┘  │
│  Password                          │
│  ┌──────────────────────────────┐  │
│  │  ••••••••                    │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │         Sign In              │  │
│  └──────────────────────────────┘  │
│                                    │
│  Don't have an account? [Sign up]  │
│  [Continue as guest →]             │
└────────────────────────────────────┘
```

---

## 4. Navigation Structure

```
App Shell
├── Header (logo + nav icons)
│     ├── Home
│     ├── My Pantry
│     └── Profile/Settings (+ auth state)
│
├── Bottom Nav (mobile)
│     ├── 🏠 Home
│     ├── 🍽️ Suggest
│     ├── 🗄️ Pantry
│     └── 👤 Profile
│
└── Page Content (React Router outlet)
```

---

## 5. Responsive Design Notes

- Mobile-first layout (375px base)
- Suggestion cards stack vertically on mobile, side-by-side on ≥768px
- Bottom nav on mobile, left sidebar nav on desktop (≥1024px)
- Score breakdown bars use CSS width driven by score value (animated via Framer Motion)
- Confidence indicator is a segmented progress bar, 10 segments total

---

## 6. Visual Design Direction

Consistent with the production-grade aesthetic from prior builds:

- **Color palette:** Deep navy (`#0B1D33`) backgrounds, cream (`#F4EFE6`) surfaces, amber (`#E8871E`) accents, white text on dark
- **Typography:** Geist Sans (UI), Geist Mono (scores/numbers)
- **Motion:** Framer Motion — suggestion cards animate in staggered, score bars fill on mount, reasoning section expands with spring physics
- **Suggestion card state:** Idle → Expanded (reasoning) → Accepted (green flash, exits) / Skipped (slides out left)