# Shoco Lottery POS (Tablet)

Standalone **tablet lottery point-of-sale** for Aruba — outside Home Assistant / HACS.

| Layer | Stack |
|-------|--------|
| UI | Next.js 15 (App Router) + Tailwind CSS v4 |
| Hosting | [Vercel](https://vercel.com) |
| Data / Auth | [Supabase](https://supabase.com) (Postgres + Auth + RLS) |
| Offline demo | In-memory demo data (no keys required) |

## Features (prototype)

- **Sell (POS)** — game picker, bet types, keypad, ticket list, Sell
- **Quick pick, clear, report, clerks, support ticket** on the sell bar
- **Back office (owner only)** — games schedule, 20 Aruba retailers, SVG map, reports
- **Roles** — Owner sees Back office; Retailer locked to Sell + own shop
- **Dark / light** theme toggle
- **Readable list rows** (fixed purple-on-text issue from the HA panel)

## Quick start (demo mode)

```bash
cd lottery-pos-tablet
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Pick a demo user:

| User | Role |
|------|------|
| Lottery Owner | Full back office + sell |
| Carlos Croes (Main Shop) | Retailer POS only |
| Maria Frans (Lucky Shoco) | Retailer POS only |

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. [vercel.com/new](https://vercel.com/new) → import the repo.
3. Framework: **Next.js** (auto-detected).
4. Add env vars when you connect Supabase (see below).
5. Deploy.

Or CLI:

```bash
npx vercel
```

## Connect Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → paste and run `supabase/schema.sql`.
3. **Settings → API** → copy Project URL and `anon` key.
4. Locally:

```bash
cp .env.example .env.local
# edit NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
```

5. On Vercel: Project → Settings → Environment Variables → same two keys.

6. Create users in Supabase Auth, then insert matching rows in `profiles` (`role` = `owner` or `retailer`, optional `retailer_id`).

Until env is set, the app stays in **demo mode** (no network required).

## Tablet tips

- Add to Home Screen (Safari / Chrome) for full-screen kiosk feel.
- Viewport is locked to scale 1 for POS touch accuracy.
- Landscape 10" tablets work best for the two-column Sell layout.

## Project layout

```
src/
  app/           # routes: /, /sell, /office
  components/    # SellScreen, OfficeScreen, Shell, Login
  lib/           # types, demo-data, store, supabase client
supabase/
  schema.sql     # tables + RLS for owner vs retailer
```

## Roadmap (next)

- Wire Sell → `tickets` / `ticket_lines` inserts
- Supabase Auth (email or PIN + clerk)
- Thermal print / Web Bluetooth
- Live reports from Postgres
- Zodiac / Play Whe / jackpot pickers (ported from HA panel)

## License

Private prototype — adapt for your lottery operator.
