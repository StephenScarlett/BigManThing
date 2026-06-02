# BigManThing — Project Plan

> Trinidad & Tobago–themed browser game platform launching with two modes: **Guess Nah** (LoLdle-style daily) and **Draw Nah** (LoL Sketch–style multiplayer drawing). Built mobile-first, dark, gaming-aesthetic, designed to be shareable on WhatsApp/TikTok/Discord.

---

## 1. Product Vision

**One-liner:** *"BigManThing — guess it, draw it, share it. Trini style."*

**Audience:** Trinidadians 16–45, diaspora, Caribbean culture fans. Players who enjoy Wordle-style daily habits and Skribbl-style party games, who want content that feels *theirs*.

**Why it works:**
- Cultural specificity is the moat — LoLdle clones exist for every fandom; nothing serious exists for Trini culture.
- Daily mode drives habit + WhatsApp share loop ("Took me 4 tries today 🇹🇹 4/6").
- Multiplayer drawing mode drives social/lime sessions, especially during Carnival, Christmas, sports nights.
- Two modes feed each other: the same content library (Trini "things") powers both, halving content cost.

**Brand Pillars:**
1. **Local first** — language, food, mas, folklore, music, politics, lime culture.
2. **Funny, never preachy** — meme tone, side-eye humour, no school-trivia vibe.
3. **Modern gaming UI** — dark mode, neon/Carnival accent palette, smooth animations, esports-inspired typography.
4. **Mobile first** — 70%+ traffic will be phones; design portrait, thumb-reachable.
5. **Share-native** — every screen has a screenshot-worthy moment.

---

## 2. The Two Game Modes

### 2.1 Guess Nah (LoLdle-style)

**Core loop:** Player has a daily mystery answer. They type guesses; each guess reveals attribute matches via colored tiles (green = exact match, yellow = partial/close, red = wrong, with directional arrows for ordered attributes).

#### The Category Problem & Recommendation

LoLdle works because all 160 League champions share the same attribute schema (gender, role, range, region, year released, resource). Trini "things" don't — comparing Papa Bois to Machel Montano on the same attribute grid breaks the game.

**Recommendation: One unified daily game with a *Category* attribute, plus a small set of universally applicable attributes.** Sub-modes are a future expansion, not MVP.

**Universal attribute schema (every entity in the answer pool has these):**

| Attribute | Type | Feedback Style | Notes |
|---|---|---|---|
| **Category** | enum | exact / wrong | Folklore, Historical Figure, Musician/Influencer, Food/Drink, Place, Animal, Mas/Carnival, Slang/Phrase, Sports, Politics, TV/Film/Internet |
| **Era** | enum (ordered) | exact / higher-lower arrow | Pre-1900, 1900–1962, 1962–2000, 2000s, 2010s, 2020s, "Timeless/Folklore" |
| **Origin Region** | enum | exact / partial (same island) / wrong | North Trinidad, South Trinidad, East, Central, Tobago, Pan-Caribbean, Diaspora, Mythical |
| **Vibe Tags** | multi-tag | green if all match, yellow if any overlap | Funny, Scary, Sexy, Wholesome, Iconic, Controversial, Sweet, Wajang, Bess |
| **Real or Fictional** | bool | exact / wrong | |
| **Associated Sense** | enum | exact / wrong | Sight, Sound, Taste, Smell, Touch, Mixed — helps food/music/folklore feel different |
| **Letter count** | number (ordered) | exact / higher-lower arrow | of canonical name |
| **First letter** | char | exact / wrong | |

**Daily companion mini-rounds (LoLdle has 5 sub-games — we ship 3 at MVP):**
1. **Classic** — attribute grid above (the main game).
2. **Quote/Sound Nah** — show a famous Trini quote/lyric, guess who/what said it. (Soca lyric, political soundbite, folklore line, ad jingle.)
3. **Picture Nah** — zoomed/blurred image, zooms out / unblurs each wrong guess. Works for *any* category.

**Future sub-modes (post-MVP):** Emoji Nah (emoji rebus), Map Nah (place on Trinidad map), Ingredient Nah (food only).

#### Features (MVP)
- Daily challenge (one per day, same answer for everyone, midnight Trinidad time = AST/UTC-4).
- Unlimited mode (random pick from full pool, separate stats).
- Share results — copy emoji grid (🟩🟨🟥) + link, no spoilers, like Wordle.
- Win streak (current + max).
- Stats: games played, win %, streak, guess distribution histogram.
- "Already played today" lockout with countdown to next puzzle.
- Hints (post-MVP): after N wrong guesses, reveal Category for free.

