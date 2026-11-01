begin;
create table dp_private.gateway_limits (
  scope text not null check(scope in ('case-upload','case-action','case-download','checkout','payment-ops')),
  subject_hash text not null check(subject_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  requests integer not null check(requests>0),
  primary key(scope,subject_hash,window_start)
);
revoke all on dp_private.gateway_limits from public,anon,authenticated;

-- Trusted gateway derives the subject from validated Auth or an unexpired opaque grant.
-- Database upsert makes limits shared by all Edge instances. Expired counters contain no payloads.
create function public.dp_gateway_limit(p_scope text,p_subject_hash text) returns boolean
language plpgsql security definer set search_path='' as $$
declare cap integer; used integer; bucket timestamptz:=date_trunc('minute',clock_timestamp());
begin
  cap:=case p_scope when 'case-upload' then 10 when 'case-action' then 30
    when 'case-download' then 6 when 'checkout' then 6 when 'payment-ops' then 12 end;
  if cap is null or p_subject_hash is null or p_subject_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid limiter subject'; end if;
  delete from dp_private.gateway_limits where window_start<bucket-interval '2 minutes';
  insert into dp_private.gateway_limits(scope,subject_hash,window_start,requests)
    values(p_scope,p_subject_hash,bucket,1)
    on conflict(scope,subject_hash,window_start) do update
      set requests=least(dp_private.gateway_limits.requests+1,cap+1)
    returning requests into used;
  return used<=cap;
end $$;
revoke all on function public.dp_gateway_limit(text,text) from public,anon,authenticated;
grant execute on function public.dp_gateway_limit(text,text) to service_role;

create function public.dp_ops_health() returns jsonb
language sql security definer set search_path='' as $$
  select jsonb_build_object(
    'checkedAt',clock_timestamp(),
    'failedUploads',(select count(*) from public.dp_case_files where state='failed'),
    'staleUploads',(select count(*) from public.dp_case_files where state='uploading' and write_lease_until<now()),
    'erasurePending',(select count(*) from public.dp_cases where status='erasure_pending'),
    'expiredCases',(select count(*) from public.dp_cases where status not in ('erased','erasure_pending') and retention_until<now()),
    'paymentReview',(select count(*) from public.dp_payment_orders where state='review_required'),
    'expiredCheckouts',(select count(*) from public.dp_payment_orders where state in ('created','checkout_open') and checkout_expires_at<now())
  );
$$;
revoke all on function public.dp_ops_health() from public,anon,authenticated;
grant execute on function public.dp_ops_health() to service_role;
notify pgrst,'reload schema';
commit;
