-- 01_table_round_timers.sql
create table if not exists public.round_timers (
  user_id uuid not null,
  timer_id text not null,
  started_at timestamptz not null default now(),
  end_at timestamptz not null,
  duration_sec integer not null check (duration_sec > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint round_timers_pkey primary key (user_id, timer_id)
);

create index if not exists idx_round_timers_user_id on public.round_timers(user_id);
create index if not exists idx_round_timers_end_at on public.round_timers(end_at);

alter table public.round_timers enable row level security;
