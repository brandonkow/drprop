-- Minimal Storage catalog for local SQL tests only; not a substitute for hosted Storage.
create role service_role bypassrls;
alter table auth.users add column banned_until timestamptz;
create schema storage;
grant usage on schema storage to anon,authenticated,service_role;
create table storage.buckets (
  id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text
);
alter table storage.objects enable row level security;
grant select,insert,update,delete on storage.objects to anon,authenticated,service_role;
grant select on storage.buckets to authenticated,service_role;
