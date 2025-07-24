# Product Requirements Document — Hint System V2 (Final)

## 🧠 GOAL

Implement a complete Hint System V2 with:

* **14 distinct hints per image** (5 levels × hints per level).
* Enforced **dependency unlocking** (distance/time diff hints only available after base hint is purchased).
* XP and accuracy costs that **accumulate** and are deducted **at round scoring**.
* **All purchases stored in Supabase** (`round_hints`).
* Real-time profile stat updates via `user_metrics`.
* Responsive, accessible, and consistent UI.

## 🌍 CONTEXT

* Existing `useHintV2` hook and UI components (`HintButton`, `HintModal`) are partially implemented.
* The game currently uses legacy 2-hint logic and local state. This must be fully replaced.
* Images are stored in `public.images` with a computed column `has_full_hints = true` if all 14 fields are filled.

---

## 1️⃣ DATABASE STRUCTURE

### Table: `images`

Must include the following 14 non-nullable hint columns to be eligible for gameplay:

| Level | Category | Field                       | Column Name           |
| ----- | -------- | --------------------------- | --------------------- |
| 1     | Where    | Continent                   | `1_where_continent`   |
| 1     | When     | Century                     | `1_when_century`      |
| 2     | Where    | Distant Landmark            | `2_where_landmark`    |
| 2     | Where    | Distance to Landmark        | `2_where_landmark_km` |
| 2     | When     | Distant Event Name          | `2_when_event`        |
| 2     | When     | Time Difference             | `2_when_event_years`  |
| 3     | Where    | Region                      | `3_where_region`      |
| 3     | When     | Decade                      | `3_when_decade`       |
| 4     | Where    | Nearby Landmark             | `4_where_landmark`    |
| 4     | Where    | Distance to Nearby Landmark | `4_where_landmark_km` |
| 4     | When     | Contemporary Event          | `4_when_event`        |
| 4     | When     | Time Difference             | `4_when_event_years`  |
| 5     | Where    | Location Clues              | `5_where_clues`       |
| 5     | When     | Date/Period Clues           | `5_when_clues`        |

> ✅ Column `has_full_hints` must be TRUE. Images must also be `ready = TRUE` to be used in gameplay.

### Table: `hints`

| Column            | Type        | Notes                             |
| ----------------- | ----------- | --------------------------------- |
| id                | uuid (PK)   | default uuid\_generate\_v4()      |
| image\_id         | uuid (FK)   | references `images(id)`           |
| level             | integer     | 1–5                               |
| type              | text        | key used in UI (e.g. "continent") |
| text              | text        | hint content                      |
| distance\_km      | numeric     | for WHERE distance hints          |
| time\_diff\_years | integer     | for WHEN time difference hints    |
| cost\_xp          | int         | e.g. 30, 60, 200                  |
| cost\_accuracy    | int         | percentage cost                   |
| created\_at       | timestamptz | default now()                     |

> ✅ This table stores the complete hint catalog. Hints are matched to `images` via `image_id`.

### Table: `round_hints`

| Column         | Type                            | Notes                     |
| -------------- | ------------------------------- | ------------------------- |
| id             | uuid (PK)                       |                           |
| round\_id      | text                            | game round ID             |
| user\_id       | uuid (FK)                       | to auth.users             |
| hint\_id       | uuid (FK)                       | to hints.id               |
| purchased\_at  | timestamptz                     | default now()             |
| cost\_xp       | int                             | snapshot of XP cost       |
| cost\_accuracy | int                             | snapshot of accuracy cost |
| UNIQUE         | (round\_id, user\_id, hint\_id) | prevent duplicates        |

### Table: `user_metrics`

Use existing table `public.user_metrics`. Extend if needed to include:

* `hints_used_total int` (computed from purchases)
* `xp_spent_on_hints int`
* `accuracy_spent_on_hints int`

---

## 2️⃣ COST MATRIX & DEPENDENCIES

