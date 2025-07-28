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

## 4. Application Pages

### Core Game Flow
| Page | Route | Purpose | Key Features |
|------|-------|---------|--------------|
| **Landing Page** | `/` | Entry point for new users | - Rotating image carousel<br>- Call-to-action buttons<br>- Navigation to auth/signup |
| **Home Page** | `/home` | Main dashboard | - Game mode selection<br>- User stats<br>- Recent activity |
| **Game Round** | `/game/round/:roundNumber` | Core gameplay | - Historical image display<br>- Interactive map<br>- Year selection<br>- Hint system |
| **Round Results** | `/round-results` | Post-round summary | - Accuracy metrics<br>- Score breakdown<br>- XP earned |
| **Final Results** | `/final-results` | End-game summary | - Total score<br>- Level progression<br>- Badges/unlocks |

### Page vs Layout Components

- **Page Components** (`/src/pages/`): Handle routing, data fetching, and business logic. They determine what data to pass to layout components.
- **Layout Components** (`/src/components/layouts/`): Focus purely on presentation and UI structure. They receive data and callbacks from page components.

For example:
- `/round-results` (page) fetches round data and user scores
- `ResultsLayout2` (layout) receives this data and handles the visual presentation

### Layout Components (`src/components/layouts/`)

These reusable layout components provide consistent UI structures across different pages:

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **`ResultsLayout2.tsx`** | Displays round results with scores, map, and hint penalties | - Shows accuracy and XP breakdown<br>- Interactive map with guess vs. actual location<br>- Hint penalty tracking and display<br>- Mobile/desktop responsive design |
| **`GameLayout1.tsx`** | Primary game interface layout | - Contains game canvas/board<br>- Player HUD and controls<br>- Responsive design for different screen sizes |
| **`GameLayout2.tsx`** | Alternative game interface | - Variant layout for different game modes<br>- Specialized UI components<br>- Optimized for specific game mechanics |
| **`HomeLayout1.tsx`** | Main dashboard layout | - User stats and progress<br>- Game mode selection<br>- Recent activity feed |
| **`ProfileLayout1.tsx`** | User profile interface | - Avatar and bio display<br>- Statistics and achievements<br>- Game history and progress |
| **`FullscreenZoomableImage.tsx`** | Image viewer component | - Fullscreen image display<br>- Zoom and pan functionality<br>- Gesture support for mobile |

### Key Component Responsibilities

This section details the primary files responsible for major features.

#### Round Results Display

-   **`src/pages/RoundResultsPage.tsx`**: The main page component for the round results screen. It is responsible for fetching all necessary data for the round (results from context, hint debts, badges) and handling navigation to the next round or the final results page.
-   **`src/components/layouts/ResultsLayout2.tsx`**: The primary layout component that constructs the entire UI for the results screen. It displays the score cards, the map with the guess and actual locations, earned badges, and hint penalty details.
-   **`src/components/results/ResultsHeader.tsx`**: The header component displayed at the top of the results screen, which shows the current round progress and contains the top "Next Round" button.

#### User Profile and Settings

-   **`src/pages/ProfilePage.tsx`**: Main page for displaying user profiles. It uses one of the layouts below.
-   **`src/components/layouts/ProfileLayout1.tsx`**: A layout for user profiles, including tabs for settings, avatars, and stats.
-   **`src/components/profile/SettingsTab.tsx`**: Component for handling user settings like username and email.
-   **`src/components/profile/AvatarsTab.tsx`**: Component for selecting a user avatar.
-   **`src/utils/profile/profileService.ts`**: Contains functions for fetching and updating user profiles and metrics (`fetchUserProfile`, `updateUserMetrics`).

#### Hint System (Purchase & Debts)

The hint system allows players to purchase clues during a game round at the cost of XP and accuracy penalties. The system is designed to ensure that hint state is managed centrally and that debts are persisted correctly to the database.

