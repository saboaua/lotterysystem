-- Shoco Lottery POS — Supabase schema
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text not null default '',
  role text not null check (role in ('owner', 'retailer')) default 'retailer',
  retailer_id uuid,
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
  created_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now()
);

alter table public.profiles drop constraint if exists profiles_retailer_id_fkey;
alter table public.profiles add constraint profiles_retailer_id_fkey
  foreign key (retailer_id) references public.retailers(id) on delete set null;

create table if not exists public.bet_types (
  key text primary key,
  label text not null,
  multiplier numeric not null default 1,
  enabled boolean not null default true
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid not null references public.retailers(id),
  total numeric not null default 0,
  status text not null default 'sold',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.ticket_lines (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  game_id text not null references public.games(id),
  bet_type text not null,
  number text not null,
  amount numeric not null,
  draw_date date not null
);

create table if not exists public.clerks (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid not null references public.retailers(id) on delete cascade,
  name text not null,
  pin_hash text,
  active boolean not null default true
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid not null references public.retailers(id),
  subject text not null,
  body text not null default '',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.retailers enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_lines enable row level security;
alter table public.clerks enable row level security;
alter table public.support_tickets enable row level security;
alter table public.bet_types enable row level security;

create or replace function public.is_owner()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'
  );
$$;

create policy "profiles self" on public.profiles
  for select using (id = auth.uid() or public.is_owner());
create policy "games read all" on public.games for select using (true);
create policy "games owner write" on public.games for all using (public.is_owner());
create policy "retailers read" on public.retailers for select using (true);
create policy "retailers owner write" on public.retailers for all using (public.is_owner());
create policy "bet_types read" on public.bet_types for select using (true);
create policy "bet_types owner write" on public.bet_types for all using (public.is_owner());
create policy "tickets read" on public.tickets for select using (
  public.is_owner() or retailer_id = (select retailer_id from public.profiles where id = auth.uid())
);
create policy "tickets insert" on public.tickets for insert with check (
  public.is_owner() or retailer_id = (select retailer_id from public.profiles where id = auth.uid())
);
create policy "lines via ticket" on public.ticket_lines for all using (
  exists (
    select 1 from public.tickets t where t.id = ticket_id and (
      public.is_owner() or t.retailer_id = (select retailer_id from public.profiles where id = auth.uid())
    )
  )
);
create policy "clerks shop" on public.clerks for all using (
  public.is_owner() or retailer_id = (select retailer_id from public.profiles where id = auth.uid())
);
create policy "support shop" on public.support_tickets for all using (
  public.is_owner() or retailer_id = (select retailer_id from public.profiles where id = auth.uid())
);
