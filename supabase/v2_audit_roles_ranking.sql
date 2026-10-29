-- Shoco Lottery POS — v2: seller ranking privacy, staff roles & permissions, audit trail.
-- Run ONCE in Supabase > SQL Editor (safe to run again). Requires setup_all.sql to be run first.

/* ═══════════════ 1. Seller ranking: positions only, never other shops' sales ═══════════════ */

create or replace function public.my_rank(p_start timestamptz, p_end timestamptz)
returns table(pos int, total int)
language sql stable security definer set search_path = public as $$
  with sales as (
    select r.id, coalesce(sum(t.total) filter (where t.status not in ('cancelled','void')), 0) as s
    from public.retailers r
    left join public.tickets t
      on t.retailer_id = r.id and t.created_at > p_start and t.created_at <= p_end
    where r.active
    group by r.id
  ), ranked as (
    select id, (rank() over (order by s desc))::int as rk from sales
  )
  select rk, (select count(*)::int from ranked)
  from ranked where id = public.my_retailer_id();
$$;

create or replace function public.my_peak_rank(p_start timestamptz, p_end timestamptz)
returns int
language sql stable security definer set search_path = public as $$
  with cap as (select least(now(), p_end) as c),
  ends as (
    select distinct least(g, (select c from cap)) as e
    from generate_series(p_start + interval '1 day', p_end + interval '1 day', interval '1 day') g
    where g - interval '1 day' < (select c from cap)
  ),
  per as (
    select e.e, t.retailer_id, sum(t.total) as s
    from ends e
    join public.tickets t
      on t.created_at > p_start and t.created_at <= e.e and t.status not in ('cancelled','void')
    join public.retailers r on r.id = t.retailer_id and r.active
    group by e.e, t.retailer_id
  ), ranked as (
    select e, retailer_id, rank() over (partition by e order by s desc) as rk from per
  )
  select min(rk)::int from ranked where retailer_id = public.my_retailer_id();
$$;

revoke all on function public.my_rank(timestamptz, timestamptz) from public, anon;
revoke all on function public.my_peak_rank(timestamptz, timestamptz) from public, anon;
grant execute on function public.my_rank(timestamptz, timestamptz) to authenticated;
grant execute on function public.my_peak_rank(timestamptz, timestamptz) to authenticated;

/* ═══════════════ 2. Staff roles & permissions ═══════════════ */

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('owner', 'staff', 'retailer'));
alter table public.profiles add column if not exists staff_role_id uuid;
alter table public.profiles add column if not exists active boolean not null default true;

create table if not exists public.staff_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  permissions text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.profiles drop constraint if exists profiles_staff_role_fk;
alter table public.profiles
  add constraint profiles_staff_role_fk
  foreign key (staff_role_id) references public.staff_roles(id) on delete set null;

-- True for the owner, or for an active staff member whose role grants permission `p`
-- (permission keys look like 'games:edit', 'reports:view', 'audit:view').
create or replace function public.has_perm(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when pr.role = 'owner' then true
      when pr.role = 'staff' and pr.active then exists (
        select 1 from public.staff_roles r where r.id = pr.staff_role_id and p = any (r.permissions)
      )
      else false
    end
    from public.profiles pr where pr.id = auth.uid()
  ), false);
$$;

alter table public.staff_roles enable row level security;
drop policy if exists "staff_roles read" on public.staff_roles;
create policy "staff_roles read" on public.staff_roles for select to authenticated using (true);
drop policy if exists "staff_roles owner write" on public.staff_roles;
create policy "staff_roles owner write" on public.staff_roles for all using (public.is_owner());

insert into public.staff_roles (name, description, permissions) values
  ('Manager', 'Runs the back office day to day (everything except staff and audit).',
   array['games:view','games:edit','fastplay:view','fastplay:edit','schedule:view','schedule:edit',
         'brand:view','brand:edit','broadcast:view','broadcast:edit','ticket:view','ticket:edit',
         'promos:view','promos:edit','results:view','results:edit','reports:view',
         'retailers:view','retailers:edit','isp:view']),
  ('Operator', 'Enters draw results and manages the draw calendar.',
   array['games:view','schedule:view','schedule:edit','results:view','results:edit','reports:view']),
  ('Support', 'Helps retailers: can view retailers and reports and send broadcasts.',
   array['retailers:view','reports:view','broadcast:view','broadcast:edit','games:view','results:view']),
  ('Auditor', 'Read-only access including the audit trail.',
   array['audit:view','reports:view','results:view','games:view','retailers:view','promos:view','schedule:view'])
on conflict (name) do nothing;