-   **`src/hooks/useHintV2.ts`**: This is the central hook that manages the entire hint lifecycle. It is responsible for:
    -   Fetching available hints for the current image from the `hints` table.
    -   Tracking which hints the user has purchased during the round.
    -   Calculating the total `xpDebt` and `accDebt` based on purchased hints.
    -   Handling the `purchaseHint` logic, which saves the purchased hint to the `round_hints` table in Supabase.
    -   Providing a real-time subscription to update hint status.

-   **`src/pages/GameRoundPage.tsx`**: The page component for the main game screen. It initializes the `useHintV2` hook, establishing the single source of truth for all hint-related data for the duration of a round. It then passes the necessary state and functions (e.g., `availableHints`, `purchasedHints`, `purchaseHint`) as props to the `GameLayout1` component.

-   **`src/components/HintModalV2New.tsx`**: The UI modal that displays all available hints, grouped by level and category. It receives hint data and the `onPurchaseHint` function via props. When a user clicks to buy a hint, it calls this function to trigger the purchase flow managed by `useHintV2.ts`.

-   **`src/pages/RoundResultsPage.tsx`**: After a round is complete, this page is responsible for fetching the hint debts from the `round_hints` table and displaying them as penalties on the results screen via the `ResultsLayout2` component.

-   **`src/constants/hints.ts`**: Contains all constant definitions for the hint system, including `HINT_COSTS` (XP and accuracy penalties), `HINT_DEPENDENCIES` (prerequisites for unlocking certain hints), and `HINT_TYPE_NAMES` for display purposes.

### User Account
| Page | Route | Purpose | Key Features |
|------|-------|---------|--------------|
| **Auth** | `/auth` | Authentication | - Login/signup forms<br>- Password reset<br>- Social login |
| **Profile** | `/profile` | User profile | - Personal stats<br>- Avatar/bio<br>- Game history |
| **User Profile** | `/user/:userId` | Public profiles | - Other users' stats<br>- Compare scores |
| **Settings** | `/settings` | App preferences | - Theme selection<br>- Notification settings |

### Social & Multiplayer
| Page | Route | Purpose | Key Features |
|------|-------|---------|--------------|
| **Friends** | `/friends` | Social connections | - Friend list<br>- Friend requests<br>- Challenges |
| **Game Room** | `/room/:roomId` | Multiplayer lobby | - Player management<br>- Game settings<br>- Chat |

### Additional Pages
| Page | Route | Purpose | Key Features |
|------|-------|---------|--------------|
| **Leaderboard** | `/leaderboard` | Global rankings | - Top players<br>- Filter by time period |
| **404** | `*` | Error handling | - Helpful navigation<br>- Search |

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

