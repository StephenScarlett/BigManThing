-- Allow clearing guess history from admin tools.
-- Existing RLS had read-only policies for guess_attempts/daily_results,
-- so client-side DELETE would fail silently unless errors were checked.

-- guess_attempts: users can delete their own rows; admins can delete any.
drop policy if exists guess_attempts_delete_own on public.guess_attempts;
create policy guess_attempts_delete_own on public.guess_attempts
  for delete using (
    (auth.uid() is not null and user_id = auth.uid())
    or (auth.uid() is null and anon_session_id = current_setting('request.headers', true)::json->>'x-bmt-anon-id')
  );

drop policy if exists guess_attempts_delete_admin on public.guess_attempts;
create policy guess_attempts_delete_admin on public.guess_attempts
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- daily_results: users can delete their own rows; admins can delete any.
drop policy if exists daily_results_delete_own on public.daily_results;
create policy daily_results_delete_own on public.daily_results
  for delete using (
    (auth.uid() is not null and user_id = auth.uid())
    or (auth.uid() is null and anon_session_id = current_setting('request.headers', true)::json->>'x-bmt-anon-id')
  );

drop policy if exists daily_results_delete_admin on public.daily_results;
create policy daily_results_delete_admin on public.daily_results
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
