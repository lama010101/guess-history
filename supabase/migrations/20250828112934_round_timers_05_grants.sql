-- 05_grants_round_timers.sql

-- Allow authenticated users to execute timer RPCs
grant execute on function public.start_timer(text, integer) to authenticated;
grant execute on function public.get_timer(text) to authenticated;
