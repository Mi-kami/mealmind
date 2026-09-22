# MealMind — ARCHITECTURE.md

> **Day 52 Design Document** | AB Talks 60-Day AI Challenge — Capstone  
> Source of truth for system architecture. Do not modify without updating this document.

---

## 1. System Overview

MealMind is an adaptive, explainable meal-recommendation engine. Its core is a **client-side multi-criteria scoring engine** that ranks meals against the user's current ingredients, preferences, and behavioral history. A **serverless function** handles LLM narration calls with the API key held server-side. **Supabase** provides auth and cloud persistence for signed-in users; **localStorage** provides single-device persistence for guests.

The LLM's role is strictly narration — it receives pre-computed score data and explains it in plain language. It never computes scores, invents dish facts, or generates nutrition values.

---

## 2. Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (React + Vite)                        │
│                                                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐   │
│  │  UI Layer    │   │  Zustand     │   │  Scoring Engine      │   │
│  │  (React      │◄──│  Store       │◄──│  (Pure JS)           │   │
│  │  Components) │   │              │   │                      │   │
│  │              │   │  - userSlice │   │  - matching.js       │   │
│  │  Onboarding  │   │  - pantrySlice│  │  - scoring.js        │   │
│  │  Ingredients │   │  - sessionSlice│  │  - personas.js      │   │
│  │  Suggestions │   │  - weightsSlice│  │  - feedback.js      │   │
│  │  Reasoning   │   │              │   │  - filters.js        │   │
│  │  Feedback    │   └──────┬───────┘   │  - variety.js        │   │
│  │  Profile     │          │           └──────────────────────┘   │
│  └──────────────┘          │                                       │
│                            │                                       │
│  ┌─────────────────────────▼──────────────────────────────────┐   │
│  │                    Persistence Layer                        │   │
│  │                                                            │   │
│  │   Guest: localStorage        Signed-in: Supabase SDK       │   │
│  │   (single-device)            (cloud, cross-device)         │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS
              ┌──────────────▼──────────────┐
              │     Netlify Functions        │
              │                             │
              │  /api/narrate               │
              │  - Receives score data      │
              │  - Calls Groq (primary)     │
              │  - Falls back to Gemini     │
              │  - Returns narration text   │
              │  - API keys never exposed   │
              └──────────────┬──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │      External Services      │
              │                             │
              │  Groq API (LLM primary)     │
              │  Gemini 2.5 Flash (fallback)│
              │  Supabase (Auth + DB)       │
              └─────────────────────────────┘
```

---

## 3. Data Flow

### 3a. Guest User — Meal Suggestion Request

```
User enters ingredients
        │
        ▼
Zustand pantrySlice (temporary session state)
        │
        ▼
filters.js — remove dishes violating dietary filters
        │
        ▼
variety.js — remove/penalize recently suggested dishes
        │
        ▼
matching.js — compute ingredient match % per candidate dish
        │
        ▼
scoring.js — compute weighted multi-criteria score
             (variety + nutrition + effort + ingredient match)
             using current weight vector from weightsSlice
        │
        ▼
Top 2-3 ranked dishes selected
        │
        ▼
POST /api/narrate (score breakdown → Netlify Function)
        │
        ▼
Groq API generates plain-language explanation
        │
        ▼
UI renders suggestion cards + reasoning breakdown
        │
        ▼
User accepts/skips → feedback.js adjusts weight vector
        │
        ▼
Updated weights saved to localStorage
```

### 3b. Signed-in User — Same flow, but:
- Weights, pantry, feedback history, dietary filters read from Supabase on session start
- Every weight/pantry/feedback update written to Supabase in real time
- User profile (persona, dietary prefs) persisted in Supabase `users` table

---

## 4. Request Lifecycle — LLM Narration Call

```
Client                    Netlify Function              Groq API
  │                             │                          │
  │── POST /api/narrate ────────►│                          │
  │   { dishName,               │                          │
  │     scores: {               │                          │
  │       variety: 0.82,        │                          │
  │       nutrition: 0.74,      │── POST /chat/completions ►│
  │       effort: 0.91,         │   (prompt includes ONLY  │
  │       ingredientMatch: 0.88 │    the provided scores + │
  │     },                      │    dish name)            │
  │     persona,                │                          │
  │     mealType }              │◄── narration text ────────│
  │                             │                          │
  │◄── { narration: "..." } ────│                          │
  │                             │                          │
  │  [if Groq fails]            │── POST Gemini fallback ──►│
  │                             │◄── narration text ────────│
  │◄── { narration: "..." } ────│                          │
```

**Prompt constraint:** The Netlify Function prompt explicitly instructs the model: "You are given pre-computed score values for a meal suggestion. Explain in 2-3 friendly sentences why this meal was recommended. Use ONLY the scores provided. Do not state nutrition facts, calorie counts, or ingredient details you were not given."

---

## 5. AI Interaction Design

| Concern | Approach |
|---|---|
| Hallucination prevention | LLM receives only dish name + pre-computed scores. No open-ended generation. |
| API key security | Keys stored as Netlify environment variables. Never in frontend code or the repo. |
| Latency | Scoring is instant (client-side JS). Only narration involves a network call. Suggestion cards render immediately; narration streams in. |
| Fallback | Groq failure → Gemini. Both fail → generic template string shown, no crash. |
| Cost control | Narration prompt is capped at ~150 tokens output. One call per suggestion batch, not per card. |

---

## 6. External Services

| Service | Purpose | Free Tier Limit |
|---|---|---|
| Supabase | Auth + Postgres DB | 500MB DB, 50k MAU, unlimited API calls |
| Groq | LLM narration (primary) | Generous free tier, fast inference |
| Gemini 2.5 Flash | LLM narration (fallback) | Free tier via Google AI Studio |
| TheMealDB | Dataset source (build time only) | Free, no auth required |
| USDA FoodData Central | Nutrition data (build time only) | Free API key |
| Netlify | Hosting + Functions | 100GB bandwidth, 125k function calls/month |

---

## 7. Security Considerations

- API keys (Groq, Gemini) stored only as Netlify environment variables
- Supabase Row Level Security (RLS) enabled — users can only read/write their own rows
- No sensitive data stored client-side beyond localStorage weights/pantry (no auth tokens in localStorage — Supabase SDK handles token storage in httpOnly cookies)
- `.env` in `.gitignore` — never committed to the repo
- Input validation on the Netlify Function before any LLM call

---

## 8. Scalability Notes (Post-v1.0)

The architecture is designed to scale without a rewrite:
- Scoring engine is stateless and can move server-side if needed
- Supabase scales horizontally on paid tiers
- Netlify Functions can be migrated to dedicated Node.js backend (e.g. Railway, Render) without frontend changes
- Dataset JSON can be replaced with a Supabase table + API if real-time dish additions are needed