-- Write access now follows permissions (owner always allowed).
drop policy if exists "games owner write" on public.games;
drop policy if exists "games write" on public.games;
create policy "games write" on public.games for all
  using (public.is_owner() or public.has_perm('games:edit'))
  with check (public.is_owner() or public.has_perm('games:edit'));

drop policy if exists "bet_types owner write" on public.bet_types;
drop policy if exists "bet_types write" on public.bet_types;
create policy "bet_types write" on public.bet_types for all
  using (public.is_owner() or public.has_perm('games:edit'))
  with check (public.is_owner() or public.has_perm('games:edit'));

drop policy if exists "results owner write" on public.draw_results;
drop policy if exists "results write" on public.draw_results;
create policy "results write" on public.draw_results for all
  using (public.is_owner() or public.has_perm('results:edit'))
  with check (public.is_owner() or public.has_perm('results:edit'));

drop policy if exists "holidays owner write" on public.holidays;
drop policy if exists "holidays write" on public.holidays;
create policy "holidays write" on public.holidays for all
  using (public.is_owner() or public.has_perm('schedule:edit'))
  with check (public.is_owner() or public.has_perm('schedule:edit'));

drop policy if exists "promos owner write" on public.promotions;
drop policy if exists "promos write" on public.promotions;
create policy "promos write" on public.promotions for all
  using (public.is_owner() or public.has_perm('promos:edit'))
  with check (public.is_owner() or public.has_perm('promos:edit'));

drop policy if exists "retailers owner write" on public.retailers;
drop policy if exists "retailers write" on public.retailers;
create policy "retailers write" on public.retailers for all
  using (public.is_owner() or public.has_perm('retailers:edit'))
  with check (public.is_owner() or public.has_perm('retailers:edit'));

drop policy if exists "settings owner write" on public.settings;
drop policy if exists "settings write" on public.settings;
create policy "settings write" on public.settings for all
  using (public.is_owner() or public.has_perm(case key
    when 'brand' then 'brand:edit'
    when 'ticket_design' then 'ticket:edit'
    when 'fast_play_games' then 'fastplay:edit'
    when 'broadcast' then 'broadcast:edit'
    else 'settings:edit' end))
  with check (public.is_owner() or public.has_perm(case key
    when 'brand' then 'brand:edit'
    when 'ticket_design' then 'ticket:edit'
    when 'fast_play_games' then 'fastplay:edit'
    when 'broadcast' then 'broadcast:edit'
    else 'settings:edit' end));

-- Staff with reports access can read tickets, their lines and top ups (read only).
drop policy if exists "tickets read" on public.tickets;
create policy "tickets read" on public.tickets for select using (
  public.is_owner() or public.has_perm('reports:view') or retailer_id = public.my_retailer_id()
);
drop policy if exists "lines staff read" on public.ticket_lines;
create policy "lines staff read" on public.ticket_lines for select using (public.has_perm('reports:view'));
drop policy if exists "topups staff read" on public.topups;
create policy "topups staff read" on public.topups for select using (public.has_perm('reports:view'));

/* ═══════════════ 3. Audit trail (append-only) ═══════════════ */

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor_id uuid,
  actor_name text not null default '',
  actor_email text,
  actor_role text,
  action text not null,
  entity text,
  entity_id text,
  summary text not null default '',
  details jsonb not null default '{}'::jsonb
);
create index if not exists idx_audit_at on public.audit_log (at desc);
create index if not exists idx_audit_actor on public.audit_log (actor_id, at desc);
create index if not exists idx_audit_entity on public.audit_log (entity, at desc);

-- The database (not the browser) stamps who did it and when, so entries cannot be forged.
create or replace function public.audit_fill()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if auth.uid() is not null then
    select name, email, role into p from public.profiles where id = auth.uid();
    new.actor_id := auth.uid();
    new.actor_name := coalesce(nullif(p.name, ''), p.email, 'user');
    new.actor_email := p.email;
    new.actor_role := p.role;
  end if;
  new.at := now();
  return new;
end;
$$;
drop trigger if exists audit_fill_trg on public.audit_log;
create trigger audit_fill_trg before insert on public.audit_log
  for each row execute function public.audit_fill();

alter table public.audit_log enable row level security;
drop policy if exists "audit insert" on public.audit_log;
create policy "audit insert" on public.audit_log for insert to authenticated with check (true);
drop policy if exists "audit read" on public.audit_log;
create policy "audit read" on public.audit_log for select using (
  public.is_owner() or public.has_perm('audit:view')
);
-- No update / delete policies and no grants: entries can never be edited or removed from the app.
revoke update, delete on public.audit_log from anon, authenticated;
