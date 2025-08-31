-- Update RLS policies on public.game_config to check user_metadata.role = 'admin'
-- This complements 20250831_create_game_config.sql which originally checked top-level JWT 'role'.
-- Apply using the documented Manual Migration Process.

begin;

-- Drop old policies if they exist
drop policy if exists "Only admins can insert game_config" on public.game_config;
drop policy if exists "Only admins can update game_config" on public.game_config;

-- Recreate with user_metadata.role = 'admin'
create policy "Only admins can insert game_config"
  on public.game_config
  for insert
  to authenticated
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "Only admins can update game_config"
  on public.game_config
  for update
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

commit;
