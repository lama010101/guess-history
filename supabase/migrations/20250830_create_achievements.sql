-- Create achievements table to persist earned badges/records
-- Stores per-user achievements with optional context_id (e.g., room_id or game_id) to dedupe per session
--
-- Columns
--   id          uuid PK
--   user_id     uuid (FK to auth.users)
--   type        text (e.g., 'time_round', 'combo_game', 'round_streak')
--   level       text (e.g., 'gold' | 'silver' | 'bronze' | custom tier)
--   value       integer (numeric value associated, e.g., streak length, accuracy percent)
--   context_id  text NULL (session/game/room identifier; NULL for global achievements)
--   created_at  timestamptz default now()
--
-- Indexing & constraints
--   - UNIQUE (user_id, type, context_id) to prevent duplicates per session when context_id is provided
--   - Index on (user_id, created_at desc)
--   - Index on (user_id, type)

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  level text,
  value integer,
  context_id text null,
  created_at timestamptz not null default now()
);

comment on table public.achievements is 'Per-user achievements and records for Guess History';
comment on column public.achievements.type is 'Achievement classifier (e.g., gold_time_round, silver_combo_game, round_streak)';
comment on column public.achievements.level is 'Optional tier (gold/silver/bronze/etc)';
comment on column public.achievements.value is 'Optional numeric value (accuracy %, streak length, etc)';
comment on column public.achievements.context_id is 'Optional session/game/room identifier to dedupe per-session achievements';

-- Ensure RLS
alter table public.achievements enable row level security;

-- Policies: users can manage only their own rows
create policy if not exists achievements_select_own on public.achievements
  for select
  using (auth.uid() = user_id);

create policy if not exists achievements_insert_own on public.achievements
  for insert
  with check (auth.uid() = user_id);

create policy if not exists achievements_update_own on public.achievements
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists achievements_delete_own on public.achievements
  for delete
  using (auth.uid() = user_id);

-- Indexes
create unique index if not exists achievements_user_type_context_unique
  on public.achievements (user_id, type, context_id);

create index if not exists achievements_user_created_at_idx
  on public.achievements (user_id, created_at desc);

create index if not exists achievements_user_type_idx
  on public.achievements (user_id, type);
