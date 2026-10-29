-- Shoco Lottery POS — run ONCE in the Supabase SQL editor (idempotent).
-- Adds the columns / policies the app needs to save and load everything from Supabase.

-- Games: extra settings (prize tiers, tokens, jackpot rules, ...) live in one jsonb column.
alter table public.games add column if not exists config jsonb not null default '{}'::jsonb;
alter table public.games drop constraint if exists games_format_check;

-- Draw results: jackpot bookkeeping.
alter table public.draw_results add column if not exists jackpot_at_draw numeric;
alter table public.draw_results add column if not exists jackpot_next numeric;
alter table public.draw_results add column if not exists jackpot_won boolean;

-- Retailers: account status + presence.
alter table public.retailers add column if not exists status text;
alter table public.retailers add column if not exists last_seen timestamptz;
alter table public.retailers add column if not exists last_ack timestamptz;

-- Top ups: demo flag, and a retailer may update its own rows (status after the player API call).
alter table public.topups add column if not exists demo boolean not null default false;
drop policy if exists "topups retailer update own" on public.topups;
create policy "topups retailer update own" on public.topups
  for update using (retailer_id = public.my_retailer_id())
  with check (retailer_id = public.my_retailer_id());

-- Sellers report presence without write access to the retailers table.
create or replace function public.ping_retailer()
returns void language sql security definer set search_path = public as $$
  update public.retailers
     set last_seen = now(), last_ack = now()
   where id = public.my_retailer_id();
$$;
grant execute on function public.ping_retailer() to authenticated;

-- Make sure the singleton settings rows used by the app exist.
insert into public.settings (key, value) values
  ('fast_play_games', '{"items": []}'::jsonb),
  ('broadcast', '{"message": null}'::jsonb)
on conflict (key) do nothing;
