-- Supabase Storage: public logos bucket for brand / game / fast-play images
-- Run this in the SQL Editor after schema.sql (or together with it).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos',
  'logos',
  true,
  409600,  -- 400 KB
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read (anyone can display logos on tickets / sell screen)
drop policy if exists "logos public read" on storage.objects;
create policy "logos public read"
  on storage.objects for select
  using (bucket_id = 'logos');

-- Authenticated users can upload/update (owner back-office)
drop policy if exists "logos auth upload" on storage.objects;
create policy "logos auth upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'logos');

drop policy if exists "logos auth update" on storage.objects;
create policy "logos auth update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'logos')
  with check (bucket_id = 'logos');

drop policy if exists "logos auth delete" on storage.objects;
create policy "logos auth delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'logos');

-- Optional: restrict writes to owner role only (uncomment if you prefer)
-- drop policy if exists "logos auth upload" on storage.objects;
-- drop policy if exists "logos auth update" on storage.objects;
-- drop policy if exists "logos auth delete" on storage.objects;
-- create policy "logos owner write" on storage.objects for all to authenticated
--   using (bucket_id = 'logos' and public.is_owner())
--   with check (bucket_id = 'logos' and public.is_owner());
