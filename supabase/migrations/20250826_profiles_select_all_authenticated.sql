-- Allow authenticated users to read all profiles for Friends search and discovery
-- Safe-guarded to avoid duplicate policy creation

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_select_all_authenticated'
  ) THEN
    CREATE POLICY profiles_select_all_authenticated
      ON public.profiles
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;
