-- Create profile automatically for every new auth user
-- This function runs with elevated privileges and bypasses RLS safely.
-- It inserts a minimal row into public.profiles; the app later enriches it.

begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insert minimal profile row; avoid setting is_guest here
  insert into public.profiles (id, created_at, updated_at)
  values (new.id, now(), now())
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Recreate trigger to ensure idempotency
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

commit;
