-- Lift the 6-attempt cap on guess_attempts. Guess Nah no longer limits guesses;
-- the score is how many tries it took to solve.

alter table public.guess_attempts
  drop constraint if exists guess_attempts_attempt_number_check;

alter table public.guess_attempts
  add constraint guess_attempts_attempt_number_check
  check (attempt_number >= 1);