| Level | Hint Type          | XP Cost | Accuracy Cost | Hint Key          | Prerequisite Key  |
| ----- | ------------------ | ------- | ------------- | ----------------- | ----------------- |
| 1     | Continent          | 30      | 3             | continent         | —                 |
| 1     | Century            | 30      | 3             | century           | —                 |
| 2     | Distant Landmark   | 60      | 6             | distantLandmark   | —                 |
| 2     | Distance           | 30      | 3             | distantDistance   | distantLandmark   |
| 2     | Distant Event      | 60      | 6             | distantEvent      | —                 |
| 2     | Time Difference    | 30      | 3             | distantTimeDiff   | distantEvent      |
| 3     | Region             | 90      | 9             | region            | —                 |
| 3     | Decade             | 90      | 9             | narrowDecade      | —                 |
| 4     | Nearby Landmark    | 160     | 16            | nearbyLandmark    | —                 |
| 4     | Distance Nearby    | 80      | 8             | nearbyDistance    | nearbyLandmark    |
| 4     | Contemporary Event | 160     | 16            | contemporaryEvent | —                 |
| 4     | Time Diff Close    | 80      | 8             | closeTimeDiff     | contemporaryEvent |
| 5     | Location Clues     | 200     | 20            | whereClues        | —                 |
| 5     | When Clues         | 200     | 20            | whenClues         | —                 |

---

## 3️⃣ FRONTEND DESIGN (HintModal V2)

### Modal Layout

* **7 rows** grid: each with:

  * Column 1: **Level number** (1–5)
  * Column 2: WHEN hint
  * Column 3: WHERE hint

### Example Layout for Levels 1–2

| Level | WHEN (Left)                  | WHERE (Right)                   |
| ----- | ---------------------------- | ------------------------------- |
| 1     | Century (−30 XP / −3%)       | Continent (−30 XP / −3%)        |
| 2A    | Distant Event (−60 XP / −6%) | Distant Landmark (−60 XP / −6%) |
| 2B    | Time Diff (−30 XP / −3%) 🔒  | Distance (−30 XP / −3%) 🔒      |

> 🔒 = only unlockable after prerequisite is purchased

### UI Behavior

* Each button shows: title, XP cost, and accuracy cost.
* Locked hints show 🔒 and tooltip.
* On purchase: button turns orange and reveals the hint.
* Modal header shows summary XP/accuracy cost.
* Sticky “Continue Guessing” button at bottom.

---

## 4️⃣ HOOK — `useHintV2`

* Tracks hint availability, purchases, XP/accuracy debt.
* Syncs purchases to `round_hints`.
* Validates prerequisites.
* Exposes:

  * `canPurchase(hintKey)`
  * `buyHint(hintKey)`
  * `debt`, `purchased`, `available`

---

## 5️⃣ SCORING

```ts
const finalXp  = Math.max(0, baseXp - xpDebt);
const finalAcc = Math.max(0, baseAccuracy - accDebt);
```

* Penalties applied **once per round**, during final scoring.

---

## 6️⃣ ROUND RESULTS DISPLAY

```
WHEN  – 900 XP | 87 % accuracy
Hint Cost: −90 XP | −9 %

WHERE – 850 XP | 89 % accuracy
Hint Cost: −120 XP | −12 %

FINAL SCORE: 1 540 XP| 79 % accuracy 
```

* Breakdown shows **per‑category XP and accuracy** *before* hint deductions, followed by the hint cost line for each category.
* TOTAL and FINAL SCORE reflect all deductions applied once at round end.

---

## 7️⃣ ANALYTICS & TELEMETRY

Emit these events with context (image ID, round ID, user ID, hint key):

* `hint_view`
* `hint_purchase`
* `hint_debt_round`
* `hint_debt_game`

---

## 8️⃣ TASK FILE TRACKING

* Local task file path: `/tasks/TASK-GH-HINTS-V2-FINAL-005.progress.json`
* Must include:

  * `task`
  * `status` ("todo", "doing", "done", "error")
  * `notes`
  * `commitSha`
  * `timestamp`

---

## ✅ VERIFICATION CHECKLIST

*

---

## 🚀 Additional Implementation Notes

* **Analytics Metrics**: Track conversion rate from hint view to purchase, modal abandonment, and aggregate usage by hint type.
* **Error Handling**: All failures (network, Supabase, dependency, duplicate) must be caught, surfaced to the user, and logged for telemetry.
* **Performance**: State updates must be real-time and resilient to race conditions (use debounced/optimistic updates as needed, but always resolve with server state).
* **Security**: Enable RLS on `hints` and all core tables; grant only SELECT to app users and service role for writes.
* **Legacy Migration**: Remove all code/fields related to the 2-hint system; migrate any data as needed.
* **Dependency Testing**: Automated and manual test cases must cover all unlock paths, blocked/illegal purchases, and concurrency (e.g., double-click).

---
