-- Migration 0008: Guest username generation + username update support
-- Run in Supabase Dashboard → SQL Editor

------------------------------------------------------------------------------
-- 1. Update handle_new_user to generate Guest_XXXX for anonymous sign-ins
------------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger as $$
declare
  base_username text;
  candidate     text;
  attempt       int := 0;
begin
  if new.is_anonymous then
    -- Anonymous users get Guest_XXXX (4-digit zero-padded random number)
    loop
      candidate := 'Guest_' || lpad((floor(random() * 10000))::int::text, 4, '0');
      exit when not exists (select 1 from public.profiles where username = candidate);
    end loop;
  else
    base_username := regexp_replace(
      coalesce(split_part(new.email, '@', 1), 'user'),
      '[^A-Za-z0-9_]', '', 'g'
    );
    if char_length(base_username) < 3 then
      base_username := base_username || 'fan';
    end if;
    base_username := substring(base_username from 1 for 16);
    candidate := base_username;
    while exists (select 1 from public.profiles where username = candidate) loop
      attempt   := attempt + 1;
      candidate := base_username || attempt::text;
    end loop;
  end if;

  insert into public.profiles (id, username) values (new.id, candidate);
  insert into public.user_stats (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

------------------------------------------------------------------------------
-- 2. Allow anonymous users to update their own profile (link account / rename)
------------------------------------------------------------------------------
-- The existing profiles_update_self policy already covers auth.uid() = id,
-- which applies to both real and anonymous Supabase sessions — no change needed.

------------------------------------------------------------------------------
-- 3. (Optional) index to speed up Guest_XXXX uniqueness loop
------------------------------------------------------------------------------
create index if not exists profiles_username_prefix_idx
  on public.profiles (username text_pattern_ops);
