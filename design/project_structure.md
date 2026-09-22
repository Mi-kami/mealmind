# MealMind — PROJECT-STRUCTURE.md

> **Day 52 Design Document** | AB Talks 60-Day AI Challenge — Capstone  
> Complete folder structure with responsibility for every major folder and file.

---

## Full Structure

```
mealmind/
│
├── .github/
│   └── workflows/               # CI/CD (post-v1.0, placeholder only)
│
├── design/                      # Day 52 design documents
│   ├── ARCHITECTURE.md
│   ├── SCHEMA.md
│   ├── API.md
│   ├── UI-WIREFRAMES.md
│   └── PROJECT-STRUCTURE.md
│
├── scripts/                     # One-time data pipeline (Day 53)
│   ├── fetch_mealdb.js          # Pull dishes from TheMealDB API
│   ├── fetch_nigerian.js        # Pull from Nigerian food API(s)
│   ├── fetch_usda_nutrition.js  # Look up nutrition per ingredient from USDA
│   ├── merge_dataset.js         # Merge all sources into mealmind_dataset.json
│   └── validate_dataset.js     # Confirm schema compliance of final dataset
│
├── data/
│   ├── raw/                     # Raw API responses cached locally (gitignored)
│   │   ├── mealdb_raw.json
│   │   ├── nigerian_raw.json
│   │   └── usda_raw/            # Per-ingredient nutrition responses
│   └── processed/
│       └── mealmind_dataset.json # Final merged dataset (committed to repo)
│
├── netlify/
│   └── functions/
│       └── narrate.js           # POST /api/narrate — LLM narration endpoint
│
├── src/
│   │
│   ├── main.jsx                 # React app entry point
│   ├── App.jsx                  # Root component, router, auth listener
│   │
│   ├── engine/                  # Core scoring engine — pure JS, no React deps
│   │   ├── filters.js           # Dietary hard-filter logic
│   │   ├── variety.js           # Repeat-avoidance penalty logic
│   │   ├── matching.js          # Ingredient match % computation
│   │   ├── scoring.js           # Sub-scores + weighted final score
│   │   ├── feedback.js          # Weight vector update on accept/skip/reject
│   │   ├── personas.js          # Persona → initial weight presets
│   │   └── index.js             # Barrel export for engine functions
│   │
│   ├── store/                   # Zustand state management
│   │   ├── useUserStore.js      # Persona, dietary filters, auth state, onboarded
│   │   ├── usePantryStore.js    # Saved pantry ingredients
│   │   ├── useWeightsStore.js   # Current weight vector + feedback_count
│   │   ├── useSessionStore.js   # Current suggestion session state
│   │   └── index.js             # Barrel export
│   │
│   ├── lib/                     # Utility libraries and service clients
│   │   ├── supabase.js          # Supabase client initialization
│   │   ├── storage.js           # localStorage read/write helpers (guest persistence)
│   │   ├── narrate.js           # fetch() wrapper for /api/narrate endpoint
│   │   └── dataset.js           # Load + query mealmind_dataset.json
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useAuth.js           # Auth state, sign in, sign out, sign up
│   │   ├── usePersistence.js    # Sync Zustand ↔ Supabase or localStorage
│   │   ├── useSuggestions.js    # Orchestrate scoring run + narration call
│   │   └── useOnboarding.js     # Onboarding step state and completion
│   │
│   ├── pages/                   # Route-level page components
│   │   ├── OnboardingPersona.jsx
│   │   ├── OnboardingDietary.jsx
│   │   ├── Home.jsx
│   │   ├── IngredientInput.jsx
│   │   ├── SuggestionResults.jsx
│   │   ├── Pantry.jsx
│   │   ├── Settings.jsx
│   │   ├── SignIn.jsx
│   │   └── SignUp.jsx
│   │
│   ├── components/              # Reusable UI components
│   │   ├── layout/
│   │   │   ├── AppShell.jsx     # Header + nav + outlet
│   │   │   ├── Header.jsx
│   │   │   ├── BottomNav.jsx    # Mobile navigation
│   │   │   └── SideNav.jsx      # Desktop navigation
│   │   │
│   │   ├── onboarding/
│   │   │   ├── PersonaCard.jsx
│   │   │   └── DietaryToggle.jsx
│   │   │
│   │   ├── ingredients/
│   │   │   ├── IngredientChip.jsx
│   │   │   ├── IngredientInput.jsx
│   │   │   ├── PantryGrid.jsx
│   │   │   └── ModeToggle.jsx   # Quick list / Saved pantry switch
│   │   │
│   │   ├── suggestions/
│   │   │   ├── SuggestionCard.jsx       # One meal card (rank + score + actions)
│   │   │   ├── ReasoningBreakdown.jsx   # Expanded score breakdown + narration
│   │   │   ├── ScoreBar.jsx             # Animated score progress bar
│   │   │   ├── SuggestionList.jsx       # Renders the ranked 2-3 cards
│   │   │   └── RerollButton.jsx
│   │   │
│   │   ├── confidence/
│   │   │   └── ConfidenceIndicator.jsx  # Segmented 10-step progress bar
│   │   │
│   │   └── auth/
│   │       ├── GoogleSignInButton.jsx
│   │       ├── AuthForm.jsx
│   │       └── GuestBanner.jsx          # "Sign in to sync everywhere" nudge
│   │
│   └── styles/
│       └── index.css            # Tailwind base + custom CSS variables
│
├── public/
│   └── favicon.svg
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # All CREATE TABLE + RLS policies
│
├── .env.example                 # Template showing required env var names (no values)
├── .env                         # Real values — gitignored
├── .gitignore
├── netlify.toml                 # Build command, publish dir, function directory
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

---

## Folder Responsibilities

### `/scripts/`
One-time data pipeline scripts that run locally during Day 53. They pull from TheMealDB, Nigerian food APIs, and USDA FoodData Central, then merge and validate the output. These are Node.js scripts run via `node scripts/merge_dataset.js` — not part of the app build.

### `/data/`
- `raw/` — Cached API responses. **Gitignored** (can be large and regenerated).
- `processed/mealmind_dataset.json` — The final curated dataset. **Committed to the repo** and ships with the app. Loaded at runtime by `src/lib/dataset.js`.

### `/netlify/functions/`
One file: `narrate.js`. This is the only server-side code. It receives score data, calls Groq (primary) or Gemini (fallback), and returns narration text. The LLM API keys live here as Netlify environment variables.

### `/src/engine/`
The scoring engine — pure JavaScript with zero React dependencies. Every function is independently testable. This is the ML heart of MealMind: ingredient matching, multi-criteria scoring, feedback-driven weight adjustment, persona cold-start, variety tracking. Built on Day 54.

### `/src/store/`
Zustand stores, one per domain. Each store manages its slice of state and exposes actions. The `usePersistence` hook syncs these stores to either Supabase (signed-in) or localStorage (guest) transparently.

### `/src/lib/`
Non-React utility functions and service clients:
- `supabase.js` — single Supabase client instance, imported everywhere
- `storage.js` — typed localStorage read/write so we never scatter raw `localStorage.getItem` calls
- `narrate.js` — the fetch wrapper for the Netlify narration function
- `dataset.js` — loads and queries `mealmind_dataset.json`

### `/src/hooks/`
Custom hooks that orchestrate multi-step logic across stores and libs. `useSuggestions` is the most important: it calls the engine, fires the narration request, and returns the ranked result set.

### `/src/pages/`
One file per route. Pages are thin — they compose components and call hooks. No scoring logic or API calls live in page files.

### `/src/components/`
Organized by feature domain, not by component type. Every component has one clear job.

### `/supabase/migrations/`
SQL migration files that define the exact schema and RLS policies. Run once during Day 53 setup via the Supabase CLI or dashboard SQL editor.

---

## Environment Variables

```
# .env.example

# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# LLM (server-side only — Netlify Function env vars, NOT prefixed with VITE_)
GROQ_API_KEY=
GEMINI_API_KEY=
```

> `VITE_` prefix makes variables available to the React frontend via `import.meta.env`.  
> Keys without `VITE_` prefix are only available server-side in Netlify Functions — never exposed to the browser.

---

## netlify.toml

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[dev]
  command = "npm run dev"
  port = 8888
  targetPort = 5173
  functions = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## Day 3 Setup Sequence

When Day 53 begins, these steps must happen in order:

1. Scaffold Vite + React project in the repo root (`npm create vite@latest . -- --template react`)
2. Install dependencies (`npm install tailwindcss framer-motion zustand @supabase/supabase-js react-router-dom`)
3. Configure Tailwind
4. Create Supabase project, run `supabase/migrations/001_initial_schema.sql`
5. Create Netlify site, link to GitHub repo, set environment variables
6. Run data pipeline scripts, validate output, commit `mealmind_dataset.json`
7. Confirm local dev server runs clean before ending Day 53