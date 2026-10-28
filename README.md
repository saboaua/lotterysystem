# Shoco Lottery POS (Tablet) — Vercel full build

Standalone **tablet lottery point-of-sale** for Aruba — full feature parity path from the HACS Home Assistant integration, hosted on Vercel + Supabase.

| Layer | Stack |
|-------|--------|
| UI | Next.js 15 (App Router) + Tailwind CSS v4 |
| Hosting | [Vercel](https://vercel.com) |
| Data / Auth | [Supabase](https://supabase.com) (Postgres + Auth + RLS + **Storage**) |
| Offline demo | In-memory demo data (no keys required) |

## Role model (important)

| Role | Sees |
|------|------|
| **Lottery Owner** | Sell · Reports (all shops) · **Back office** (games, bet types, branding, retailers, promotions, network reports) |
| **Retailer / seller** | Sell · Reports (**own shop only**) · Support |

Back office is **never** shown to retailers (nav hidden + `/office` redirects to `/sell`).

## Features (aligned with HACS v0.9.x)

### Sell (POS)
- Multi-game picker, draw date, **AM/PM / multi-session** (Phillipsburg, Play Whe)
- Bet types: **4 Cifra, 3 Cifra, 2 Cifra 3CH, 4 Skina, 3 Skina, 2 Cifra B/F, 2 Cifra B**, Zodiac, Play Whe, Jackpot
- Keypad + amount presets · **Quick pick** · Clear · Replay · Último · Cancel · Scan · Report · Support
- **Zodiac** sign grid · **Play Whe** 1–36 marks · **Lotto Mac** ball + mega picker
- Ticket list · Send & Print (demo persistence in memory)

### Reports
- Date range · tickets / cancelled / plays / sales
- By game · by retailer (owner) · ticket list
- Retailer scoped to own shop

### Support
- Retailers open tickets; owner sees all

### Back office (owner only)
- Games & schedule (enable, draw time, color, **logos**)
- Fast Play games with logos
- Bet types & multipliers
- Branding + LED message + ticket design (width, barcode, QR, footer)
- 20 Aruba retailers + map
- Promotions (min plays / games)
- Network reports

## Quick start (demo mode)

```bash
cd lottery-pos-tablet
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| User | Role |
|------|------|
| Lottery Owner | Full back office + sell |
| Carlos Croes (Main Shop) | Retailer POS only |
| Maria Frans (Lucky Shoco) | Retailer POS only |

In demo mode (no Supabase env), logos are stored as **base64 data URLs** in `localStorage`.

## Deploy to Vercel

1. Push this folder to a GitHub repo (e.g. `saboaua/lotterysystem`).
2. [vercel.com/new](https://vercel.com/new) → import the repo.
3. Framework: **Next.js** (auto-detected).
4. Add env vars when you connect Supabase (see below).
5. Deploy → `*.vercel.app`.

Or CLI:

```bash
npx vercel
```

## Connect Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → paste and run `supabase/schema.sql`.
3. **SQL Editor** → paste and run `supabase/storage.sql` (creates the public **`logos`** bucket + policies).
4. **Settings → API** → copy Project URL and `anon` key.
5. Locally:

```bash
cp .env.example .env.local
# edit NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
```

6. On Vercel: Project → Settings → Environment Variables → same two keys.
7. Create users in Supabase Auth, then insert matching rows in `profiles` (`role` = `owner` or `retailer`, optional `retailer_id`).

Until env is set, the app stays in **demo mode** (no network required).

### Image / logo storage

| Mode | Behaviour |
|------|-----------|
| **Supabase configured** | Uploads go to Storage bucket `logos` under `brand/`, `games/`, `fastplay/`. Public URL is saved on brand / game records. |
| **Demo / offline** | Same upload UI; file is converted to a data URL and kept in localStorage (400 KB max). |

If the bucket is missing, the client falls back to a data URL so the UI never breaks.

Paths:

- `logos/brand/logo.<ext>`
- `logos/games/<game_id>.<ext>`
- `logos/fastplay/<id>.<ext>`

## HACS vs Vercel

| | HACS (HA panel) | This Vercel app |
|--|-----------------|-----------------|
| Host | Home Assistant | vercel.app |
| Storage | HA Store | Supabase / demo memory + **Storage for logos** |
| Owner UI | Back office (admin users) | `/office` (role=owner) |
| Retailer UI | Sell only | Sell + Reports + Support |
| Games | Same catalog (Diario, Corsow, Play Whe, …) | Ported |
| Bet types | 4 Cifra / Skina / … | Ported |

## Project layout

```
src/
  app/           # /, /sell, /office, /reports, /support
  components/    # Sell, Office, Reports, Support, Shell, Login
  lib/           # types, demo-data, store, supabase, storage (logos)
supabase/
  schema.sql     # tables + RLS for owner vs retailer
  storage.sql    # public logos bucket + policies
```

## Roadmap

- Wire Sell → `tickets` / `ticket_lines` inserts
- Supabase Auth (email or PIN + clerk)
- Thermal print / Web Bluetooth
- Results & winners tab (settle draws)
- Live reports from Postgres
- Persist brand / games / settings to Supabase (not only localStorage)

## License

Private prototype — adapt for your lottery operator.
