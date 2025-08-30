-- 03_trigger_round_timers.sql

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Update updated_at automatically on any row update
create trigger if not exists round_timers_touch_updated_at
before update on public.round_timers
for each row execute function public.touch_updated_at();
