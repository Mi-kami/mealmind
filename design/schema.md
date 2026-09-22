# MealMind — SCHEMA.md

> **Day 52 Design Document** | AB Talks 60-Day AI Challenge — Capstone  
> Covers Supabase Postgres tables (signed-in users) and localStorage schema (guests).

---

## 1. Supabase Postgres Tables

### 1a. `users`

Stores user profile and personalization settings. One row per user.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, default `auth.uid()` | Matches Supabase Auth user ID |
| `email` | `text` | NOT NULL, UNIQUE | User's email |
| `display_name` | `text` | NULLABLE | Display name (optional) |
| `persona` | `text` | NOT NULL | One of: `student`, `professional`, `family`, `other` |
| `dietary_filters` | `jsonb` | NOT NULL, default `[]` | Array of active filters: `vegetarian`, `halal`, `no_pork`, `vegan`, `gluten_free` |
| `cuisine_preference` | `text` | NOT NULL, default `both` | `nigerian`, `international`, `both` |
| `onboarded` | `boolean` | NOT NULL, default `false` | Has the user completed onboarding? |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Account creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Last profile update |

**RLS Policy:** Users can only SELECT/UPDATE their own row (`auth.uid() = id`).

---

### 1b. `scoring_weights`

Stores the user's current personalized weight vector. One row per user, updated in place on every feedback event.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK → `users.id`, NOT NULL, UNIQUE | One weight row per user |
| `variety_weight` | `float4` | NOT NULL, default by persona | Weight for variety/repeat-avoidance sub-score (0.0–1.0) |
| `nutrition_weight` | `float4` | NOT NULL, default by persona | Weight for nutritional balance sub-score (0.0–1.0) |
| `effort_weight` | `float4` | NOT NULL, default by persona | Weight for cook time/effort sub-score (0.0–1.0) |
| `ingredient_match_weight` | `float4` | NOT NULL, default by persona | Weight for ingredient availability sub-score (0.0–1.0) |
| `feedback_count` | `integer` | NOT NULL, default `0` | Total number of feedback events (drives confidence indicator) |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Last weight update |

**Persona defaults (weight vectors must sum to 1.0):**

| Persona | variety | nutrition | effort | ingredient_match |
|---|---|---|---|---|
| student | 0.20 | 0.20 | 0.25 | 0.35 |
| professional | 0.20 | 0.25 | 0.35 | 0.20 |
| family | 0.30 | 0.30 | 0.20 | 0.20 |
| other | 0.25 | 0.25 | 0.25 | 0.25 |

**RLS Policy:** Users can only SELECT/UPDATE their own row.

---

### 1c. `pantry`

Stores the user's saved pantry items. One row per ingredient per user.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK → `users.id`, NOT NULL | |
| `ingredient_name` | `text` | NOT NULL | Normalized ingredient name (lowercase, trimmed) |
| `category` | `text` | NULLABLE | e.g. `protein`, `carb`, `vegetable`, `spice`, `dairy` |
| `added_at` | `timestamptz` | NOT NULL, default `now()` | When the ingredient was added |

**Unique constraint:** `(user_id, ingredient_name)` — no duplicate ingredients per user.  
**RLS Policy:** Users can only SELECT/INSERT/DELETE their own rows.

---

### 1d. `meal_history`

Tracks which meals the user has accepted (eaten or planned to eat). Used for variety/repeat-avoidance scoring.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK → `users.id`, NOT NULL | |
| `dish_id` | `text` | NOT NULL | References `id` field in `mealmind_dataset.json` |
| `dish_name` | `text` | NOT NULL | Denormalized for display without joining the dataset |
| `meal_type` | `text` | NOT NULL | `breakfast`, `lunch`, `dinner`, `any` |
| `suggested_at` | `timestamptz` | NOT NULL, default `now()` | When the meal was accepted |

**RLS Policy:** Users can only SELECT/INSERT their own rows.  
**Index:** `(user_id, suggested_at DESC)` — scoring engine queries the last N days of history.

---

### 1e. `feedback_events`

Logs every accept/skip/reject event for analytics and future ML fine-tuning (post-v1.0).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK → `users.id`, NOT NULL | |
| `dish_id` | `text` | NOT NULL | |
| `dish_name` | `text` | NOT NULL | |
| `action` | `text` | NOT NULL | `accepted`, `skipped`, `rejected`, `rerolled` |
| `variety_score` | `float4` | NULLABLE | Sub-score at time of feedback |
| `nutrition_score` | `float4` | NULLABLE | Sub-score at time of feedback |
| `effort_score` | `float4` | NULLABLE | Sub-score at time of feedback |
| `ingredient_match_score` | `float4` | NULLABLE | Sub-score at time of feedback |
| `weights_at_event` | `jsonb` | NULLABLE | Snapshot of weight vector when feedback was given |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