### 2.2 Draw Nah (LoL Sketch–style)

**Core loop:** Host creates room → friends join via 6-char code → drawer picks 1 of 3 prompts → 60–90s to draw on canvas → others type guesses in chat → points awarded by speed → rotate drawer → leaderboard at end.

Direct port of Rivals-Sketch architecture (already proven by user's prior repo) with Trini content.

#### Features (MVP)
- Private rooms with 6-char alphanumeric code (exclude 0/O/1/I).
- Up to 12 players per room.
- Real-time canvas (raw HTML5, brush/eraser/fill, 15 colors, 5 sizes, undo, clear).
- Stroke broadcast via Socket.io with replay buffer for late joiners.
- Guessing chat with Levenshtein "close guess" feedback (private to guesser).
- Host configures: rounds (1–10), draw time (30–180s), categories (multi-select), allow/deny aliases.
- Scoring: guesser 100–500 by speed; drawer 50 per correct guess.
- End-of-game leaderboard with shareable image.
- Nickname-based identity, rejoin within 10 min.

#### Differences from Rivals-Sketch we should add
- Persist room stats to DB (game history, top players per week).
- Optional account login for tracked stats and friends list (see §6).
- Trini word bank with categories from §2.1.
- "Pong" emoji reactions in chat.
- Soca-themed sound pack (still Web Audio API synths, no files).

---

## 3. Content Strategy

The shared content library is the product. Both modes pull from one Supabase `entities` table.

**Categories (MVP launch target ~250 entries):**
- Folklore (~25): Papa Bois, La Diablesse, Soucouyant, Douen, Lagahoo, Mama D'Leau, Buck, Jumbie...
- Historical Figures (~30): Eric Williams, CLR James, Stollmeyer, Hasely Crawford, Brian Lara, Dwight Yorke...
- Musicians/Influencers (~50): Machel, Bunji, Fay-Ann, Patrice Roberts, Kes, Nailah, Voice, Foreign Mind, Karen Nunez-Tesheira, Nikki Crosby, current TikTok personalities...
- Food/Drink (~40): doubles, bake & shark, pelau, callaloo, roti, aloo pie, sorrel, mauby, ponche-de-crème, black cake...
- Places (~30): Maracas, Las Cuevas, Pitch Lake, Caroni Swamp, Queen's Park Savannah, Brian Lara Promenade, Maracas Waterfall, Tobago beaches...
- Animals (~20): scarlet ibis, leatherback turtle, manicou, agouti, cocrico, iguana, pelican, mapepire...
- Mas/Carnival (~25): J'Ouvert, Blue Devils, Moko Jumbie, Dame Lorraine, Midnight Robber, Fancy Sailor, Pretty Mas, soca monarch...
- Slang/Phrases (~20): "ent", "oui foute", "wajang", "bess", "tabanca", "macocious", "limin'"...
- Sports (~15): West Indies cricket, T&T 2006 World Cup, Soca Warriors, Penny Commissiong...
- Politics (~10): PNM, UNC, Red House, Section 34, "we will rock you"...
- TV/Film/Internet (~15): Rikki Tikki, Gayelle, Carib Beer ads, viral moments...

Each entity = row with: name, aliases[], category, era, region, vibe_tags[], real_or_fictional, sense, image_url (for Draw Nah reference + Picture Nah), audio_url (Quote Nah), description, difficulty (easy/med/hard), draw_nah_enabled (some are too abstract to draw), guess_nah_enabled.

**Content sourcing:** Manual curation by user + small editorial team via admin panel. User-submitted prompts (post-MVP) gated through moderation queue.

---

## 4. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | **React + Vite + TypeScript** | Matches Rivals-Sketch; fast HMR; large ecosystem |
| Styling | **Tailwind CSS + shadcn/ui** | Rapid dark-themed UI; consistent components |
| Animation | **Framer Motion** | Tile flips, modal transitions |
| Routing | **React Router v6** | |
| State | **Zustand** for client UI state; **TanStack Query** for server state | Lightweight, avoids Redux overhead |
| Realtime (Draw Nah) | **Socket.io** on a Node/Express server | Reuse Rivals-Sketch patterns directly |
| Backend (Guess Nah) | **Supabase only** — Postgres + RLS + Edge Functions for daily-puzzle picker | "No APIs" constraint satisfied |
| Auth | **Supabase Auth** — email magic link + Google + (optional) Discord | Easiest, secure, free tier |
| Database | **Supabase Postgres** | Single source of truth for both modes |
| File storage | **Supabase Storage** | entity images, audio clips, share-card snapshots |
| Real-time DB events | **Supabase Realtime** for non-canvas events (lobby presence, game-end results); Socket.io still owns canvas strokes (lower latency, higher throughput) | Hybrid is pragmatic |
| Hosting (frontend) | **Vercel** or **Cloudflare Pages** | CDN, preview deploys, free tier |
| Hosting (Socket.io server) | **Railway** or **Fly.io** | Long-lived WS connections; user already familiar with Railway |
| Analytics | **PostHog** or **Plausible** (privacy-friendly) | Track funnel, retention |
| Error monitoring | **Sentry** free tier | |
| Admin panel | Custom React route gated by `is_admin` claim | Simpler than separate tool |

**Why Supabase fits the "no APIs" rule:** the frontend talks directly to Supabase (PostgREST + Realtime + Auth) using the SDK. RLS enforces security. The only custom server is the Socket.io node for Draw Nah canvas streaming — that's not an "API" in the REST sense, it's a game server.

---

## 5. Architecture

### 5.1 High-Level

```
                     ┌──────────────────────────┐
                     │  React SPA (Vercel CDN)  │
                     │  - Guess Nah  - Draw Nah │
                     └───────┬──────────┬───────┘
                             │ HTTPS    │ WSS
                             │ (sdk)    │ (socket.io)
                             ▼          ▼
                    ┌──────────────┐  ┌────────────────────┐
                    │   Supabase   │  │  Socket.io Server  │
                    │  Postgres    │  │   (Node/Railway)   │
                    │  Auth        │  │  - rooms           │
                    │  Storage     │  │  - canvas strokes  │
                    │  Realtime    │  │  - chat / scoring  │
                    │  Edge Fns    │  └─────────┬──────────┘
                    └──────┬───────┘            │ writes game results
                           │                    │ via Supabase service key
                           └────────────────────┘
```

### 5.2 Daily Challenge System (Guess Nah)

- **Picker:** Supabase Edge Function `pick-daily` runs via cron at 00:00 AST.
- **Client read:** SPA queries `daily_puzzles` for today's date via Supabase SDK. Entity details revealed only on win/loss.
- **Submission:** Edge Function `submit-guess` is the *only* code that knows the answer. It returns colored-feedback payload without ever exposing the name pre-solve.
- **Anti-cheat:** RLS prevents reading the answer; client never receives the answer entity until a `daily_results` row with `solved=true` or `attempts>=6` exists.

### 5.3 Multiplayer (Draw Nah)

Direct adaptation of Rivals-Sketch:
- **GameManager** singleton on Socket.io server holds `Map<roomCode, GameRoom>`.
- **GameRoom** is a state machine: `LOBBY → PICKING_WORD → DRAWING → ROUND_END → ... → GAME_OVER`.
- **Stroke events** broadcast in-room via `io.to(roomCode).except(drawerSocketId).emit('draw', event)`.
- **Word bank** loaded at boot from Supabase `entities` (filtered by `draw_nah_enabled`).
- **Game results** persisted to Supabase `draw_games` + `draw_game_players` on `GAME_OVER`.
- **Reconnect window:** 10 min; rejoin by `auth.user.id` if logged in, else nickname.
- **Rate limiting:** Socket.io middleware throttles `draw` to 60 events/sec/player and `chat` to 5 messages/sec.

### 5.4 Realtime Layering Decision

| Concern | Channel | Why |
|---|---|---|
| Canvas strokes | Socket.io | High-frequency, low-latency, drawer→watchers fanout |
| Lobby presence, chat | Socket.io | Same connection already open |
| Daily-puzzle live counter ("X people solved today") | Supabase Realtime | Cheap, no game server load |
| Friend online status | Supabase Realtime presence | Built-in |

---

## 6. Accounts & Security

**Recommendation: Optional accounts.** Players can play both modes anonymously (nickname only), but signing in unlocks streak persistence across devices, friends, leaderboards, and saved Draw Nah game history.

**Auth flow:** Supabase Auth — email magic link primary, Google + Discord OAuth as one-click options. No passwords. Username chosen on first login (unique, profanity-filtered, 3–20 chars, displayed in-game).

**Security checklist:**
- All tables protected by **Row-Level Security**. Default deny.
- Daily puzzle answer never exposed to client until game lock — enforced via Edge Function `submit-guess` and a `daily_puzzles_public` view that omits `entity_id`.
- Service role key never in client bundle; only on Socket.io server and Edge Functions.
- Socket.io: validate every event against authenticated user; nickname collisions per room, length limits.
- Profanity filter on nicknames and chat (allow Trini slang, block hate/explicit).
- Rate limit: client IP-based on Edge Functions, per-user on Socket.io.
- CORS strict to known frontend origins.
- Image uploads (post-MVP user prompts): scan via Supabase Storage policies + manual moderation queue.
- Account deletion endpoint, no PII beyond email.
- Cheat detection: detect impossible-fast solves; rate limit `submit-guess` to 1/sec.

---

## 7. Database Schema (Supabase Postgres)

```
profiles
  id uuid PK (= auth.users.id)
  username citext UNIQUE
  avatar_url text
  is_admin bool default false
  created_at timestamptz

entities                              -- the shared content library
  id uuid PK
  name text NOT NULL
  aliases text[] default '{}'
  category text NOT NULL              -- enum-checked
  era text                            -- enum-checked
  region text
  vibe_tags text[]
  real_or_fictional bool
  sense text
  letter_count int generated
  first_letter char(1) generated
  description text
  image_url text
  audio_url text
  difficulty text                     -- easy|medium|hard
  guess_nah_enabled bool default true
  draw_nah_enabled bool default true
  created_at, updated_at

daily_puzzles
  id uuid PK
  puzzle_date date
  mode text                           -- classic|quote|picture
  entity_id uuid REFERENCES entities
  UNIQUE (puzzle_date, mode)

guess_attempts
  id uuid PK
  user_id uuid (nullable for anon)
  anon_session_id text
  puzzle_id uuid REFERENCES daily_puzzles
  guess_entity_id uuid REFERENCES entities
  attempt_number int
  feedback jsonb
  created_at

daily_results
  user_id, puzzle_id  PK
  attempts int
  solved bool
  duration_ms int

user_stats
  user_id PK
  games_played, games_won, current_streak, max_streak,
  guess_distribution int[6]

draw_games
  id uuid PK
  room_code text
  host_user_id uuid
  started_at, ended_at
  rounds int
  draw_time_seconds int
  categories text[]

draw_game_players
  game_id, user_id (or anon_session_id+nickname)
  final_score int
  rounds_drawn int
  correct_guesses int

friendships
  user_a, user_b, status, created_at

reports
  id, reporter_user_id, target_kind, target_id, reason, status

audit_log
  id, actor_user_id, action, payload, created_at
```

**Indexes:** `entities(category, guess_nah_enabled)`, `entities(category, draw_nah_enabled)`, `daily_puzzles(puzzle_date)`, `guess_attempts(user_id, puzzle_id)`, `user_stats(current_streak desc)`.

---

## 8. API / Edge Function Design

Frontend mostly uses Supabase SDK directly. A handful of Edge Functions:

- `POST /functions/v1/submit-guess` — body `{ puzzle_id, guess_entity_id }` → returns `{ feedback, solved, attempts_remaining, answer? }`. Only function that knows the answer.
- `POST /functions/v1/pick-daily` — cron-triggered, picks tomorrow's puzzles.
- `POST /functions/v1/share-card` — generates OG image PNG (Satori) for share links.
- `POST /functions/v1/admin-import` — bulk upload entities from CSV, admin-only.

Socket.io events (Draw Nah):
- C→S: `room:create`, `room:join`, `room:leave`, `game:start`, `word:pick`, `draw`, `chat:guess`, `react`.
- S→C: `room:state`, `game:state`, `word:options`, `draw`, `chat:message`, `round:end`, `game:end`.

---

## 9. UI / UX

### 9.1 Visual Direction
- **Dark base:** near-black `#0B0B12`.
- **Accents:** Carnival palette — hot pink `#FF2D87`, electric cyan `#00E5FF`, mango `#FFB000`, lime `#A6FF00`. Use sparingly as glow/border.
- **Type:** Display = "Druk" or "Anton" (chunky condensed); body = Inter; mono for share grids.
- **Illustration:** subtle steelpan rim motif, J'Ouvert paint splatter as section dividers.
- **Microcopy:** Trini voice — "Guess nah!", "Yuh see this one?", "Reach back tomorrow", "Doh play yuhself", "Catch a vibes".

### 9.2 Homepage Layout (mobile-first, single column)
1. **Hero:** Logo, tagline, today's date, two giant tiles → Guess Nah + Draw Nah.
2. **Today's stats strip:** "1,243 Trinis solved today · Average 3.8 guesses".
3. **How it works:** 3 cards.
4. **Live Draw Nah rooms** (logged in only).
5. **Leaderboard preview:** weekly streak top 5.
6. **Footer.**

### 9.3 Guess Nah screen
- Centered guess input with autocomplete dropdown (entity names matching prefix, with category icon).
- Below: 6 attribute-row tiles per guess, animated flip on submission.
- Sidebar/sheet: today's stats, streak counter, share button (locked until solved/lost).
- Sub-mode tabs at top: Classic · Quote · Picture.

### 9.4 Draw Nah screen
- Top: round X/Y, timer ring, current word (drawer only) or word-length blanks (guessers).
- Center: canvas (16:9, scales to viewport).
- Right rail / bottom sheet: chat + player list with scores.
- Bottom: drawer's tool palette.

### 9.5 Mobile considerations
- Bottom-sheet chat with slide-up handle.
- Canvas locks portrait drawing area; guessers see compact view.
- Haptic feedback on correct guess (Vibration API).
- Safe-area insets respected.

---

## 10. Monetization (post-MVP)

Don't monetize until ~10k WAU. Then:
1. **BigManThing+ subscription** (~$3 USD/mo): ad-free, custom avatar, larger Draw Nah rooms, exclusive emoji reactions, profile flair.
2. **Brand-sponsored daily puzzles:** local brands (Carib, Stag, KFC TT, bmobile) sponsor a themed week — clearly labeled.
3. **Carnival merch drops** via Printful — limited edition per Carnival season.
4. **Tournaments** with entry fee + sponsor prize pool.
5. **Display ads** as last resort.

Avoid: pay-to-win, loot boxes, intrusive interstitials.

---

## 11. MVP Scope

**In:** Guess Nah Classic + Quote + Picture; share grid + streak + stats; Draw Nah private rooms with 12 player cap; optional auth; admin panel; ~250 entities; mobile-first; Discord/TikTok share cards.

**Out (deferred):** Friends list & DMs; global leaderboards; user-submitted prompts; Emoji Nah, Map Nah; native apps; tournaments / monetization; AI opponent.

---

## 12. Future Expansion

- More sub-modes (Emoji Nah, Map Nah, Ingredient Nah, Soca Lyric Nah).
- Seasonal events: Carnival Week, Independence Day, Christmas, Divali.
- User-submitted entries with moderation queue.
- Native iOS/Android via Capacitor.
- Discord Activity port.
- Caribbean expansion: same engine, swap content.
- WhatsApp bot daily reminder; Discord slash command.
- AI prompt assistant.

---

## 13. Roadmap

**Phase 0 — Foundations:** monorepo, Supabase project + schema + RLS, Vercel/Railway, design system.
**Phase 1 — Guess Nah Classic vertical slice.**
**Phase 2 — Guess Nah polish + Quote + Picture.**
**Phase 3 — Draw Nah** (parallel with Phase 2): port Rivals-Sketch, persist results, rate limits.
**Phase 4 — Content + Admin.**
**Phase 5 — Closed beta + public launch.**
**Phase 6 — Post-launch:** friends list, sponsored weeks.

---

## 14. Verification Plan

- **Automated:** Vitest for attribute-feedback, scoring, Levenshtein. Playwright E2E for daily Guess Nah and 2-socket Draw Nah game.
- **Security:** RLS test suite — anon/authed-pre-solve cannot read answer; cross-user `guess_attempts` insert must fail.
- **Performance:** Lighthouse mobile ≥90; Artillery 100 concurrent rooms × 8 players.
- **Manual:** 4-device drawing session for canvas calibration; share grid renders correctly across messaging apps.

---

## 15. Decisions Recorded

- **Database / no-API:** Supabase confirmed. RLS + Edge Functions cover security.
- **Accounts:** Optional. Magic link + Google + Discord OAuth.
- **Guess Nah categories:** ONE unified game with `Category` as an attribute. Sub-modes Classic/Quote/Picture at MVP.
- **Draw Nah base:** Adapt Rivals-Sketch architecture; swap content; add Supabase persistence + rate limiting.
- **Hosting split:** Vercel/CF Pages for SPA, Railway for game server, Supabase managed for everything else.

---

## 16. Open Questions

1. **Domain & branding lock-in.** `bigmanthing.com` available? Logo direction (mascot vs. wordmark)?
2. **Quote Nah audio licensing.** Recommend MVP = text-only quotes; voice-acted reads in v1.1.
3. **Daily reset timezone.** AST (UTC-4) recommended.
4. **Profanity allow-list** for Trini slang — needs editorial sign-off.
5. **Beta tester pool** of ~50 Trinis.
