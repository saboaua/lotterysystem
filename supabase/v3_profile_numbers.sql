-- Shoco Lottery POS — v3: editable own profile (name, email, address) + number control (sold-out numbers).
-- Run ONCE in Supabase > SQL Editor (safe to run again). Requires v2 (v2_audit_roles_ranking.sql) first.

/* ═══════════════ 1. Own profile details ═══════════════ */

alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists address_line text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists postal_code text;

-- A user may change ONLY these contact fields on their own profile (never role, status or shop link).
create or replace function public.update_my_profile(
  p_first text, p_last text, p_phone text, p_address text, p_city text, p_country text, p_postal text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  update public.profiles set
    first_name   = nullif(trim(p_first), ''),
    last_name    = nullif(trim(p_last), ''),
    phone        = nullif(trim(p_phone), ''),
    address_line = nullif(trim(p_address), ''),
    city         = nullif(trim(p_city), ''),
    country      = nullif(trim(p_country), ''),
    postal_code  = nullif(trim(p_postal), ''),
    name         = coalesce(
                     nullif(trim(concat_ws(' ', nullif(trim(p_first), ''), nullif(trim(p_last), ''))), ''),
                     name)
  where id = auth.uid();
end;
$$;
revoke all on function public.update_my_profile(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.update_my_profile(text, text, text, text, text, text, text) to authenticated;

-- Keep profiles.email in step when a user confirms a new login email.
create or replace function public.sync_profile_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.sync_profile_email();

/* ═══════════════ 2. Number control (sold-out numbers) ═══════════════ */

-- Rules are stored in the settings table under key 'blocked_numbers' (sellers can read, only
-- owner / staff with "numbers:edit" can change).
drop policy if exists "settings write" on public.settings;
create policy "settings write" on public.settings for all
  using (public.is_owner() or public.has_perm(case key
    when 'brand' then 'brand:edit'
    when 'ticket_design' then 'ticket:edit'
    when 'fast_play_games' then 'fastplay:edit'
    when 'broadcast' then 'broadcast:edit'
    when 'blocked_numbers' then 'numbers:edit'
    else 'settings:edit' end))
  with check (public.is_owner() or public.has_perm(case key
    when 'brand' then 'brand:edit'
    when 'ticket_design' then 'ticket:edit'
    when 'fast_play_games' then 'fastplay:edit'
    when 'broadcast' then 'broadcast:edit'
    when 'blocked_numbers' then 'numbers:edit'
    else 'settings:edit' end));

insert into public.settings (key, value) values ('blocked_numbers', '{"items": []}'::jsonb)
on conflict (key) do nothing;

-- Existing roles get the new area.
update public.staff_roles set permissions = (
  select array_agg(distinct x) from unnest(permissions || array['numbers:view','numbers:edit']) x
) where name in ('Manager', 'Operator');
update public.staff_roles set permissions = (
  select array_agg(distinct x) from unnest(permissions || array['numbers:view']) x
) where name in ('Support', 'Auditor');
