-- Private case delivery. Storage is accessed only through an authenticated gateway.
-- Existing migrations remain unchanged. No retention duration or payment policy is invented.
begin;

create table public.dp_cases (
  id uuid primary key references public.dp_bookings(id),
  status text not null default 'open' check (status in ('open', 'closed', 'erasure_pending', 'erased')),
  retention_until timestamptz,
  created_at timestamptz not null default now(),
  erased_at timestamptz
);
insert into public.dp_cases(id) select id from public.dp_bookings;
create function dp_private.create_case() returns trigger
language plpgsql security definer set search_path = '' as $$
begin insert into public.dp_cases(id) values (new.id); return new; end $$;
revoke all on function dp_private.create_case() from public, anon, authenticated;
create trigger dp_booking_case after insert on public.dp_bookings
for each row execute function dp_private.create_case();

create table public.dp_case_files (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.dp_cases(id),
  request_id uuid not null,
  uploader_id uuid not null references auth.users(id),
  kind text not null check (kind in ('source', 'diagnosis')),
  name text not null check (length(name) between 1 and 120 and name !~ '[[:cntrl:]/\\]'),
  mime text not null check (mime in ('application/pdf', 'image/jpeg', 'image/png')),
  byte_size integer not null check (byte_size between 1 and 6291456),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  -- Random server-generated identifiers only; no client file names in paths.
  storage_key text not null unique default gen_random_uuid()::text,
  state text not null default 'uploading' check (state in ('uploading', 'ready', 'failed', 'removed')),
  created_at timestamptz not null default now(),
  write_lease_until timestamptz not null default now()+interval '15 minutes',
  unique (case_id, request_id)
);
create index dp_case_files_case on public.dp_case_files(case_id, created_at);

create table public.dp_diagnoses (
  id uuid primary key,
  case_id uuid not null references public.dp_cases(id),
  version integer not null check (version > 0),
  revision integer not null default 1 check (revision > 0),
  state text not null default 'draft' check (state in ('draft', 'review', 'published', 'erased')),
  content jsonb not null,
  source_snapshot jsonb not null default '[]',
  external_sources text not null default '' check (length(external_sources) <= 8000),
  author_id uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  pdf_file_id uuid unique references public.dp_case_files(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, version),
  check (state <> 'published' or (pdf_file_id is not null and reviewed_by is not null and published_at is not null))
);
create unique index dp_one_diagnosis_draft on public.dp_diagnoses(case_id) where state in ('draft', 'review');

create table public.dp_case_events (
  id bigint generated always as identity primary key,
  case_id uuid not null references public.dp_cases(id),
  actor_id uuid references auth.users(id),
  event text not null,
  object_id uuid,
  occurred_at timestamptz not null default now()
);
create index dp_case_events_case on public.dp_case_events(case_id, id);
-- Every generated object is registered before Storage writes, including failed attempts.
create table dp_private.case_artifacts (
  storage_key text primary key,
  case_id uuid not null references public.dp_cases(id),
  diagnosis_id uuid not null references public.dp_diagnoses(id),
  revision integer not null,
  actor_id uuid not null references auth.users(id),
  expires_at timestamptz not null default now()+interval '15 minutes'
);
revoke all on dp_private.case_artifacts from public,anon,authenticated;
create table dp_private.case_downloads (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  file_id uuid not null references public.dp_case_files(id),
  actor_id uuid not null references auth.users(id),
  expires_at timestamptz not null default now() + interval '60 seconds'
);
revoke all on dp_private.case_downloads from public, anon, authenticated;

-- Service helpers receive the identity verified by the gateway, never a request body identity.
create function dp_private.case_access_as(p_case uuid, p_actor uuid, p_staff boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.dp_cases c join public.dp_bookings b on b.id=c.id
    join auth.users u on u.id=p_actor and u.phone_confirmed_at is not null
      and (u.banned_until is null or u.banned_until<=now())
    where c.id=p_case and c.status in ('open','closed')
      and (c.retention_until is null or c.retention_until > now())
      and ((not p_staff and b.user_id=p_actor)
        or (b.adviser_id=p_actor and dp_private.active_adviser(p_actor)))
  )
