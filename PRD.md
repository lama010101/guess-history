# GUESS HISTORY — Product Requirements Document (PRD)

> Version **1.0**   |   Status **Draft → Ready for Review**   |   Last updated **2025‑08‑02**

---

## 📚 Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Goals & Objectives](#2-goals--objectives)
3. [Success Metrics](#3-success-metrics)
4. [User Personas](#4-user-personas)
5. [User Stories](#5-user-stories)
6. [Scope](#6-scope)
7. [Functional Requirements](#7-functional-requirements)
8. [Non‑Functional Requirements](#8-non‑functional-requirements)
9. [UX / UI Requirements](#9-ux--ui-requirements)
10. [Game Flow Diagrams](#10-game-flow-diagrams)
11. [Data Model & Persistence](#11-data-model--persistence)
12. [Technical Architecture](#12-technical-architecture)
13. [Analytics & Telemetry](#13-analytics--telemetry)
14. [Accessibility & i18n](#14-accessibility--i18n)
15. [Milestones & Roadmap](#15-milestones--roadmap)
16. [Acceptance Criteria / Test Plan](#16-acceptance-criteria--test-plan)
17. [Risks & Mitigations](#17-risks--mitigations)
18. [Appendix A — Glossary](#appendix-a--glossary)

---

## 1 Executive Summary

*Guess History* is a multiplayer web game where players estimate **when** and **where** a historical photograph was taken.  Each round awards XP for accuracy and subtracts penalties for purchased hints.  The game supports synchronous and asynchronous modes, mobile‑first UI, and a Supabase‑backed data layer for cross‑device persistence.

---

## 2 Goals & Objectives

| ID   | Goal                                                                  | KPI                               |
| ---- | --------------------------------------------------------------------- | --------------------------------- |
|  G‑1 | Deliver an engaging history‑learning game with >80 Net Promoter Score | NPS ≥ 80 within 1 month of launch |
|  G‑2 | Achieve <2 s TTI on 3G mobile                                         | Lighthouse Performance ≥ 85       |
|  G‑3 | Retain >40 % D7 returning players                                     | Mixpanel D7 retention             |
|  G‑4 | Support 100 % session recovery after disconnect                       | Bug‑bash pass rate                |
|  G‑5 | Build a fully automated AI‑assisted content pipeline                  | Time‑to‑publish ≤ 10 min / image  |

---

## 3 Success Metrics

* **Average Round Duration** ≤ 90 s
* **Mean Guess Accuracy** ≥ 60 % after 5 games
* **Server Error Rate** < 0.1 %
* **Hint Purchase Rate** 10–20 % of rounds
* **Image Feedback Engagement** ≥ 5 % of images rated

---

## 4 User Personas

| Persona                   | Description                         | Key Motivations               |
| ------------------------- | ----------------------------------- | ----------------------------- |
| **Casual Learner**        | Likes trivia apps; plays on commute | Quick fun, learn history      |
| **Competitive Historian** | Enjoys leaderboards & precision     | High scores, badge collection |
| **Educator**              | Uses game in classroom              | Student engagement, analytics |
| **Explorer**              | Loves maps & geography              | Discover new places           |

---

## 5 User Stories (MoSCoW)

* **Must‑Have**

  * *As a player* I can guess a location on the map so that I can earn points for spatial accuracy.
  * *As a player* I can drag a year slider to submit a time guess.
  * *As a player* I can purchase hints that reveal partial information.
  * *As a guest* I can play without sign‑up but stats are not saved.
  * *As a registered user* my progress syncs across devices.
* **Should‑Have**

  * Multiplayer async rooms where friends can join via link.
  * XP‑based level system with badge rewards.
* **Could‑Have**

  * Multiplayer sync rooms.
  * Daily challenge with global leaderboard.
* **Won’t Have** (this release)

  * Native mobile apps.

---

## 6 Scope

### In Scope

* Single‑player & asynchronous multiplayer core loop (5 rounds / game).
* Image hint system v2 (12 hints, 4 levels × 3 types).
* Supabase persistence for rounds, hints, profiles, images.
* Image feedback modal.
* Responsive UI (≥ 320 px width).

### Out of Scope

* Real‑time chat within game rooms (future).
* DLC / premium monetisation.
* Teacher dashboards.

---

## 7 Functional Requirements

### FR‑1 Game Session

| ID     | Requirement                                                                                           | Priority |
| ------ | ----------------------------------------------------------------------------------------------------- | -------- |
| FR‑1.1 | The system must pre‑select **5** images per new game session, consistent for all players in the room. | M        |
| FR‑1.2 | The game must record each player’s guess (lat,lng,year) and compute distance & year delta.            | M        |
| FR‑1.3 | If a player disconnects, they can resume within 24 h and recover state.                               | S        |

### FR‑2 Hint System

| ID     | Requirement                                                        | Priority |
| ------ | ------------------------------------------------------------------ | -------- |
| FR‑2.1 | Display 12 hints per image, locked/unlocked based on dependencies. | M        |
| FR‑2.2 | Deduct XP/accuracy debts *after* round completion.                 | M        |
| FR‑2.3 | Persist purchased hints in `round_hints` with `upsert`.            | M        |

### FR‑3 Image Feedback

\| FR‑3.1 | Allow rating 1‑10 for visual accuracy. | C |
\| FR‑3.2 | Feedback modal accessible from results screen. | C |

### FR‑4 Multiplayer Rooms

\| FR‑4.1 | Host can share join URL. | S |
\| FR‑4.2 | Server hibernates after 60 s idle and reloads state on reconnect. | S |

### FR‑5 Leaderboards

\| FR‑5.1 | Global rank by total XP. | C |

---

## 8 Non‑Functional Requirements

* **Performance:** p95 API latency < 200 ms (Edge Functions).
* **Security:** RLS for all user data; JWT auth only.
* **Scalability:** 1 k concurrent players with WebSocket fan‑out ≤ 1 s.
* **Accessibility:** WCAG 2.1 AA.
* **Internationalisation:** EN default; string externalisation ready.

---

## 9 UX / UI Requirements

* Mobile‑first layouts using Tailwind responsive utilities.
* Landing page hero with 3 s auto‑rotating carousel (fade transition 300 ms).
* Map uses Leaflet with custom marker & placeholder skeleton while tiles load.
* Slider knob fully filled and accessible via keyboard arrows.
* Avatars: 50 M / 50 F historical figures selectable in profile.

Wireframe links: `Figma › Guess History v3`.

---

## 10 Game Flow Diagrams

```
┌─ Start Game ─┐
      │
      ▼
┌─ For each Round (×5) ─┐
│  Show Image           │
│  Player Guess         │
│  [Optional] Buy Hint  │
│  Submit               │
└──────────────┬────────┘
               ▼
        Store round_results
               │
               ▼
        Next Round / Final
```

Sequence diagrams available in `docs/diagrams/`.

---

## 11 Data Model & Persistence

* Authoritative DDL lives in `supabase/migrations/**`.
* Key tables: `images`, `prompts`, `round_hints`, `round_results`, `profiles`.
* Unique constraints prevent duplicate feedback & round entries.
* Triggers: `update_round_results_updated_at`, `mark_prompt_as_used`.

ER diagram: `docs/diagrams/er‑2025‑08‑02.png`.

---

## 12 Technical Architecture

See **Architecture & Code Guidelines** appendix for full stack, directory layout, coding standards, and ADR history. (Linked file: `ARCH_GUIDELINES.md`).

---

## 13 Analytics & Telemetry

* Front‑end events → PostHog.
* Core events: `round_start`, `round_end`, `hint_purchase`, `image_feedback`, `multiplayer_join`.
* Error logging: Sentry browser + Edge.

---

## 14 Accessibility & i18n

* All buttons have `aria‑label`.
* Colour contrast ratio ≥ 4.5:1.
* RTL layout readiness.

---

## 15 Milestones & Roadmap

| Phase | Deliverable                           | ETA        |
| ----- | ------------------------------------- | ---------- |
| 0     | PRD approval                          | 2025‑08‑05 |
| 1     | Core single‑player loop + persistence | 2025‑09‑01 |
| 2     | Hint System v2                        | 2025‑09‑15 |
| 3     | Async multiplayer                     | 2025‑10‑01 |
| 4     | Leaderboards & Feedback               | 2025‑10‑15 |
| 5     | Public Beta                           | 2025‑11‑01 |

---

## 16 Acceptance Criteria / Test Plan

### Gameplay

* Submit guess → DB row in `round_results` within 300 ms.
* Re‑loading page restores current round.
* Buying “Century” hint reduces XP by exact cost shown.

### Performance

* Lighthouse mobile perf ≥ 85.

### Security

* Attempting to `select * from round_results` of another `user_id` returns RLS error.

Complete test cases live in `tests/e2e/`.

---

## 17 Risks & Mitigations

| Risk                               | Impact | Likelihood | Mitigation                                           |
| ---------------------------------- | ------ | ---------- | ---------------------------------------------------- |
| Supabase Edge function cold‑starts | High   | Medium     | Keep‑warm pinger, adjust timeout                     |
| Image rights infringement          | Med    | Low        | Use only public‑domain or AI‑generated marked images |
| Multiplayer state desync           | High   | Medium     | Snapshot & diff testing under load                   |

---

## Appendix A — Glossary

* **XP** — Experience Points.
* **Hint Debt** — Accumulated XP / Accuracy penalties from purchased hints.
* **RLS** — Row‑Level Security.
* **TTI** — Time To Interactive.

---

*This PRD supersedes previous architecture‑only docs.  All new development must satisfy the requirements herein.*
