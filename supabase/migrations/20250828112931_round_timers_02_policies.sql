-- 02_policies_round_timers.sql

-- Ensure only authenticated users can interact
revoke all on table public.round_timers from public;

grant select, insert, update on table public.round_timers to authenticated;

-- Owner-only SELECT
create policy if not exists round_timers_select_own
on public.round_timers
for select
using (auth.role() = 'authenticated' and user_id = auth.uid());

-- Owner-only INSERT (must insert own user_id)
create policy if not exists round_timers_insert_own
on public.round_timers
for insert
with check (auth.role() = 'authenticated' and user_id = auth.uid());

-- Owner-only UPDATE
create policy if not exists round_timers_update_own
on public.round_timers
for update
using (auth.role() = 'authenticated' and user_id = auth.uid())
with check (auth.role() = 'authenticated' and user_id = auth.uid());
