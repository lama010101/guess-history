---
description: enforce single supabase client usage across app
---
1. Locate duplicate Supabase client files and choose the canonical one (usually under `src/integrations/supabase/client.ts`).
2. Refactor imports to use the canonical client via path aliases like `@/integrations/supabase/client` throughout the codebase.
3. Remove or archive redundant helper files outside `src/` (e.g., `integrations/supabase/*`) once all imports are updated.
4. Run type checking (`npm run build`) to confirm only one client is bundled.
5. Deploy or test on the target environment to verify authentication and room creation flows succeed.
