-- Shoco Lottery POS — full schema aligned with HACS lottery_pos v0.10
create extension if not exists "pgcrypto";

-- ── Profiles (extends Supabase auth.users) ──────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text not null default '',
  role text not null check (role in ('owner', 'retailer')) default 'retailer',
  retailer_id uuid,
  username text unique,
  password_hash text,
  failed_logins int not null default 0,
  locked_until timestamptz,
  must_change_password boolean not null default false,
  last_login timestamptz,
  created_at timestamptz not null default now()
);

-- ── Retailers ───────────────────────────────────────────────────────
create table if not exists public.retailers (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  name text not null,
  first_name text,
  last_name text,
  address text,
  phone text,
  commission_sell numeric not null default 10,
  commission_redeem numeric not null default 0,
  active boolean not null default true,
  lat double precision,
  lng double precision,
  username text unique,
  password_hash text,
  created_at timestamptz not null default now()
);

alter table public.profiles drop constraint if exists profiles_retailer_id_fkey;
alter table public.profiles
  add constraint profiles_retailer_id_fkey
  foreign key (retailer_id) references public.retailers(id) on delete set null;

-- ── Games ───────────────────────────────────────────────────────────
create table if not exists public.games (
  id text primary key,
  name text not null,
  color text not null default '#6366f1',
  format text not null default 'digit' check (format in ('digit','zodiac','whe','jackpot')),
  digits int,
  draw_time text not null default '13:00',
  cutoff text not null default '12:45',
  enabled boolean not null default true,
  draw_days int[],
  jackpot_current numeric,
  main_count int,
  main_max int,
  mega_count int,
  mega_max int,
  logo text,
  min_stake numeric,
  max_stake numeric,
  bet_types text[],
  sessions jsonb default '[]'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ── Bet types ───────────────────────────────────────────────────────
create table if not exists public.bet_types (
  key text primary key,
  label text not null,
  digits int not null default 0,
  mode text not null default 'exact',
  multiplier numeric not null default 1,
  enabled boolean not null default true,
  min_stake numeric default 0.5,
  max_stake numeric default 100
);

-- ── Tickets ─────────────────────────────────────────────────────────
create table if not exists public.tickets (
  id text primary key,
  retailer_id uuid not null references public.retailers(id),
  total numeric not null default 0,
  status text not null default 'sold'
    check (status in ('sold','cancelled','won','paid','void')),
  prize numeric,
  promo_code text,
  promo_id text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  cancelled_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by uuid references public.retailers(id)
);

create table if not exists public.ticket_lines (
  id uuid primary key default gen_random_uuid(),
  ticket_id text not null references public.tickets(id) on delete cascade,
  game_id text not null references public.games(id),
  bet_type text not null,
  number text not null,
  amount numeric not null,
  draw_date date not null,
  session text,
  symbols text[],
  balls int[],
  mega int,
  prize numeric,
  status text default 'open'
);

create index if not exists idx_ticket_lines_ticket on public.ticket_lines(ticket_id);
create index if not exists idx_tickets_retailer_created on public.tickets(retailer_id, created_at desc);
create index if not exists idx_tickets_promo on public.tickets(promo_code) where promo_code is not null;

-- ── Draw results ────────────────────────────────────────────────────
create table if not exists public.draw_results (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id),
  draw_date date not null,
  session text,
  first text,
  second text,
  third text,
  balls int[],
  mega int,
  zodiac text,
  whe int,
  source text default 'manual',
  created_at timestamptz not null default now(),
  unique (game_id, draw_date, session)
);

-- ── Holidays / no-draw days ─────────────────────────────────────────
create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  name text not null,
  note text
);

-- ── Promotions ──────────────────────────────────────────────────────
create table if not exists public.promotions (
  id text primary key,
  name text not null,
  label text not null default '',
  instruction text not null default '',
  code_len int not null default 6,
  min_plays int,
  min_games int,
  min_amount numeric,
  game_ids text[],
  prize numeric,
  prizes jsonb default '[]'::jsonb,
  active boolean not null default false,
  start_at timestamptz,
  end_at timestamptz,
  url text,
  created_at timestamptz not null default now()
);

