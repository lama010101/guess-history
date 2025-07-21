# GUESS HISTORY LANDING WEBAPP – Architecture & Code Guidelines

_Last updated: 2025-07-14_

---

## 1. Purpose
This document describes the architecture, structure, and code guidelines for the **Landing Page webapp** that used to be found in the `LANDING/` folder. It also identifies the files required to integrate the landing page as the main entry point for the full application.

---

## 2. Technology Stack
| Concern               | Choice                                  | Notes |
|-----------------------|------------------------------------------|-------|
| Front-end framework   | **React 18** + **TypeScript**           | Functional components only. |
| Build tool            | **Vite** with `@vitejs/plugin-react-swc`| Fast HMR and SWC transpilation. |
| Styling               | **Tailwind CSS**                        | Utility-first. |
| Routing               | **react-router-dom v6**                 | SPA routing for landing & auth flows. |
| State management      | **React Context + Hooks**               | No Redux/MobX. |
| Auth                  | Supabase (via custom `useAuth` hook)    | Handles login, callback, reset. |
| Data fetching         | **@tanstack/react-query**               | For async state/data. |
| Lint / Format         | **ESLint** & **Prettier**               | Enforced on commit. |

---

## 3. High-Level Architecture
```
┌─────────────────────────────────────────┐
│         Browser / DOM                   │
└─────────────────────────────────────────┘
                ▲
                │ React
                ▼
┌─────────────────────────────────────────┐
│ Presentation Layer (Landing Components) │
│ - Hero, FAQ, HowItWorks, Navbar, etc.   │
└─────────────────────────────────────────┘
                ▲
                │ Context / Hooks         │
                ▼
┌─────────────────────────────────────────┐
│ Domain Logic (Auth, Query, etc)         │
│ - useAuth, react-query, etc.            │
└─────────────────────────────────────────┘
                ▲
                │ Supabase client         │
                ▼
┌─────────────────────────────────────────┐
│      Supabase (Auth, DB)                │
└─────────────────────────────────────────┘
```

---

## 4. Directory Structure
```
LANDING/
├── public/                  # Static assets
├── src/
│   ├── components/          # UI blocks (HeroSection, Navbar, FAQSection, ...)
│   ├── pages/               # Route pages (Index, Main, Callback, ...)
│   ├── hooks/               # Custom hooks (useAuth, ...)
│   ├── integrations/        # Third-party integrations
│   ├── lib/                 # Supabase client, helpers
│   ├── index.css            # Tailwind + global styles
│   ├── App.tsx              # Main App (routing, providers)
│   ├── main.tsx             # Entry point
│   └── vite-env.d.ts        # Vite env types
├── index.html               # HTML entry
├── package.json             # Project manifest
├── tailwind.config.ts       # Tailwind config
├── vite.config.ts           # Vite config
└── ...
```

### Component & File Naming
| Artifact                | Convention              | Example |
|-------------------------|-------------------------|---------|
| React component file    | `PascalCase.tsx`        | `HeroSection.tsx` |
| Hook                    | `useCamelCase.ts`       | `useAuth.ts` |
| Page component          | `PascalCase.tsx`        | `Index.tsx` |

---

## 5. Coding Guidelines
### 5.1 TypeScript
- Use strict types; avoid `any`.
- Prefer `interface` for objects, `type` for unions.

### 5.2 React
- Functional components only.
- Destructure props.
- Keep UI pure; side-effects in hooks/services.
- Use Context for auth/global state.

### 5.3 Routing
- SPA routes defined in `App.tsx` with `<Routes>`.
- Landing page is `Index.tsx` at `/`.
- Auth/callback/reset routes for onboarding.

### 5.4 Styling
- Tailwind utility classes.
- Use `index.css` for global styles.

### 5.5 Auth & Data
- Use `useAuth` hook for user state.
- Use `react-query` for async data.

### 5.6 Lint & Format
- Run `npm run lint` and `npm run format` before commit.

---

## 6. Integration with Main App
To make the landing page the entry point for the main app, copy/adapt the following:

### Required Files/Folders to Integrate:
- `LANDING/src/pages/Index.tsx`  → Main landing page component (should be `/` route in main app)
- All **supporting components** from `LANDING/src/components/` used by `Index.tsx` (e.g. HeroSection, FAQSection, Navbar, etc.)
- Any **UI primitives** from `LANDING/src/components/ui/` used by landing components
- **Global styles**: `LANDING/src/index.css` (merge with main app styles)
- **Assets**: Any images/fonts referenced by landing components (from `LANDING/public/`)
- **Auth logic**: If the main app does not already use `useAuth` from landing, ensure logic is unified

### Integration Steps:
1. Copy `Index.tsx` to `src/pages/` in main app as `LandingPage.tsx` (or similar).
2. Copy all referenced components (and their dependencies) from `LANDING/src/components/` to `src/components/landing/` in main app.
3. Update `App.tsx` in main app to add route: `<Route path="/" element={<LandingPage />} />` as the first route.
4. Merge any global CSS from `LANDING/src/index.css` into `src/index.css`.
5. Ensure all assets referenced by landing exist in `public/` of main app.
6. Test all landing features (auth, navigation, responsiveness) in the integrated app.

---

## 7. FAQ
**Q: Can I just copy the whole LANDING/src?**
A: No. Only copy what is needed for the landing experience (Index.tsx, supporting components, and their dependencies). Avoid overwriting shared logic unless you have verified compatibility.

**Q: What about Auth?**
A: If both apps use different auth logic, refactor to use a single `useAuth` hook/context across the app.

---

_This document is living; update it with every significant architectural or guideline change._