IMAGES TABLE SCHEMA
CREATE  TABLE public.images (
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NULL,
  description text NULL,
  prompt text NOT NULL,
  negative_prompt text NULL,
  date text NULL,
  year integer NULL,
  country text NULL,
  location text NULL,
  gps_coordinates text NULL,
  latitude numeric NULL,
  longitude numeric NULL,
  1_where_continent text NULL,
  1_when_century text NULL,
  2_where_landmark text NULL,
  2_where_landmark_km numeric NULL,
  2_when_event text NULL,
  2_when_event_years text NULL,
  3_where_region text NULL,
  3_when_decade text NULL,
  4_where_landmark text NULL,
  4_where_landmark_km numeric NULL,
  4_when_event text NULL,
  4_when_event_years numeric NULL,
  5_when_clues text NULL,
  5_where_clues text NULL,
  ai_generated boolean NULL DEFAULT true,
  real_event boolean NULL DEFAULT true,
  key_elements text NULL,
  theme text NULL,
  celebrity boolean NULL DEFAULT false,
  approx_people_count integer NULL,
  confidence integer NULL,
  last_verified timestamp with time zone NULL,
  has_full_hints boolean GENERATED ALWAYS AS ((("1_where_continent" IS NOT NULL) AND ("1_when_century" IS NOT NULL) AND ("2_where_landmark" IS NOT NULL) AND ("2_where_landmark_km" IS NOT NULL) AND ("2_when_event" IS NOT NULL) AND ("2_when_event_years" IS NOT NULL) AND ("3_where_region" IS NOT NULL) AND ("3_when_decade" IS NOT NULL) AND ("4_where_landmark" IS NOT NULL) AND ("4_where_landmark_km" IS NOT NULL) AND ("4_when_event" IS NOT NULL) AND ("4_when_event_years" IS NOT NULL) AND ("5_when_clues" IS NOT NULL) AND ("5_where_clues" IS NOT NULL))) STORED  NULL,
  source_citation text NULL,
  image_url text NULL,
  optimized_image_url text NULL,
  thumbnail_image_url text NULL,
  mobile_image_url text NULL,
  desktop_image_url text NULL,
  positive_prompt text NULL,
  model text NULL,
  width integer NULL,
  height integer NULL,
  seed integer NULL,
  cfg_scale numeric NULL DEFAULT 30,
  steps integer NULL,
  scheduler text NULL,
  aspect_ratio text NULL,
  output_format text NULL,
  cost numeric NULL DEFAULT 0,
  ready boolean NULL DEFAULT false,
  mature_content boolean NULL DEFAULT false,
  accuracy_score jsonb NULL,
  mobile_size_kb integer NULL DEFAULT 0,
  desktop_size_kb integer NULL DEFAULT 0,
  original_size_kb integer NULL DEFAULT 0,
  content_hash text NULL,
  exact_date text NULL,
  prompt_id uuid NULL,
  location_name text NULL DEFAULT 'Unknown Location'::text,
  firebase_url text NULL,
  firebase_size_kb integer NULL,
  firebase_desktop text NULL,
  firebase_mobile text NULL,
  firebase_desktop_kb numeric NULL,
  firebase_mobile_kb numeric NULL,
  CONSTRAINT images_pkey PRIMARY KEY (id),
  CONSTRAINT images_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE SET NULL,
  CONSTRAINT images_confidence_check CHECK (((confidence >= 0) AND (confidence <= 100)))
) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS images_user_id_idx ON public.images USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS images_created_at_idx ON public.images USING btree (created_at DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS images_confidence_idx ON public.images USING btree (confidence) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS images_last_verified_idx ON public.images USING btree (last_verified) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS images_id_full_hints_idx ON public.images USING btree (id)  TABLESPACE pg_default WHERE (has_full_hints = true);
CREATE INDEX IF NOT EXISTS images_ready_idx ON public.images USING btree (ready) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS images_model_idx ON public.images USING btree (model) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS images_content_hash_idx ON public.images USING btree (content_hash) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_images_created_at ON public.images USING btree (created_at DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_images_ready ON public.images USING btree (ready) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_images_model ON public.images USING btree (model) TABLESPACE pg_default;
CREATE TRIGGER trg_images_location_name BEFORE INSERT ON images FOR EACH ROW EXECUTE FUNCTION images_set_location_name();
CREATE TRIGGER update_prompt_used AFTER INSERT ON images FOR EACH ROW EXECUTE FUNCTION mark_prompt_as_used();

PROMPTS TABLE SCHEMA
CREATE  TABLE public.prompts (
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NULL,
  description text NULL,
  prompt text NOT NULL,
  negative_prompt text NULL,
  date text NULL,
  year integer NULL,
  country text NULL,
  location text NULL,
  gps_coordinates text NULL,
  latitude numeric GENERATED ALWAYS AS ((NULLIF(split_part(gps_coordinates, ','::text, 1), ''::text))::numeric) STORED  NULL,
  longitude numeric GENERATED ALWAYS AS ((NULLIF(split_part(gps_coordinates, ','::text, 2), ''::text))::numeric) STORED  NULL,
  1_where_continent text NULL,
  1_when_century text NULL,
  2_where_landmark text NULL,
  2_where_landmark_km numeric NULL,
  2_when_event text NULL,
  2_when_event_years text NULL,
  3_where_region text NULL,
  3_when_decade text NULL,
  4_where_landmark text NULL,
  4_where_landmark_km numeric NULL,
  4_when_event text NULL,
  4_when_event_years numeric NULL,
  5_when_clues text NULL,
  5_where_clues text NULL,
  ai_generated boolean NULL DEFAULT true,
  real_event boolean NULL DEFAULT true,
  key_elements text NULL,
  theme text NULL,
  celebrity boolean NULL DEFAULT false,
  approx_people_count integer NULL,
  confidence integer NULL,
  last_verified timestamp with time zone NULL,
  has_full_hints boolean GENERATED ALWAYS AS ((("1_where_continent" IS NOT NULL) AND ("1_when_century" IS NOT NULL) AND ("2_where_landmark" IS NOT NULL) AND ("2_where_landmark_km" IS NOT NULL) AND ("2_when_event" IS NOT NULL) AND ("2_when_event_years" IS NOT NULL) AND ("3_where_region" IS NOT NULL) AND ("3_when_decade" IS NOT NULL) AND ("4_where_landmark" IS NOT NULL) AND ("4_where_landmark_km" IS NOT NULL) AND ("4_when_event" IS NOT NULL) AND ("4_when_event_years" IS NOT NULL) AND ("5_when_clues" IS NOT NULL) AND ("5_where_clues" IS NOT NULL))) STORED  NULL,
  source_citation text NULL,
  location_name text NULL,
  used boolean NULL,
  CONSTRAINT prompts_pkey PRIMARY KEY (id),
  CONSTRAINT prompts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT prompts_confidence_check CHECK (((confidence >= 0) AND (confidence <= 100)))
) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS prompts_created_at_desc_idx ON public.prompts USING btree (created_at DESC) TABLESPACE pg_default;

## Scoring, Hint System, and Game State Persistence (as of 2025-07-28)

### Database Persistence System (Implemented 2025-07-28)

#### New `round_results` Table
- **Purpose**: Stores detailed per-round game results for reliable persistence across sessions and devices
- **Migration**: `20250728_create_round_results.sql` creates table with comprehensive schema
- **Schema**:
  - `user_id` (UUID): Supabase auth user ID
  - `game_id` (UUID): Unique game identifier  
  - `round_index` (INTEGER): Round number (0-based)
  - `image_id` (UUID): Reference to the image played
  - `score` (INTEGER): Total score for this round
  - `accuracy` (NUMERIC): Accuracy percentage
  - `xp_where` (INTEGER): XP earned for location accuracy
  - `xp_when` (INTEGER): XP earned for time accuracy
  - `hints_used` (INTEGER): Number of hints used in this round
  - `distance_km` (NUMERIC): Distance from actual location in km
  - `guess_year` (INTEGER): User's year guess
  - `guess_lat`, `guess_lng` (NUMERIC): User's location guess coordinates
  - `actual_lat`, `actual_lng` (NUMERIC): Actual image coordinates
  - `created_at`, `updated_at` (TIMESTAMP): Record timestamps

#### Data Flow
1. **Write Path**: `recordRoundResult` in GameContext.tsx now upserts round results to DB using Supabase client
2. **Read Path**: `loadGameState` now fetches round results from DB instead of localStorage
3. **Conflict Resolution**: Uses `ON CONFLICT (user_id,game_id,round_index)` for upsert behavior
4. **RLS Policies**: Secure user data isolation with policies for SELECT/INSERT/UPDATE/DELETE

#### Migration Files
- `20250728_create_round_results.sql`: Creates table and indexes
- `20250728_create_round_results_policies.sql`: RLS policies for security

#### Removed Components
- **localStorage fallback**: All round result persistence now uses DB only
- **Cross-device support**: Results persist across devices using Supabase auth
- **Resume capability**: Games can be resumed by fetching from DB the Round Results page and persist across refresh/devices.

---

## Hint Debts (Penalties) End-to-End Flow

### Overview
Hint debts (XP and accuracy penalties from hint usage) are fetched from the database, mapped to the UI, and rendered under the score breakdown on the Round Results page. If debts do not show, the cause is almost always a data mapping, prop passing, or data shape mismatch.

### 1. **DB Fetch**
- On Round Results page load, a query is made to the `round_hints` table:
  - Filters: `user_id`, `round_id` (image id)
  - Columns fetched: `hint_id`, `xpDebt`, `accDebt`, `label`, `hint_type`
- Results are mapped to objects:
  - `{ hintId, xpDebt, accDebt, label, hint_type }[]`

### 2. **Mapping to Layout**
- The debts array is passed to a mapping function (`mapToLayoutResultType` in `RoundResultsPage.tsx`)
- This function constructs the result object for the layout, including:
  - `hintDebts: debts` (passed as a prop)

### 3. **UI Rendering**
- `ResultsLayout2` receives the debts array as `result.hintDebts`
- Debts are passed to `<HintDebtsCard hintDebts={result.hintDebts} />`
- The debts card renders each debt with:
  - The label (from `label` or fallback)
  - XP penalty (red, if `xpDebt > 0`)
  - Accuracy penalty (red, if `accDebt > 0`)

### 4. **Troubleshooting (If Debts Are Not Showing)**
- **Check DB**: Are debts actually present for this round/user in `round_hints`?
- **Check Fetch**: Is the query returning the correct rows and columns?
- **Check Mapping**: Is the debts array correctly mapped and passed to the layout?
- **Check Prop Passing**: Is `hintDebts` present on the result object and non-empty?
- **Check UI**: Is `<HintDebtsCard />` rendered (not short-circuited by a missing/empty array)?

---

The game's scoring system is designed to reward players for accuracy in both time and location guesses, while penalizing them for using hints. The final score for each round is a combination of these factors.

### 1. Base Score Calculation

At the end of each round, a base score is calculated based on the player's guess.

-   **Location Score (`locationAccuracy`, `xpWhere`)**: Calculated based on the distance between the player's guess and the actual location. A closer guess results in a higher accuracy percentage and more XP. The maximum XP for a perfect guess is defined by `XP_WHERE_MAX` (currently 100).
-   **Time Score (`timeAccuracy`, `xpWhen`)**: Calculated based on the difference between the player's guessed year and the actual year. A smaller difference results in a higher accuracy percentage and more XP. The maximum XP for a perfect guess is defined by `XP_WHEN_MAX` (currently 100).

These calculations are primarily handled in `src/utils/gameCalculations.ts`.

---

### Upcoming: `round_results` Table
**Purpose:** Store all per-round results, scores, and hint debts for reliable DB-backed persistence and cross-device consistency.

**Schema (proposed/partially implemented):**
- `id` (uuid, PK)
- `user_id` (uuid, FK to auth.users)
- `game_id` (uuid)
- `round_index` (int)
- `image_id` (uuid)
- `score` (int)
- `accuracy` (float)
- `xp_where` (int)
- `xp_when` (int)
- `hints_used` (int)
- `debts` (jsonb or denormalized fields for xpDebt/accDebt/labels)
- `created_at`, `updated_at` (timestamp)

**Implementation:**
- Write logic: Extend `recordRoundResult` in `GameContext.tsx` to upsert round results into `round_results`.
- Read logic: On game/round load, fetch round results from DB to hydrate context/UI.
- Remove all localStorage fallback for scores/results.
- Add/update RLS policies for `round_results`.
- Test persistence across refresh/devices.

**Current blocker:** Migration not yet applied (psql not available on system). Table must be created for full persistence to work.

### 2. Hint System and Penalties

Players can purchase hints to help them guess. Each hint has a predefined cost in both XP and Accuracy percentage.

-   **Hint Data**: Hint definitions, including their costs (`xp_cost`, `accuracy_penalty`), are managed in `src/constants/hints.ts`.
-   **Purchasing Hints**: When a player purchases a hint, the `purchaseHint` function in `useHintV2.ts` records the transaction in the `round_hints` table. This record includes the `user_id`, `image_id`, the `hint_id`, the `xp_cost` and `accuracy_penalty`, and importantly, the `hint_type` ('when' or 'where') and a friendly `label` for the hint.

### 3. Net Round Score Calculation

The final score for a round is calculated by deducting the total cost of all purchased hints from the base scores.

-   **Fetching Debts**: On the `RoundResultsPage.tsx`, the `fetchDebts` function queries the `round_hints` table to get all hints purchased by the user for that specific round.
-   **Aggregating Penalties**: In `ResultsLayout2.tsx`, the total `xpDebt` and `accDebt` are summed up separately for 'when' and 'where' hint types.
-   **Calculating Net Scores**: The total debts are subtracted from the base scores to get the final net scores for the round:
    -   `netXpWhen = xpWhen - totalXpDebtForWhenHints`
    -   `netXpWhere = xpWhere - totalXpDebtForWhereHints`
    -   `netTimeAccuracy = timeAccuracy - totalAccDebtForWhenHints`
    -   `netLocationAccuracy = locationAccuracy - totalAccDebtForWhereHints`

These net scores are what the player sees on the results screen.

### 4. Final Game Score

The final game score, displayed on the `FinalResultsPage.tsx`, is the sum of the net `xpTotal` from all rounds played in the game session. The `updateUserMetrics` function in `src/utils/profile/profileService.ts` is responsible for updating the player's global statistics with the results of the completed game.

CREATE INDEX IF NOT EXISTS prompts_user_id_idx ON public.prompts USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS prompts_created_at_idx ON public.prompts USING btree (created_at DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS prompts_confidence_idx ON public.prompts USING btree (confidence) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS prompts_last_verified_idx ON public.prompts USING btree (last_verified) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS prompts_id_full_hints_idx ON public.prompts USING btree (id)  TABLESPACE pg_default WHERE (has_full_hints = true);
CREATE TRIGGER trg_copy_location_name BEFORE INSERT OR UPDATE ON prompts FOR EACH ROW EXECUTE FUNCTION copy_location_to_location_name();

Existing tables

create table public.round_hints (
  id uuid not null default extensions.uuid_generate_v4 (),
  hint_id uuid not null,
  user_id uuid not null,
  round_id text not null,
  purchased_at timestamp with time zone not null default now(),
  "xpDebt" numeric null,
  "accDebt" numeric null,
  label text null,
  hint_type text null,
  constraint round_hints_pkey primary key (id),
  constraint round_hints_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

create table public.round_results (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  game_id uuid not null,
  round_index integer not null,
  image_id uuid not null,
  score integer null,
  accuracy numeric null,
  xp_where integer null,
  xp_when integer null,
  hints_used integer null default 0,
  distance_km numeric null,
  guess_year integer null,
  guess_lat numeric null,
  guess_lng numeric null,
  actual_lat numeric null,
  actual_lng numeric null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint round_results_pkey primary key (id),
  constraint round_results_user_id_game_id_round_index_key unique (user_id, game_id, round_index),
  constraint round_results_image_id_fkey foreign KEY (image_id) references images (id) on delete CASCADE,
  constraint round_results_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_round_results_user_id on public.round_results using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_round_results_game_id on public.round_results using btree (game_id) TABLESPACE pg_default;

create index IF not exists idx_round_results_user_game on public.round_results using btree (user_id, game_id) TABLESPACE pg_default;

create trigger update_round_results_updated_at BEFORE
update on round_results for EACH row
execute FUNCTION update_updated_at_column ();