**RLS Policy:** Users can only SELECT/INSERT their own rows.  
**Note:** This table is write-once. No updates or deletes. It becomes a training dataset for future model fine-tuning.

---

## 2. localStorage Schema (Guest Users)

All guest data lives under a single namespaced key: `mealmind_guest`. Structure:

```json
{
  "mealmind_guest": {
    "version": 1,
    "persona": "professional",
    "dietary_filters": ["halal"],
    "cuisine_preference": "both",
    "onboarded": true,
    "weights": {
      "variety": 0.20,
      "nutrition": 0.25,
      "effort": 0.35,
      "ingredient_match": 0.20
    },
    "feedback_count": 12,
    "pantry": [
      { "name": "rice", "category": "carb", "added_at": "2026-09-18T10:00:00Z" },
      { "name": "tomatoes", "category": "vegetable", "added_at": "2026-09-18T10:00:00Z" }
    ],
    "meal_history": [
      {
        "dish_id": "mdb_52772",
        "dish_name": "Teriyaki Chicken Casserole",
        "meal_type": "dinner",
        "suggested_at": "2026-09-17T19:00:00Z"
      }
    ],
    "session_shown": ["mdb_52772", "ng_001"]
  }
}
```

**Key notes:**
- `version` field allows future migrations if the schema changes
- `session_shown` is session-only (cleared on new suggestion request) — tracks what was shown this reroll chain
- `meal_history` is capped at last 30 entries (oldest pruned on write) to prevent unbounded localStorage growth
- On sign-up, guest data is migrated to Supabase and localStorage is cleared

---

## 3. Static Dataset Schema (`mealmind_dataset.json`)

Each entry in the dataset array follows this shape:

```json
{
  "id": "ng_001",
  "name": "Jollof Rice",
  "cuisine": "nigerian",
  "category": ["lunch", "dinner"],
  "ingredients": [
    "rice",
    "tomatoes",
    "onions",
    "red pepper",
    "tomato paste",
    "chicken",
    "vegetable oil",
    "seasoning cubes",
    "bay leaves"
  ],
  "effort_tier": 2,
  "prep_time_minutes": 60,
  "dietary_tags": {
    "vegetarian": false,
    "vegan": false,
    "halal": true,
    "contains_pork": false,
    "gluten_free": true
  },
  "nutrition": {
    "calories_per_serving": 420,
    "protein_g": 28,
    "carbs_g": 52,
    "fat_g": 11,
    "fiber_g": 3
  },
  "nutrition_tier": "balanced",
  "source": "nigerian_curated",
  "image_url": null
}
```

**Field notes:**
- `effort_tier`: 1 = very easy (≤15 min, ≤5 ingredients), 2 = moderate, 3 = involved (>60 min or complex technique)
- `nutrition_tier`: `light`, `balanced`, `protein_heavy`, `carb_heavy` — used as a fast filter alongside raw macros
- `source`: `mealdb`, `nigerian_curated`, `usda_enriched` — traces data provenance
- `id` prefix: `mdb_` for TheMealDB dishes, `ng_` for Nigerian-curated dishes

---

## 4. Schema Validation Against PRD User Stories

| PRD Feature | Schema Support |
|---|---|
| Persona-based onboarding | `users.persona` + `scoring_weights` defaults by persona |
| Dietary filters | `users.dietary_filters` (Supabase) + `dietary_filters` (localStorage) + `dataset.dietary_tags` |
| Saved pantry | `pantry` table (Supabase) + `pantry[]` (localStorage) |
| Quick ingredient list | Session-only Zustand state, not persisted |
| Variety/repeat avoidance | `meal_history` table + `session_shown` array |
| Feedback learning loop | `feedback_events` table + `scoring_weights.updated` on each event |
| Confidence indicator | `scoring_weights.feedback_count` |
| Cuisine preference | `users.cuisine_preference` + `dataset.cuisine` field |
| Single meal / full day | Session state in Zustand, not persisted |
| Reasoning breakdown | Sub-scores computed client-side, stored in `feedback_events` for analytics |
| Guest mode | localStorage schema mirrors Supabase structure |