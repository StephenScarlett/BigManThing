# BigManThing Database (Supabase)

This package owns the Postgres schema, RLS policies, Edge Functions, and seed data
for BigManThing. Both `apps/web` (via the Supabase JS SDK) and `apps/game-server`
(via service-role key, server-only) read from these tables.

## Layout

```
packages/db/
  supabase/
    migrations/        # SQL migrations, applied in order
      0001_init.sql
      0002_rls.sql
    functions/         # Edge Functions (Deno)
      submit-guess/
      pick-daily/
    seed.sql           # Optional starter content
  README.md
```

## Setup

```sh
# install Supabase CLI: https://supabase.com/docs/guides/cli
supabase init               # one-time, only if supabase/config.toml missing
supabase start              # spins up local stack on Docker
pnpm --filter @bmt/db supabase:reset   # apply migrations + seed
```

Local URLs (default):
- API:    http://localhost:54321
- DB:     postgresql://postgres:postgres@localhost:54322/postgres
- Studio: http://localhost:54323

Copy the printed `anon` and `service_role` keys into the relevant `.env.local` files
in `apps/web` and `apps/game-server`.

## Production deploy

```sh
supabase link --project-ref <ref>
supabase db push
supabase functions deploy submit-guess
supabase functions deploy pick-daily
```

## Security model

- All tables default-deny via RLS.
- The daily puzzle answer (`daily_puzzles.entity_id`) is **never** queryable from
  the client during an active game. The only path to validate a guess is the
  `submit-guess` Edge Function, which uses the service-role key server-side.
- Anonymous players use a generated `anon_session_id` (cookie/localStorage) for
  stat tracking until they sign in.
