# GUESS HISTORY – Architecture & Code Guidelines

_Last updated: 2025-07-14_

---

## 1. Purpose
This document provides a **single source of truth** for developers working on the GUESS HISTORY codebase.  It explains the overall architecture, directory structure, and the conventions & best-practices that must be followed when contributing code.

> **Read this before you write a single line of code.**

---

## 2. Technology Stack
| Concern               | Choice                                  | Notes |
|-----------------------|------------------------------------------|-------|
| Front-end framework   | **React 18** + **TypeScript**           | Functional components only; no class components. |
| Build tool            | **Vite** with `@vitejs/plugin-react-swc`| Fast HMR and SWC transpilation. |
| Styling               | **Tailwind CSS**                        | Utility-first; no custom CSS frameworks. |
| Routing               | **react-router-dom v6**                 | File-based pages live in `src/pages/**`. |
| State management      | **React Context + Hooks**               | No Redux/MobX. |
| Back-end / BaaS       | **Supabase**                            | Auth, Postgres (SQL), Storage, Edge Functions. |
| Testing               | **Vitest + React Testing Library**      | Unit & component tests. |
| Lint / Format         | **ESLint** (typescript-eslint) & **Prettier** | Enforced on commit. |
| Deployment            | Netlify / Vercel                         | CI/CD via GitHub Actions. |

---

## 3. High-Level Architecture
```
┌───────────────────────────────────────────┐
│               Browser / DOM              │
└───────────────────────────────────────────┘
                ▲       ▲
                │ React │
                ▼       ▼
┌───────────────────────────────────────────┐
│     Presentation Layer (Components)       │
└───────────────────────────────────────────┘
                ▲
                │ Context / Hooks API
                ▼
┌───────────────────────────────────────────┐
│          Domain & Game Logic (src/)       │
│ - GameContext / AuthContext / UIContext   │
│ - utils/**, hooks/**                      │
└───────────────────────────────────────────┘
                ▲
                │ Supabase client SDK
                ▼
┌───────────────────────────────────────────┐
│      Data Source Layer  (Supabase)        │
│ - Postgres tables (profiles, user_metrics,│
│   game_rounds, …)                         │
│ - Auth (email, OAuth, anonymous)          │
└───────────────────────────────────────────┘
```

### Data Flow in a Nutshell
1. **Components** dispatch actions (e.g. submit guess) via context.
2. **Contexts/Hooks** perform business logic & call utility services.
3. **Utility services** communicate with Supabase (queries/mutations).
4. On success, **state** in context is updated → React re-renders UI.

---

## 4. Directory Structure (Top-Level)
```
GUESS-HISTORY/
├── .windsurf/               # Agent workflows (internal)
├── public/                  # Static assets served as-is
├── src/                     # Application source
│   ├── components/          # Reusable UI building blocks
│   ├── pages/               # Route pages → <Route path="..." element={<Page/>}/>
│   ├── layouts/             # Page layout wrappers
│   ├── contexts/            # React Context providers (Game, Auth …)
│   ├── hooks/               # Generic & domain-specific hooks
│   ├── utils/               # Pure functions & Supabase services
│   ├── styles/              # Tailwind directives and global styles
│   └── integrations/        # Third-party integration helpers
├── supabase/                # DB migrations & type generation
├── tests/ (optional)        # Additional test helpers
├── vite.config.ts           # Build configuration
└── ARCHITECTURE_AND_CODE_GUIDELINES.md    # ← You are here
```

### Component & File Naming
| Artifact                | Convention              | Example |
|-------------------------|-------------------------|---------|
| React component file    | `PascalCase.tsx`        | `UserAvatar.tsx` |
| Hook                    | `useCamelCase.ts`       | `useDebounce.ts` |
| Context file            | `SomethingContext.tsx`  | `GameContext.tsx` |
| Utility/service module  | `camelCase.ts`          | `profileService.ts` |

---

## 5. Coding Guidelines
### 5.1 TypeScript
1. **Strict mode ON** – no `any`; use generics & utility types.
2. Prefer **type aliases** for simple unions, **interfaces** for objects.
3. Export only what is needed; keep helpers `function`-scoped where possible.

### 5.2 React
- Use **functional components** with hooks (`useState`, `useEffect`, `useMemo`, …).
- Destructure props at the top of the function.
- Keep components **pure & presentation- focused**; move side-effects to hooks/services.
- Avoid prop-drilling → use Context or composition.

### 5.3 State Management
- **Global state** lives in Context providers (`contexts/**`).
- Local UI state stays inside the component.
- Always provide a `value` object with **state + actions** from context.

### 5.4 API & Supabase Usage
- Access Supabase via the singleton `supabase` client (import from `lib/supabaseClient`).
- **Do not** mix anonymous & registered user logic — rely solely on `user.id` as described in recent refactors.
- For inserts/updates prefer **`upsert`** for idempotency as done in `updateUserMetrics`.
- Always `select` minimal columns required.

### 5.5 Async & Error Handling
```ts
try {
  const { data, error } = await supabase.from('table')…;
  if (error) throw error;
  // handle data
} catch (err) {
  console.error(err);
  toast.error('Something went wrong');
}
```
- Never swallow errors silently.

### 5.6 Styling (Tailwind)
- Use utility classes; avoid custom CSS unless necessary.
- Group related classes logically: `"px-4 py-2 bg-primary text-white rounded"`.
- Extract **reusable variants** into Tailwind `@apply` directives in `styles/*.css`.

