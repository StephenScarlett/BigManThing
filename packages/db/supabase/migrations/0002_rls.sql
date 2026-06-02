-- BigManThing — Row Level Security
-- Default deny for everything; explicit grants below.

alter table public.profiles          enable row level security;
alter table public.entities          enable row level security;
alter table public.daily_puzzles     enable row level security;
alter table public.guess_attempts    enable row level security;
alter table public.daily_results     enable row level security;
alter table public.user_stats        enable row level security;
alter table public.draw_games        enable row level security;
alter table public.draw_game_players enable row level security;
alter table public.friendships       enable row level security;
alter table public.reports           enable row level security;
alter table public.audit_log         enable row level security;

------------------------------------------------------------------------------
-- profiles: anyone can read public profiles; only owner can update.
------------------------------------------------------------------------------
create policy profiles_read on public.profiles
  for select using (true);

create policy profiles_update_self on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

------------------------------------------------------------------------------
-- entities: readable by anyone (clients need autocomplete + entity details).
-- Writes are admin-only (service role bypasses RLS; admins via is_admin flag).
------------------------------------------------------------------------------
create policy entities_read on public.entities
  for select using (true);

create policy entities_write_admin on public.entities
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

------------------------------------------------------------------------------
-- daily_puzzles: NO direct read access (would leak the answer).
-- Clients read the safe view `daily_puzzles_public` instead.
-- The submit-guess Edge Function uses the service role to access this table.
------------------------------------------------------------------------------
-- (no select policy = effectively private; admins can manage via service role)

create policy daily_puzzles_admin_manage on public.daily_puzzles
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Grant select on the public view to anon/auth so clients can list today's puzzles.
grant select on public.daily_puzzles_public to anon, authenticated;

------------------------------------------------------------------------------
-- guess_attempts: own rows only.
-- INSERTS go through the submit-guess Edge Function (service role) so we can
-- enforce attempt-count, dedupe, and write feedback the client cannot forge.
------------------------------------------------------------------------------
create policy guess_attempts_read_own on public.guess_attempts
  for select using (
    (auth.uid() is not null and user_id = auth.uid())
    or (auth.uid() is null and anon_session_id = current_setting('request.headers', true)::json->>'x-bmt-anon-id')
  );

-- No direct INSERT/UPDATE policy: writes only via service role from Edge Function.

------------------------------------------------------------------------------
-- daily_results: own rows only. Writes via Edge Function.
------------------------------------------------------------------------------
create policy daily_results_read_own on public.daily_results
  for select using (
    (auth.uid() is not null and user_id = auth.uid())
    or (auth.uid() is null and anon_session_id = current_setting('request.headers', true)::json->>'x-bmt-anon-id')
  );

------------------------------------------------------------------------------
-- user_stats: own row read+update. Public read of streak leaderboard happens
-- through a future view; for now, owner-only.
------------------------------------------------------------------------------
create policy user_stats_read_own on public.user_stats
  for select using (auth.uid() = user_id);

------------------------------------------------------------------------------
-- draw_games / draw_game_players: readable by participants and game host.
-- Inserts/updates handled by game-server with service role.
------------------------------------------------------------------------------
create policy draw_games_read_participant on public.draw_games
  for select using (
    host_user_id = auth.uid()
    or exists (
      select 1 from public.draw_game_players p
      where p.game_id = id and p.user_id = auth.uid()
    )
  );

create policy draw_game_players_read_self on public.draw_game_players
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.draw_games g
      where g.id = game_id and g.host_user_id = auth.uid()
    )
  );

------------------------------------------------------------------------------
-- friendships: readable + writable by either party.
------------------------------------------------------------------------------
create policy friendships_read on public.friendships
  for select using (auth.uid() in (user_a, user_b));

create policy friendships_insert on public.friendships
  for insert with check (auth.uid() in (user_a, user_b));

create policy friendships_update on public.friendships
  for update using (auth.uid() in (user_a, user_b));

create policy friendships_delete on public.friendships
  for delete using (auth.uid() in (user_a, user_b));

------------------------------------------------------------------------------
-- reports: anyone authed can submit; only admins can read/update.
------------------------------------------------------------------------------
create policy reports_insert on public.reports
  for insert with check (auth.uid() is not null);

create policy reports_read_admin on public.reports
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

create policy reports_update_admin on public.reports
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

------------------------------------------------------------------------------
-- audit_log: admin read only.
------------------------------------------------------------------------------
create policy audit_log_read_admin on public.audit_log
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