$$;
revoke all on function dp_private.case_access_as(uuid,uuid,boolean) from public, anon, authenticated;
create function dp_private.case_access(p_case uuid, p_staff boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select dp_private.case_access_as(p_case, auth.uid(), p_staff)
$$;
revoke all on function dp_private.case_access(uuid,boolean) from public, anon, authenticated;
grant execute on function dp_private.case_access(uuid,boolean) to authenticated;

create function dp_private.case_writer(p_case uuid, p_staff boolean default false) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := dp_private.actor();
begin
  -- Serialize per case: quotas, version numbering, review and erasure cannot race.
  perform 1 from public.dp_cases where id=p_case for update;
  if not dp_private.case_access_as(p_case,actor,p_staff)
    or not exists(select 1 from public.dp_cases c join public.dp_bookings b on b.id=c.id
      where c.id=p_case and c.status='open' and b.status<>'cancelled') then
    raise exception 'This case is not available for changes' using errcode='42501';
  end if;
  return actor;
end $$;
revoke all on function dp_private.case_writer(uuid,boolean) from public, anon, authenticated;

alter table public.dp_cases enable row level security;
alter table public.dp_case_files enable row level security;
alter table public.dp_diagnoses enable row level security;
alter table public.dp_case_events enable row level security;
revoke all on public.dp_cases,public.dp_case_files,public.dp_diagnoses,public.dp_case_events from public,anon,authenticated;
grant select on public.dp_cases,public.dp_case_files,public.dp_diagnoses,public.dp_case_events to authenticated;
create policy dp_case_read on public.dp_cases for select to authenticated using (dp_private.case_access(id));
create policy dp_diagnosis_read on public.dp_diagnoses for select to authenticated
using (dp_private.case_access(case_id) and (state='published' or dp_private.case_access(case_id,true)));
create policy dp_file_read on public.dp_case_files for select to authenticated using (
  dp_private.case_access(case_id) and state<>'removed' and
  (kind='source' or dp_private.case_access(case_id,true) or exists(
    select 1 from public.dp_diagnoses d where d.pdf_file_id=dp_case_files.id and d.state='published'))
);
-- Clients see their own activity and publication, not unpublished draft activity.
create policy dp_case_event_read on public.dp_case_events for select to authenticated using (
  dp_private.case_access(case_id) and (actor_id=auth.uid() or event='published' or dp_private.case_access(case_id,true))
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('dp-case-files','dp-case-files',false,6291456,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- Restrictive policy also defeats permissive policies intended for other buckets.
create policy dp_case_gateway_only on storage.objects as restrictive for all to anon,authenticated
using (bucket_id <> 'dp-case-files') with check (bucket_id <> 'dp-case-files');

create function public.dp_reserve_document(p_case uuid,p_request uuid,p_name text,p_mime text,p_size integer,p_hash text)
returns public.dp_case_files language plpgsql security definer set search_path = '' as $$
declare actor uuid := dp_private.case_writer(p_case); result public.dp_case_files;
begin
  select * into result from public.dp_case_files where case_id=p_case and request_id=p_request for update;
  if found then
    if result.uploader_id<>actor or result.kind<>'source' or result.name is distinct from p_name
      or result.mime is distinct from p_mime or result.byte_size is distinct from p_size or result.sha256 is distinct from p_hash then
      raise exception 'Upload request already used with different details' using errcode='22023';
    end if;
    if result.state='removed' then raise exception 'This document was removed'; end if;
    if result.state in ('failed','uploading') then
      update public.dp_case_files set state='uploading',write_lease_until=now()+interval '15 minutes' where id=result.id returning * into result;
    end if;
    return result;
  end if;
  if (select count(*) from public.dp_case_files where case_id=p_case and kind='source' and state<>'removed')>=20 then
    raise exception 'A case can hold at most 20 source documents' using errcode='22023';
  end if;
  insert into public.dp_case_files(case_id,request_id,uploader_id,kind,name,mime,byte_size,sha256)
    values(p_case,p_request,actor,'source',p_name,p_mime,p_size,p_hash) returning * into result;
  insert into public.dp_case_events(case_id,actor_id,event,object_id) values(p_case,actor,'upload_reserved',result.id);
  return result;
end $$;

-- Service-only. Bytes must already be validated and stored under storage_key.
create function public.dp_finish_document(p_file uuid,p_actor uuid,p_hash text,p_size integer,p_success boolean)
returns public.dp_case_files language plpgsql security definer set search_path = '' as $$
declare result public.dp_case_files;
begin
  perform 1 from public.dp_cases where id=(select case_id from public.dp_case_files where id=p_file) for update;
  select * into result from public.dp_case_files where id=p_file for update;
  if not found or result.kind<>'source' or result.uploader_id<>p_actor
     or not dp_private.case_access_as(result.case_id,p_actor)
     or not exists(select 1 from public.dp_cases c join public.dp_bookings b on b.id=c.id
       where c.id=result.case_id and c.status='open' and b.status<>'cancelled') then
    raise exception 'Upload access denied' using errcode='42501'; end if;
  if result.sha256 is distinct from p_hash or result.byte_size is distinct from p_size then raise exception 'Uploaded bytes do not match the reservation'; end if;
  if result.state='ready' then return result; end if;
  if result.state not in ('uploading','failed') then raise exception 'Upload no longer available'; end if;
  update public.dp_case_files set state=case when p_success then 'ready' else 'failed' end where id=p_file returning * into result;
  insert into public.dp_case_events(case_id,actor_id,event,object_id)
    values(result.case_id,p_actor,case when p_success then 'upload_ready' else 'upload_failed' end,p_file);
  return result;
end $$;

-- Clients may release failed or abandoned reservations; ready source documents remain provenance.
create function public.dp_discard_upload(p_file uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare f public.dp_case_files; actor uuid;
begin
  select * into f from public.dp_case_files where id=p_file;
  actor:=dp_private.case_writer(f.case_id);
  select * into f from public.dp_case_files where id=p_file for update;
  if f.kind<>'source' or f.uploader_id<>actor or f.state='ready' then
    raise exception 'Only your unfinished uploads can be discarded' using errcode='42501';
  end if;
  update public.dp_case_files set state='removed' where id=p_file;
  insert into public.dp_case_events(case_id,actor_id,event,object_id) values(f.case_id,actor,'upload_discarded',p_file);
  return f.storage_key;
end $$;

create function public.dp_save_diagnosis(p_case uuid,p_id uuid,p_revision integer,p_content jsonb,p_documents uuid[],p_sources text)
returns public.dp_diagnoses language plpgsql security definer set search_path = '' as $$
declare actor uuid := dp_private.case_writer(p_case,true); result public.dp_diagnoses; snapshot jsonb; k text;
begin
  if p_content is null or jsonb_typeof(p_content)<>'object' or length(p_content::text)>30000 or p_sources is null
    or p_documents is null or cardinality(p_documents)>20 then raise exception 'Invalid diagnosis content' using errcode='22023'; end if;
  foreach k in array array['summary','findings','questions','nextSteps','adviserNote'] loop
    if jsonb_typeof(p_content->k) is distinct from 'string' or length(p_content->>k)>10000 then
      raise exception 'Diagnosis fields must be bounded text' using errcode='22023';
    end if;
  end loop;
  if length(btrim(p_content->>'summary'))=0 or length(btrim(p_content->>'findings'))=0 then
    raise exception 'Add a summary and findings before saving' using errcode='22023';
  end if;
  if exists(select 1 from unnest(p_documents) x where x is null or not exists(
    select 1 from public.dp_case_files f where f.id=x and f.case_id=p_case and f.kind='source' and f.state='ready')) then
    raise exception 'Choose ready source documents from this case' using errcode='22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'sha256',sha256,'byteSize',byte_size) order by id),'[]'::jsonb)
    into snapshot from public.dp_case_files where id=any(p_documents);
  select * into result from public.dp_diagnoses where id=p_id for update;
  if found then
    if result.case_id<>p_case or result.state<>'draft' or result.revision is distinct from p_revision then
      raise exception 'Diagnosis changed or is not a draft. Reload before editing' using errcode='40001';
    end if;
    update public.dp_diagnoses set content=p_content,source_snapshot=snapshot,external_sources=p_sources,
      revision=revision+1,author_id=actor,updated_at=now() where id=p_id returning * into result;
  else
    if p_revision is distinct from 0 then raise exception 'New drafts start at revision zero'; end if;
    insert into public.dp_diagnoses(id,case_id,version,content,source_snapshot,external_sources,author_id)
      values(p_id,p_case,(select coalesce(max(version),0)+1 from public.dp_diagnoses where case_id=p_case),p_content,snapshot,p_sources,actor)
      returning * into result;
  end if;
  insert into public.dp_case_events(case_id,actor_id,event,object_id) values(p_case,actor,'draft_saved',p_id);
  return result;
end $$;

create function public.dp_review_diagnosis(p_id uuid,p_revision integer,p_review boolean)
returns public.dp_diagnoses language plpgsql security definer set search_path = '' as $$
declare result public.dp_diagnoses; actor uuid; case_id uuid;
begin
  select d.case_id into case_id from public.dp_diagnoses d where d.id=p_id;
  actor := dp_private.case_writer(case_id,true);
  select * into result from public.dp_diagnoses where id=p_id for update;
  if result.revision is distinct from p_revision or p_review is null or result.state<>(case when p_review then 'draft' else 'review' end) then
    raise exception 'Diagnosis changed. Reload before reviewing' using errcode='40001';
  end if;
  update public.dp_diagnoses set state=case when p_review then 'review' else 'draft' end,
    reviewed_by=case when p_review then actor else null end,reviewed_at=case when p_review then now() else null end,
    revision=revision+1,updated_at=now() where id=p_id returning * into result;
  insert into public.dp_case_events(case_id,actor_id,event,object_id) values(result.case_id,actor,case when p_review then 'reviewed' else 'returned_to_draft' end,p_id);
  return result;
end $$;

create function public.dp_prepare_publication(p_id uuid,p_revision integer,p_actor uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare d public.dp_diagnoses; object_key text;
begin
  perform 1 from public.dp_cases where id=(select case_id from public.dp_diagnoses where id=p_id) for update;
  select * into d from public.dp_diagnoses where id=p_id;
  if not found or not dp_private.case_access_as(d.case_id,p_actor,true)
    or not exists(select 1 from public.dp_cases c join public.dp_bookings b on b.id=c.id
      where c.id=d.case_id and c.status='open' and b.status<>'cancelled') then
    raise exception 'Publication access denied' using errcode='42501';
  end if;
  if d.state<>'review' or d.revision is distinct from p_revision or d.reviewed_by<>p_actor then
    raise exception 'Review this diagnosis before publishing' using errcode='40001';
  end if;
  object_key:=d.case_id::text || '/' || gen_random_uuid()::text || '.pdf';
  insert into dp_private.case_artifacts(storage_key,case_id,diagnosis_id,revision,actor_id)
    values(object_key,d.case_id,d.id,d.revision,p_actor);
  return object_key;
end $$;

-- Service-only publication after PDF storage succeeds. The gateway renders this exact reviewed revision.
create function public.dp_publish_diagnosis(p_id uuid,p_revision integer,p_actor uuid,p_key text,p_hash text,p_size integer)
returns public.dp_diagnoses language plpgsql security definer set search_path = '' as $$
declare result public.dp_diagnoses; pdf public.dp_case_files;
begin
  perform 1 from public.dp_cases where id=(select case_id from public.dp_diagnoses where id=p_id) for update;
  select * into result from public.dp_diagnoses where id=p_id for update;
  if not found or not dp_private.case_access_as(result.case_id,p_actor,true)
    or not exists(select 1 from public.dp_cases c join public.dp_bookings b on b.id=c.id
      where c.id=result.case_id and c.status='open' and b.status<>'cancelled') then
    raise exception 'Publication access denied' using errcode='42501';
  end if;
  if result.revision is distinct from p_revision then raise exception 'Review changed. Generate the reviewed revision again' using errcode='40001'; end if;
  if result.state='published' then return result; end if;
  if result.state<>'review' or result.reviewed_by<>p_actor then raise exception 'Review this diagnosis before publishing'; end if;
  -- A failed render can be retried; only this atomic transaction publishes metadata.
  if p_key !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.pdf$' then raise exception 'Invalid report object key'; end if;
  if not exists(select 1 from dp_private.case_artifacts where storage_key=p_key and diagnosis_id=p_id
    and revision=p_revision and actor_id=p_actor and expires_at>clock_timestamp()) then raise exception 'Report preparation expired'; end if;
  insert into public.dp_case_files(case_id,request_id,uploader_id,kind,name,mime,byte_size,sha256,storage_key,state)
    values(result.case_id,result.id,p_actor,'diagnosis','Diagnosis v' || result.version || '.pdf','application/pdf',p_size,p_hash,p_key,'ready') returning * into pdf;
  update public.dp_diagnoses set state='published',pdf_file_id=pdf.id,published_at=now(),updated_at=now() where id=p_id returning * into result;
  insert into public.dp_case_events(case_id,actor_id,event,object_id) values(result.case_id,p_actor,'published',p_id);
  return result;
end $$;

create function dp_private.file_access_as(p_file uuid,p_actor uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.dp_case_files f where f.id=p_file and f.state='ready'
    and dp_private.case_access_as(f.case_id,p_actor)
    and (f.kind='source' or exists(select 1 from public.dp_diagnoses d where d.pdf_file_id=f.id and d.state='published')))
$$;
revoke all on function dp_private.file_access_as(uuid,uuid) from public,anon,authenticated;

create function public.dp_issue_case_download(p_file uuid,p_actor uuid,p_token_hash text) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare expiry timestamptz;
begin
  if not dp_private.file_access_as(p_file,p_actor) then raise exception 'Document access denied' using errcode='42501'; end if;
  delete from dp_private.case_downloads where expires_at<=now();
  insert into dp_private.case_downloads(token_hash,file_id,actor_id) values(p_token_hash,p_file,p_actor) returning expires_at into expiry;
  insert into public.dp_case_events(case_id,actor_id,event,object_id)
    select case_id,p_actor,'download_granted',id from public.dp_case_files where id=p_file;
  return expiry;
end $$;
create function public.dp_resolve_case_download(p_token_hash text) returns public.dp_case_files
language plpgsql security definer set search_path = '' as $$
declare ticket dp_private.case_downloads; result public.dp_case_files;
begin
  select * into ticket from dp_private.case_downloads where token_hash=p_token_hash and expires_at>now();
  if not found or not dp_private.file_access_as(ticket.file_id,ticket.actor_id) then
    raise exception 'This download link expired or access was revoked' using errcode='42501';
  end if;
  select * into result from public.dp_case_files where id=ticket.file_id;
  -- The gateway records served only after Storage returns bytes, not on URL resolution.
  return result;
end $$;
create function public.dp_record_case_download(p_token_hash text) returns void
language plpgsql security definer set search_path = '' as $$
declare f public.dp_case_files; actor uuid;
begin
  f:=public.dp_resolve_case_download(p_token_hash);
  select actor_id into actor from dp_private.case_downloads where token_hash=p_token_hash;
  insert into public.dp_case_events(case_id,actor_id,event,object_id) values(f.case_id,actor,'download_served',f.id);
end $$;

-- Operator/service-only retention. Revocation precedes external object deletion.
create function public.dp_set_case_retention(p_case uuid,p_until timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.dp_cases set retention_until=p_until where id=p_case and status in ('open','closed');
  if not found then raise exception 'Case unavailable'; end if;
  insert into public.dp_case_events(case_id,event) values(p_case,'retention_set');
end $$;
create function public.dp_begin_case_erasure(p_case uuid) returns setof text
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.dp_cases where id=p_case for update;
  if not found then raise exception 'Case unavailable'; end if;
  update public.dp_cases set status='erasure_pending' where id=p_case and status<>'erased';
  delete from dp_private.case_downloads where file_id in (select id from public.dp_case_files where case_id=p_case);
  insert into public.dp_case_events(case_id,event) values(p_case,'erasure_requested');
  return query select storage_key from public.dp_case_files where case_id=p_case
    union select storage_key from dp_private.case_artifacts where case_id=p_case;
end $$;
create function public.dp_finish_case_erasure(p_case uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.dp_cases where id=p_case and status in ('erasure_pending','erased') for update;
  if not found then raise exception 'Revoke case access before removing content'; end if;
  -- Edge requests are bounded below 15 minutes. Wait out outstanding writes before
  -- claiming physical erasure; rerun begin/delete/finish after the grace period.
  if exists(select 1 from public.dp_case_files where case_id=p_case and write_lease_until>clock_timestamp())
    or exists(select 1 from dp_private.case_artifacts where case_id=p_case and expires_at>clock_timestamp()) then
    raise exception 'Wait for outstanding file operations to expire, then retry erasure';
  end if;
  if exists(select 1 from storage.objects o join public.dp_case_files f on f.storage_key=o.name
    where o.bucket_id='dp-case-files' and f.case_id=p_case)
    or exists(select 1 from storage.objects o join dp_private.case_artifacts a on a.storage_key=o.name
      where o.bucket_id='dp-case-files' and a.case_id=p_case) then raise exception 'Remove stored objects before finishing erasure'; end if;
  update public.dp_diagnoses set state='erased',content='{}',source_snapshot='[]',external_sources='' where case_id=p_case;
  update public.dp_case_files set state='removed',name='Removed document',sha256=repeat('0',64) where case_id=p_case;
  update public.dp_cases set status='erased',erased_at=coalesce(erased_at,now()) where id=p_case;
  insert into public.dp_case_events(case_id,event) values(p_case,'erasure_completed');
end $$;

-- Run periodically from a trusted operator process. Expired preparations cannot publish.
create function public.dp_case_cleanup_keys() returns setof text
language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  for c in select id from public.dp_cases order by id for update loop
    return query select a.storage_key from dp_private.case_artifacts a where a.case_id=c.id and a.expires_at<clock_timestamp()
      and not exists(select 1 from public.dp_case_files f where f.storage_key=a.storage_key and f.state='ready')
      union select f.storage_key from public.dp_case_files f where f.case_id=c.id and f.state='removed' and f.write_lease_until<clock_timestamp();
  end loop;
end $$;

-- No new function may retain PostgreSQL's default PUBLIC execute grant.
do $$ declare f record; begin
  for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace
    and proname in ('dp_reserve_document','dp_finish_document','dp_discard_upload','dp_prepare_publication','dp_save_diagnosis','dp_review_diagnosis','dp_publish_diagnosis',
      'dp_issue_case_download','dp_resolve_case_download','dp_record_case_download','dp_set_case_retention','dp_begin_case_erasure','dp_finish_case_erasure','dp_case_cleanup_keys') loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
grant execute on function public.dp_reserve_document(uuid,uuid,text,text,integer,text),
  public.dp_discard_upload(uuid),
  public.dp_save_diagnosis(uuid,uuid,integer,jsonb,uuid[],text),public.dp_review_diagnosis(uuid,integer,boolean) to authenticated;
grant select on public.dp_cases,public.dp_case_files,public.dp_diagnoses,public.dp_case_events to service_role;
notify pgrst,'reload schema';
commit;