### 5.7 Lint & Format
- Run `npm run lint` and `npm run format` before pushing.
- No ESLint warnings are allowed in CI.

### 5.8 Testing
- Unit tests: place alongside file → `Component.test.tsx`.
- Use **React Testing Library** (no Enzyme) + **Vitest**.

### 5.9 Git & Commit Messages
Follow **Conventional Commits**:
```
feat(profile): allow users to upload avatar
fix(game): correct accuracy calculation rounding
```

---

## 6. Environment & Configuration
| File                 | Purpose |
|----------------------|---------|
| `.env.local`         | Local-only secrets (never commit). |
| `supabase/.env`      | Supabase service-level env vars. |
| `tailwind.config.ts` | Design tokens & themes. |
| `vite.config.ts`     | Proxy rules, aliases, plugins. |

---

## 7. Deployment & CI/CD
1. **Preview** → Every PR deploys to Vercel Preview.
2. **Production** → Merge into `main` triggers prod deploy.
3. Static build via `vite build` served from `dist/`.
4. Supabase migrations are applied via GitHub Action using `supabase db push`.

---

## 8. How to Get Started Locally
```bash
# 1. Install deps
npm ci

# 2. Copy env file
cp .env.example .env.local
# Fill in Supabase keys

# 3. Start dev server
npm run dev

# 4. Run tests
npm test
```

---

## 9. Architectural Decisions History (ADRs)
| Date | Decision | File/PR |
|------|----------|---------|
| 2025-07-10 | Switch all guest logic to Supabase anonymous users | memorised changes 3cea80f… |
| 2025-07-12 | Refactor `updateUserMetrics` to single `upsert`    | memorised changes 3a41c1e… |
| 2025-07-13 | Remove inaccurate columns from `game_rounds`      | memorised changes 13cee066… |
| 2025-07-14 | Add image feedback feature with upsert support | memorised changes 7a41c1e… |

---

## 10. Navbar Components

The application currently uses three distinct navbar components. Each serves a different part of the UX and lives in a dedicated file.

| Component | Path | Primary Usage | Notes |
|-----------|------|---------------|-------|
| `MainNavbar` | `src/components/navigation/MainNavbar.tsx` | In–game pages (e.g. Home, Friends, Leaderboard). Provides logo, global XP badge, and hamburger button that opens the slide-in menu handled by `NavMenu`. | Uses `useGame` for global XP. Avatar is fetched locally and shown on the right. | 
| `NavProfile` | `src/components/NavProfile.tsx` | Rendered in the top-right of `MainLayout` (and some other layouts) as a dropdown avatar/profile menu. Handles profile fetching, guest vs. registered logic, and sign-out. | Shows avatar image if available, otherwise initials; now shows avatar name for registered users and a prominent register button for guests. |
| `RedesignedNavbar` | `src/components/landing/RedesignedNavbar.tsx` | Marketing/landing pages only. Transparent by default; becomes blurred + opaque after scroll. Contains links to landing-page sections and sign-in/register buttons. | Lives entirely in the landing bundle; does not import game contexts. |

Responsibilities:
1. **MainNavbar** – game navigation & global stats; minimal profile info (just avatar).
2. **NavProfile** – all auth/profile UI: avatar dropdown, sign-out, and guest promotion.
3. **RedesignedNavbar** – marketing site navigation and call-to-actions.

All navbars are now styled with `bg-black/0 backdrop-blur-none` (fully transparent) unless explicitly scrolled or hovered as per component logic.

---

## 9. Image Feedback Feature

### Architecture
The image feedback system allows users to rate both the image accuracy and metadata accuracy for any image in the game. The feedback is stored in the `image_feedbacks` table in Supabase.

### Database Schema
The `image_feedbacks` table has the following key columns:
- `user_id` (UUID) - References the authenticated user
- `image_id` (UUID) - References the image being rated
- `image_accuracy` (integer) - Rating from 1-10
- `description_accurate` (boolean) - Whether the description is accurate
- `location_accurate` (boolean) - Whether the location metadata is accurate
- `date_accurate` (boolean) - Whether the date metadata is accurate
- `additional_comments` (text) - Optional comments from the user

### Key Features
1. **Idempotent Feedback**
   - Users can submit feedback multiple times for the same image
   - The system uses `upsert` to update existing feedback if it exists
   - A unique constraint on (`user_id`, `image_id`) ensures one feedback per user per image

2. **Authentication**
   - Feedback requires an authenticated user (anonymous or registered)
   - The user's ID is automatically included in the feedback submission

3. **UI Implementation**
   - Feedback is collected via the `ImageRatingModal` component
   - Supports rating on a 1-10 scale for image accuracy
   - Allows boolean ratings for metadata accuracy (description, location, date)
   - Optional text comments can be added

## 10. FAQ
**Q: Where do I add a new page?**  → Create a component under `src/pages/` and add a route in `App.tsx`.

**Q: How do I fetch the current user?**  → `const { data: { user } } = await supabase.auth.getUser();`

**Q: Can I add Redux?**  → No. Use Context + hooks.

---

## 11. Contact & Maintainers
For architectural questions reach out to the core team:
- `@maintainer1` – Front-end lead
- `@maintainer2` – Backend/Supabase

Feel free to create an issue following the templates in `.github/`.

---

_This document is living; update it with every significant architectural or guideline change._
