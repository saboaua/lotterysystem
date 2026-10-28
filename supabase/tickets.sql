-- Tickets + lines (run if not already applied via schema.sql)
-- Retailers must use UUID ids; profiles.retailer_id must reference retailers.id

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

create table if not exists public.games (
  id text primary key,
  name text not null,
  color text not null default '#6366f1',
  format text not null default 'digit',
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
  game_id text not null,
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

alter table public.tickets enable row level security;
alter table public.ticket_lines enable row level security;
alter table public.retailers enable row level security;
alter table public.games enable row level security;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'
  );
$$;

create or replace function public.my_retailer_id()
returns uuid language sql stable security definer set search_path = public as $$
  select retailer_id from public.profiles where id = auth.uid();
$$;

drop policy if exists "tickets read" on public.tickets;
create policy "tickets read" on public.tickets for select using (
  public.is_owner() or retailer_id = public.my_retailer_id()
);

drop policy if exists "tickets insert" on public.tickets;
create policy "tickets insert" on public.tickets for insert with check (
  public.is_owner() or retailer_id = public.my_retailer_id()
);

drop policy if exists "tickets update shop" on public.tickets;
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
) with check (
  exists (
    select 1 from public.tickets t where t.id = ticket_id and (
      public.is_owner() or t.retailer_id = public.my_retailer_id()
    )
  )
);

drop policy if exists "retailers read" on public.retailers;
create policy "retailers read" on public.retailers for select using (true);

drop policy if exists "games read all" on public.games;
create policy "games read all" on public.games for select using (true);

-- Example: one shop + link a retailer auth user (replace UUIDs)
-- insert into public.retailers (id, number, name) values
--   ('11111111-1111-1111-1111-111111111111', '001', 'Main Shop')
-- on conflict (id) do nothing;
-- update public.profiles set retailer_id = '11111111-1111-1111-1111-111111111111', role = 'retailer'
-- where email = 'main@shop.aw';
