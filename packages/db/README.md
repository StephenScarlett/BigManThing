# BigManThing Database (Supabase)

This package owns the versioned schema, RPCs, legacy Edge endpoint and content records. See [Guess implementation](../../docs/GUESS_NAH_IMPLEMENTATION.md) for the current people game and its development status.

## Development setup

From this directory, use the installed Supabase CLI and Docker:

```sh
supabase start
pnpm --filter @bmt/db supabase:reset
```

The local configuration matches PostgreSQL 17 and enables authenticated anonymous guests. Google OAuth is optional locally: enable it after supplying credentials. Configure the web client with the local API URL and public key printed by the CLI. Server credentials belong only in the game server's private configuration.

A reset applies migrations and creates the 32 research drafts. It does not mark them reviewed, assign an editor, or publish a daily. Existing hosted data is preserved by the additive people migrations; a local reset is destructive to that local database. Assign the intended editor account through your database administration tools, then use Admin → People editor and Guess Nah → draft practice.

## Verify without Docker

```sh
pnpm --filter @bmt/db test
```

The PGlite integration suite applies the migration chain to a disposable PostgreSQL engine with Supabase Auth/role fixtures. It checks feedback, unknowns, attempts, duplicates, clue unlocks, edition freezing, publication, role boundaries and identity-scoped history. Unused pgcrypto installation is skipped in that engine; hosted checks verify the actual project's behavior. `test/hosted-guess-smoke.sql` performs a transactional development check and rolls its fixture back. It requires an existing editor.

## Current authority

People v1 uses public authenticated RPC wrappers, a single private SQL comparator, and private frozen editions/sessions/attempts. Source review and vocabulary validation run when profiles are saved and dailies are published. Anonymous guests are authenticated Supabase users. There is no client history/result write path or identity-header fallback for this game. The legacy `entities` library and Ting Edge endpoint remain separate.

The dated `content/people-draft.json` is the nomination/source record. Applied migrations are immutable; future content changes should use the editor or a new reviewed migration. Create migration files with `supabase migration new <name>`, test them, then apply to the intended environment. Local filenames must match applied remote versions. Database migrations deploy the people RPCs; no new people Edge deployment is required.

Do not use legacy `seed_today.sql` to publish the new people game. Use the editor's frozen edition publisher after facts and clue review. Picture/folklore packs and full account progression remain later work.