create table if not exists public.promo_codes (
  code text primary key,
  promotion_id text not null references public.promotions(id) on delete cascade,
  ticket_id text references public.tickets(id),
  retailer_id uuid references public.retailers(id),
  status text not null default 'issued'
    check (status in ('issued','claimed','won','expired')),
  prize_amount numeric,
  prize_label text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

-- ── Branding / ticker / ticket design (singleton rows) ──────────────
create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.settings (key, value) values
  ('brand', '{"name":"Shoco Lottery POS","tagline":"Aruba · Play responsibly","led_message":"Welcome! Thanks for choosing Shoco Lottery","led_on":true,"led_speed":40,"led_color":"#22c55e"}'::jsonb),
  ('ticket_design', '{"font":"mono","size":12,"width":72,"align":"center","header":"","footer":"Good luck!","show_logo":true,"logo_height":40,"show_name":true,"show_retailer":true,"show_barcode":true,"show_qr":false,"bold_total":true}'::jsonb),
  ('sales', '{"currency":"AWG","min_stake":0.25,"max_stake":500,"allow_multi_draw":true,"max_multi_draw":14}'::jsonb)
on conflict (key) do nothing;

-- ── Clerks ──────────────────────────────────────────────────────────
create table if not exists public.clerks (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid not null references public.retailers(id) on delete cascade,
  name text not null,
  pin_hash text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Support tickets ─────────────────────────────────────────────────
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid not null references public.retailers(id),
  subject text not null,
  body text not null default '',
  status text not null default 'open'
    check (status in ('open','in_progress','closed')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  resolved_at timestamptz
);

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.retailers enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_lines enable row level security;
alter table public.clerks enable row level security;
alter table public.support_tickets enable row level security;
alter table public.bet_types enable row level security;
alter table public.draw_results enable row level security;
alter table public.holidays enable row level security;
alter table public.promotions enable row level security;
alter table public.promo_codes enable row level security;
alter table public.settings enable row level security;

create or replace function public.is_owner()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'
  );
$$;

create or replace function public.my_retailer_id()
returns uuid language sql stable security definer as $$
  select retailer_id from public.profiles where id = auth.uid();
$$;

drop policy if exists "profiles self" on public.profiles;
create policy "profiles self" on public.profiles
  for select using (id = auth.uid() or public.is_owner());
create policy "profiles owner write" on public.profiles
  for all using (public.is_owner());

drop policy if exists "games read all" on public.games;
create policy "games read all" on public.games for select using (true);
create policy "games owner write" on public.games for all using (public.is_owner());

drop policy if exists "retailers read" on public.retailers;
create policy "retailers read" on public.retailers for select using (true);
create policy "retailers owner write" on public.retailers for all using (public.is_owner());

drop policy if exists "bet_types read" on public.bet_types;
create policy "bet_types read" on public.bet_types for select using (true);
create policy "bet_types owner write" on public.bet_types for all using (public.is_owner());

drop policy if exists "tickets read" on public.tickets;
create policy "tickets read" on public.tickets for select using (
  public.is_owner() or retailer_id = public.my_retailer_id()
);
create policy "tickets insert" on public.tickets for insert with check (
  public.is_owner() or retailer_id = public.my_retailer_id()
);
create policy "tickets update shop" on public.tickets for update using (
  public.is_owner() or retailer_id = public.my_retailer_id()
);

drop policy if exists "lines via ticket" on public.ticket_lines;
create policy "lines via ticket" on public.ticket_lines for all using (
  exists (
    select 1 from public.tickets t where t.id = ticket_id and (
      public.is_owner() or t.retailer_id = public.my_retailer_id()
    )
  )
);

drop policy if exists "clerks shop" on public.clerks;
create policy "clerks shop" on public.clerks for all using (
  public.is_owner() or retailer_id = public.my_retailer_id()
);

drop policy if exists "support shop" on public.support_tickets;
create policy "support shop" on public.support_tickets for all using (
  public.is_owner() or retailer_id = public.my_retailer_id()
);

create policy "results read" on public.draw_results for select using (true);
create policy "results owner write" on public.draw_results for all using (public.is_owner());

create policy "holidays read" on public.holidays for select using (true);
create policy "holidays owner write" on public.holidays for all using (public.is_owner());

create policy "promos read" on public.promotions for select using (true);
create policy "promos owner write" on public.promotions for all using (public.is_owner());

create policy "promo_codes read owner" on public.promo_codes for select using (public.is_owner());
create policy "promo_codes insert shop" on public.promo_codes for insert with check (
  public.is_owner() or retailer_id = public.my_retailer_id()
);

create policy "settings read" on public.settings for select using (true);
create policy "settings owner write" on public.settings for all using (public.is_owner());

-- ── Seed bet types (HACS defaults) ──────────────────────────────────
insert into public.bet_types (key, label, digits, mode, multiplier, enabled, min_stake, max_stake) values
  ('4_cifra',    '4 Cifra',     4, 'exact',   5000, true, 0.5, 100),
  ('3_cifra',    '3 Cifra',     3, 'exact',    500, true, 0.5, 100),
  ('2_cifra_3ch','2 Cifra 3CH', 2, 'chances',   20, true, 0.5,  50),
  ('4_skina',    '4 Skina',     4, 'perm',     200, true, 0.5, 100),
  ('3_skina',    '3 Skina',     3, 'perm',      80, true, 0.5, 100),
  ('2_cifra_bf', '2 Cifra B/F', 2, 'bf',        40, true, 0.5,  50),
  ('2_cifra_b',  '2 Cifra B',   2, 'back',      70, true, 0.5,  50),
  ('zodiac',     'Zodiac',      2, 'zodiac',    50, true, 1.0,  50),
  ('play_whe',   'Play Whe',    2, 'whe',       24, true, 1.0, 100),
  ('jackpot',    'Jackpot',     0, 'jackpot',    1, true, 1.0,  20)
on conflict (key) do nothing;

-- ── Seed games (HACS defaults) ──────────────────────────────────────
insert into public.games (id, name, color, format, digits, draw_time, cutoff, enabled, bet_types, sessions, sort_order) values
  ('diario',   'Diario',      '#22c55e', 'digit',  4, '13:00', '12:45', true,
   array['4_cifra','3_cifra','2_cifra_3ch','4_skina','3_skina','2_cifra_bf','2_cifra_b'], '[]', 1),
  ('corsow',   'Corsow',      '#f59e0b', 'digit',  4, '17:00', '16:45', true,
   array['4_cifra','3_cifra','2_cifra_3ch','4_skina','3_skina','2_cifra_bf','2_cifra_b'], '[]', 2),
  ('super4',   'Super-4',     '#3b82f6', 'digit',  4, '13:00', '12:45', true,
   array['4_cifra','3_cifra','2_cifra_3ch','4_skina','3_skina','2_cifra_bf','2_cifra_b'], '[]', 3),
  ('flamingo', 'Flamingo',    '#a855f7', 'digit',  4, '14:00', '13:45', true,
   array['4_cifra','3_cifra','2_cifra_3ch','4_skina','3_skina','2_cifra_bf','2_cifra_b'], '[]', 4),
  ('philb',    'Phillipsburg','#84cc16', 'digit',  4, '11:00', '10:45', true,
   array['4_cifra','3_cifra','2_cifra_3ch','4_skina','3_skina','2_cifra_bf','2_cifra_b'],
   '[{"id":"am","label":"AM","draw_time":"11:00","cutoff":"10:45"},{"id":"pm","label":"PM","draw_time":"19:00","cutoff":"18:45"}]'::jsonb, 5),
  ('lottomac', 'Lotto Mac',   '#64748b', 'jackpot', null, '18:45', '18:15', true,
   array['jackpot'], '[]', 6),
  ('zodiaco',  'Zodiaco',     '#1e3a8a', 'zodiac', 2, '18:45', '18:30', true,
   array['zodiac'], '[]', 7),
  ('playwhe',  'Play Whe',    '#e11d48', 'whe',    2, '10:30', '10:15', true,
   array['play_whe'],
   '[{"id":"morning","label":"Morning","draw_time":"10:30","cutoff":"10:15"},{"id":"midday","label":"Midday","draw_time":"13:00","cutoff":"12:45"},{"id":"afternoon","label":"Afternoon","draw_time":"16:00","cutoff":"15:45"},{"id":"evening","label":"Evening","draw_time":"19:00","cutoff":"18:45"}]'::jsonb, 8)
on conflict (id) do nothing;

update public.games set jackpot_current = 150000, main_count = 5, main_max = 30, mega_count = 1, mega_max = 10
  where id = 'lottomac';
