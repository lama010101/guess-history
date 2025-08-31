-- Create a single-row game configuration table with JSONB overrides
create table if not exists public.game_config (
  id text primary key default 'global',
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Ensure RLS is enabled
alter table public.game_config enable row level security;

-- Read access for everyone
create policy if not exists "Anyone can read game_config"
  on public.game_config
  for select
  using (true);

-- Only admins (role claim in JWT) can insert/update
create policy if not exists "Only admins can insert game_config"
  on public.game_config
  for insert
  to authenticated
  with check (auth.jwt() ->> 'role' = 'admin');

create policy if not exists "Only admins can update game_config"
  on public.game_config
  for update
  to authenticated
  using (auth.jwt() ->> 'role' = 'admin');

-- Trigger to maintain updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_game_config_updated_at on public.game_config;
create trigger trg_game_config_updated_at
before update on public.game_config
for each row execute function public.set_updated_at();

-- Enable realtime changes on this table (for postgres_changes)
alter publication supabase_realtime add table public.game_config;
