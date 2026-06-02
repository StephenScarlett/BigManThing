# BigManThing

A Trinidadian-themed browser game platform. Currently ships two games:

- **Guess Nah** — daily word-guessing game (Wordle-style) built around T&T culture, folklore, people, food, and more.
- **Draw Nah** — real-time multiplayer sketch-and-guess game with a Trini word bank.

Built with a pnpm monorepo, React + Vite frontend, Express + Socket.io game server, and Supabase for persistence.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Draw Nah — Game Rules & Features](#draw-nah--game-rules--features)
- [Guess Nah — Game Rules](#guess-nah--game-rules)
- [Database](#database)
- [Scripts](#scripts)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, TypeScript 5.6, Tailwind CSS 3, Framer Motion |
| State | Zustand 5, TanStack Query v5 |
| Routing | React Router v6 |
| Real-time | Socket.io 4.8 (client + server) |
| Game server | Express 4, Node.js, tsx watch |
| Database | Supabase (PostgreSQL + Edge Functions) |
| Shared types | `@bmt/shared` — read directly from TypeScript source, no build step |
| Package manager | pnpm 9 (run via `npx --yes pnpm@9.12.0`) |

---

## Project Structure

```
BigManThing/
├── apps/
│   ├── web/                  # React SPA (Vite, :5173)
│   │   ├── src/
│   │   │   ├── features/
│   │   │   │   └── draw-nah/ # Canvas, Chat, WordPicker, EndScreen, sounds…
│   │   │   ├── pages/        # HomePage, GuessNahPage, DrawNahPage
│   │   │   └── lib/          # theme, supabase client
│   │   ├── index.html
│   │   └── tailwind.config.js
│   └── game-server/          # Express + Socket.io game server (:8787)
│       └── src/
│           ├── index.ts       # HTTP + Socket.io bootstrap
│           ├── socket.ts      # Event handler registration
│           ├── gameManager.ts # Room lifecycle, rejoin, TTL cleanup
│           ├── gameRoom.ts    # Per-room state machine
│           ├── scoring.ts     # Levenshtein, normalize, scoring constants
│           └── wordBank.ts    # Supabase entity loader + fallback
├── packages/
│   ├── shared/               # @bmt/shared — types shared by web + server
│   │   └── src/
│   │       ├── draw-nah.ts   # Draw Nah events, settings, room state
│   │       ├── guess-nah.ts  # Guess Nah types
│   │       ├── entities.ts   # Entity / word-bank types
│   │       └── feedback.ts
│   └── db/                   # Supabase migrations, seed data, Edge Functions
│       └── supabase/
│           ├── migrations/
│           ├── functions/     # submit-guess Edge Function
│           └── seed.sql
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (installed on-demand via `npx --yes pnpm@9.12.0`)
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Clone

```bash
git clone https://github.com/StephenScarlett/BigManThing.git
cd BigManThing
```

### 2. Install dependencies

```bash
npx --yes pnpm@9.12.0 install
```

### 3. Configure environment variables

Copy the example files and fill in your values:

```bash
# Web (Vite SPA)
cp apps/web/.env.example apps/web/.env.local

# Game server
cp apps/game-server/.env.example apps/game-server/.env
```

See [Environment Variables](#environment-variables) for details.

### 4. Run development servers

In two separate terminals:

```bash
# Game server (hot-reload via tsx)
npx --yes pnpm@9.12.0 --filter @bmt/game-server run dev

# Web SPA
npx --yes pnpm@9.12.0 --filter @bmt/web run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Environment Variables

### `apps/web/.env.local`

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable (anon) key — safe to expose in the browser |
| `VITE_GAME_SERVER_URL` | URL of the game server (default `http://localhost:8787`) |

### `apps/game-server/.env`

| Variable | Description |
|---|---|
| `PORT` | Port to listen on (default `8787`) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins (e.g. `http://localhost:5173`) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase **secret** service-role key — **never commit, never expose to the browser** |

> Without `SUPABASE_SERVICE_ROLE_KEY` the game server falls back to a built-in word bank so the game still runs locally without a database.

---

## Draw Nah — Game Rules & Features

A real-time multiplayer drawing and guessing game. 2–12 players per room.

### How to play

1. One player creates a room and shares the 6-character code.
2. Everyone joins with a nickname.
3. Each round, one player is the **drawer** — they pick a word from three choices and draw it on the shared canvas.
4. **Guessers** type their answer in chat. The server checks against the word and its aliases without broadcasting the guess.
5. Correct guessers earn points (up to 500 — faster = more). The drawer earns 50 per correct guess.
6. After all rounds, scores are tallied and drawings are shown in a recap gallery.

### Features

- **10 word categories** — Sports, Music, Culture, Folklore, Nature, Food, Drink, Instrument, Wearable, Object
- **Smart guess matching** — normalizes accents, punctuation, abbreviations (`Doctor → Dr`, leading `the`, `&→and`), and accepts alternate spellings/aliases (toggleable)
- **Close-guess hint** — Levenshtein distance ≤ 2 shows a private "So close!" flash to the guesser only; the guess is not broadcast
- **Progressive letter hints** — one letter revealed at 40% elapsed time, another at 70% (toggleable per room)
- **Timer halving** — first correct guess cuts remaining time in half to keep rounds snappy
- **Round-divider system chat** — `── Round 2/3 · Player is drawing ──`
- **Round summary modal** — shows the word, the drawing snapshot, and who guessed it between rounds
- **Drawing recap gallery** — click thumbnails on the game-over screen to enlarge each round's drawing
- **Reconnect / rejoin** — drop mid-game and rejoin by nickname within 10 minutes, restoring your score and turn order
- **Room cleanup** — empty rooms expire after 5 minutes; rooms with disconnected players expire after 10 minutes
- **Canvas tools** — 15-colour palette, 5 brush sizes, flood-fill bucket, undo, clear
- **Sounds** — Web Audio synthesis (no asset files): correct guess, your correct, close hint, round start, game over; mute toggle persisted per device
- **Confetti** — winner gets confetti on game over
- **Leave confirmation** — prompted before leaving an active game
- **Host transfer** — host disconnecting automatically passes host to the next player

### Room settings (host only)

| Setting | Range | Default |
|---|---|---|
| Rounds | 1–10 | 3 |
| Draw time | 30–180 s | 90 s |
| Categories | any subset | all |
| Reveal hints | on/off | on |
| Accept aliases | on/off | on |

---

## Guess Nah — Game Rules

A daily Wordle-style game using Trinidadian entities (people, places, things, folklore).

- One entity per day, shared by all players
- 6 attempts; colour-coded feedback (exact / wrong position / absent)
- Guesses submitted via a Supabase Edge Function (`submit-guess`) to prevent client-side cheating
- Streak tracking persisted per device

---

## Database

The Supabase schema lives in [`packages/db/supabase/migrations/`](packages/db/supabase/migrations/).

Seed data is in [`packages/db/supabase/seed.sql`](packages/db/supabase/seed.sql). It contains the entity table used by both games — Trinidadian people, folklore figures, food, music, sports, and more.

The `submit-guess` Edge Function validates guesses server-side for Guess Nah.

To run Supabase locally:

```bash
cd packages/db
npx supabase start
npx supabase db reset   # applies migrations + seed
```

---

## Scripts

All commands use `npx --yes pnpm@9.12.0` to avoid requiring a global pnpm install.

```bash
# Install all workspace dependencies
npx --yes pnpm@9.12.0 install

# Run both dev servers concurrently (from root)
npx --yes pnpm@9.12.0 --filter @bmt/game-server run dev
npx --yes pnpm@9.12.0 --filter @bmt/web run dev

# Type-check all packages
npx --yes pnpm@9.12.0 -r run typecheck

# Build web SPA for production
npx --yes pnpm@9.12.0 --filter @bmt/web run build
```

---

## Colour & Theme

| Token | Light | Dark |
|---|---|---|
| Brand red | `#E10600` | `#E10600` |
| Background | `#FFFFFF` | `#0A0A0A` |
| Ink | `#0A0A0A` | `#FAFAFA` |

Theme preference is persisted to `localStorage` under `bmt:theme` and toggled via the sun/moon button in the header.

---

## Contributing

This is a personal project but PRs are welcome. Please open an issue first for large changes.

## License

MIT
