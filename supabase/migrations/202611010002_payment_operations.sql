-- Explicit payment-operator role. No staff member receives financial permissions by default.
begin;
create table dp_private.payment_operators (
  user_id uuid primary key references auth.users(id), enabled boolean not null default false
);
revoke all on dp_private.payment_operators from public,anon,authenticated;
create function dp_private.payment_operator() returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=dp_private.actor();
begin
  if not exists(select 1 from dp_private.payment_operators o join auth.users u on u.id=o.user_id
    where o.user_id=actor and o.enabled and (u.banned_until is null or u.banned_until<=now())) then
    raise exception 'Payment operator access denied' using errcode='42501';
  end if;
  return actor;
end $$;
revoke all on function dp_private.payment_operator() from public,anon,authenticated;

alter table public.dp_payment_orders drop constraint dp_payment_orders_state_check;
alter table public.dp_payment_orders add check(state in ('created','checkout_open','paid','review_required','expired'));
alter table public.dp_payment_orders drop constraint dp_payment_orders_booking_id_key;
create unique index dp_one_current_order on public.dp_payment_orders(booking_id) where state in ('created','checkout_open');

create or replace function public.dp_stripe_order(p_booking uuid) returns public.dp_payment_orders
language plpgsql security definer set search_path='' as $$
declare actor uuid:=dp_private.actor(); b public.dp_bookings; result public.dp_payment_orders;
begin
  select * into b from public.dp_bookings where id=p_booking for update;
  if not found or b.user_id<>actor or not dp_private.case_access_as(b.id,actor) or b.status='cancelled'
    then raise exception 'Booking payment access denied' using errcode='42501'; end if;
  select * into result from public.dp_payment_orders where booking_id=p_booking order by paid_at desc nulls last,created_at desc,id desc limit 1;
  if found then return result; end if;
  insert into public.dp_payment_orders(booking_id,user_id,amount_minor) values(b.id,actor,b.fee_minor) returning * into result;
  return result;
end $$;

create function public.dp_stripe_retry(p_booking uuid) returns public.dp_payment_orders
language plpgsql security definer set search_path='' as $$
declare previous public.dp_payment_orders; result public.dp_payment_orders;
begin
  -- dp_stripe_order locks the booking and verifies current owner access before retry.
  previous:=public.dp_stripe_order(p_booking);
  if previous.state<>'expired' then return previous; end if;
  if exists(select 1 from public.dp_payment_orders where booking_id=p_booking and paid_at is not null)
    then raise exception 'A payment exists; operator reconciliation is required'; end if;
  insert into public.dp_payment_orders(booking_id,user_id,amount_minor)
    values(previous.booking_id,previous.user_id,previous.amount_minor) returning * into result;
  return result;
end $$;

create function public.dp_payment_queue() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  perform dp_private.payment_operator();
  return coalesce((select jsonb_agg(to_jsonb(q)) from (select id,booking_id,amount_minor,currency,mode,state,stripe_session_id,created_at,paid_at
    from public.dp_payment_orders order by created_at desc,id desc limit 100) q),'[]'::jsonb);
end $$;
create function public.dp_payment_ops_order(p_order uuid) returns public.dp_payment_orders
language plpgsql security definer set search_path='' as $$
declare result public.dp_payment_orders;
begin
  perform dp_private.payment_operator();
  select * into result from public.dp_payment_orders where id=p_order;
  if not found then raise exception 'Payment order unavailable'; end if;
  return result;
end $$;

-- Only trusted retrieval of an expired, unpaid Stripe session may unlock a new attempt.
create function public.dp_stripe_expired(p_order uuid,p_session text,p_live boolean) returns void
language plpgsql security definer set search_path='' as $$
declare result public.dp_payment_orders;
begin
  select * into result from public.dp_payment_orders where id=p_order for update;
  if not found or p_live is distinct from false or p_session is null or p_session !~ '^cs_test_'
    or (result.stripe_session_id is not null and result.stripe_session_id<>p_session)
    then raise exception 'Checkout does not match this order'; end if;
  if result.paid_at is not null or result.state in ('paid','review_required') then return; end if;
  update public.dp_payment_orders set state='expired',stripe_session_id=p_session where id=p_order;
end $$;

create table public.dp_payment_refunds (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.dp_payment_orders(id),
  request_id uuid not null unique, requested_by uuid not null references auth.users(id),
  amount_minor integer not null check(amount_minor>0), reason text not null check(length(btrim(reason)) between 10 and 500),
  state text not null default 'requested' check(state in ('requested','pending','requires_action','succeeded','failed','canceled')),
  stripe_refund_id text unique, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.dp_payment_refunds enable row level security;
revoke all on public.dp_payment_refunds from public,anon,authenticated;
grant select on public.dp_payment_refunds to authenticated,service_role;
create policy dp_refund_owner on public.dp_payment_refunds for select to authenticated using(
  exists(select 1 from public.dp_payment_orders o where o.id=order_id and o.user_id=auth.uid())
);

create function public.dp_refund_prepare(p_order uuid,p_request uuid,p_amount integer,p_reason text) returns public.dp_payment_refunds
language plpgsql security definer set search_path='' as $$
declare actor uuid:=dp_private.payment_operator(); o public.dp_payment_orders; result public.dp_payment_refunds; reserved bigint;
begin
  select * into o from public.dp_payment_orders where id=p_order for update;
  if not found or o.paid_at is null or o.payment_intent_id is null then raise exception 'Reconcile a paid order first'; end if;
  select * into result from public.dp_payment_refunds where request_id=p_request;
  if found then
    if result.order_id<>p_order or result.amount_minor<>p_amount or result.reason<>btrim(p_reason)
      then raise exception 'Refund request already used with different details'; end if;
    return result;
  end if;
  select coalesce(sum(amount_minor),0) into reserved from public.dp_payment_refunds where order_id=p_order and state not in ('failed','canceled');
  if p_amount is null or p_amount<=0 or p_amount>o.amount_minor-reserved then raise exception 'Refund exceeds the available amount'; end if;
  insert into public.dp_payment_refunds(order_id,request_id,requested_by,amount_minor,reason)
    values(p_order,p_request,actor,p_amount,btrim(p_reason)) returning * into result;
  return result;
end $$;

create function public.dp_refund_result(p_refund uuid,p_provider_id text,p_intent text,p_amount integer,p_currency text,p_state text,p_live boolean)
returns public.dp_payment_refunds language plpgsql security definer set search_path='' as $$
declare result public.dp_payment_refunds; o public.dp_payment_orders;
begin
  select * into o from public.dp_payment_orders where id=(select order_id from public.dp_payment_refunds where id=p_refund) for update;
  select * into result from public.dp_payment_refunds where id=p_refund for update;
  if not found or p_live is distinct from false or p_provider_id is null or p_provider_id !~ '^re_'
    or p_intent is distinct from o.payment_intent_id or p_amount is distinct from result.amount_minor
    or p_currency is distinct from o.currency or p_state not in ('pending','requires_action','succeeded','failed','canceled') or p_state is null
    or (result.stripe_refund_id is not null and result.stripe_refund_id<>p_provider_id)
    then raise exception 'Refund does not match the recorded request'; end if;
  if result.state in ('succeeded','failed','canceled') and result.state<>p_state then return result; end if;
  update public.dp_payment_refunds set stripe_refund_id=p_provider_id,state=p_state,updated_at=now() where id=p_refund returning * into result;
  return result;
end $$;

create function public.dp_refund_lookup(p_id uuid) returns public.dp_payment_refunds
language plpgsql security definer set search_path='' as $$
declare result public.dp_payment_refunds;
begin
  perform dp_private.payment_operator();
  select * into result from public.dp_payment_refunds where id=p_id;
  if not found then raise exception 'Refund unavailable'; end if;
  return result;
end $$;
create function public.dp_payment_refund_queue(p_order uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  perform dp_private.payment_operator();
  return coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from public.dp_payment_refunds r where order_id=p_order),'[]'::jsonb);
end $$;

create table dp_private.payment_events (
  id bigint generated always as identity primary key, order_id uuid not null references public.dp_payment_orders(id),
  record_id uuid not null, kind text not null, state text not null, actor uuid, created_at timestamptz not null default now()
);
revoke all on dp_private.payment_events from public,anon,authenticated;
create function dp_private.payment_audit() returns trigger
language plpgsql security definer set search_path='' as $$
declare order_key uuid;
begin
  if TG_OP='INSERT' or old.state is distinct from new.state then
    if TG_TABLE_NAME='dp_payment_orders' then order_key:=new.id; else order_key:=new.order_id; end if;
    insert into dp_private.payment_events(order_id,record_id,kind,state,actor)
      values(order_key,new.id,TG_TABLE_NAME,new.state,auth.uid());
  end if;
  return new;
end $$;
revoke all on function dp_private.payment_audit() from public,anon,authenticated;
create trigger dp_order_audit after insert or update on public.dp_payment_orders for each row execute function dp_private.payment_audit();
create trigger dp_refund_audit after insert or update on public.dp_payment_refunds for each row execute function dp_private.payment_audit();

create table dp_private.payment_disputes (
  id text primary key, order_id uuid not null references public.dp_payment_orders(id),
  amount_minor integer not null check(amount_minor>0), state text not null, reason text not null,
  due_at timestamptz, updated_at timestamptz not null default now()
);
revoke all on dp_private.payment_disputes from public,anon,authenticated;
create function public.dp_dispute_result(p_id text,p_intent text,p_amount integer,p_currency text,p_state text,p_reason text,p_due timestamptz,p_live boolean)
returns void language plpgsql security definer set search_path='' as $$
declare o public.dp_payment_orders;
begin
  select * into o from public.dp_payment_orders where payment_intent_id=p_intent for update;
  if not found or p_live is distinct from false or p_id is null or p_id !~ '^du_' or p_currency is distinct from o.currency
    or p_amount is null or p_amount<=0 or p_state is null or p_state not in ('warning_needs_response','warning_under_review','warning_closed','needs_response','under_review','appeal_needs_response','appeal_under_review','won','lost','prevented')
    or p_reason is null or length(p_reason)>100 then raise exception 'Dispute does not match a test order'; end if;
  if exists(select 1 from dp_private.payment_disputes where id=p_id and order_id<>o.id) then raise exception 'Dispute order differs'; end if;
  insert into dp_private.payment_disputes(id,order_id,amount_minor,state,reason,due_at) values(p_id,o.id,p_amount,p_state,p_reason,p_due)
    on conflict(id) do update set amount_minor=excluded.amount_minor,state=excluded.state,reason=excluded.reason,due_at=excluded.due_at,updated_at=now();
  -- A closed dispute still requires an operator review; never silently restore fulfilment.
  update public.dp_payment_orders set state='review_required' where id=o.id;
end $$;
create function public.dp_payment_history(p_order uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  perform dp_private.payment_operator();
  return jsonb_build_object('events',coalesce((select jsonb_agg(to_jsonb(e) order by e.id) from dp_private.payment_events e where order_id=p_order),'[]'::jsonb),
    'disputes',coalesce((select jsonb_agg(to_jsonb(d)) from dp_private.payment_disputes d where order_id=p_order),'[]'::jsonb));
end $$;

-- Owner-visible receipt data is a payment record, not a tax invoice or proof of service completion.
create function public.dp_payment_receipt(p_order uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=dp_private.actor(); o public.dp_payment_orders;
begin
  select * into o from public.dp_payment_orders where id=p_order and user_id=actor;
  if not found or not dp_private.case_access_as(o.booking_id,actor) or o.paid_at is null
    then raise exception 'Payment receipt unavailable' using errcode='42501'; end if;
  return jsonb_build_object('orderId',o.id,'bookingId',o.booking_id,'mode',o.mode,'currency',o.currency,
    'amountMinor',o.amount_minor,'paidAt',o.paid_at,'refundedMinor',
    (select coalesce(sum(amount_minor),0) from public.dp_payment_refunds where order_id=o.id and state='succeeded'),
    'label','TEST payment record - no real money collected; not a tax invoice');
end $$;

do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('dp_stripe_retry','dp_payment_queue','dp_payment_ops_order','dp_stripe_expired',
      'dp_refund_prepare','dp_refund_result','dp_refund_lookup','dp_payment_refund_queue','dp_payment_receipt','dp_dispute_result','dp_payment_history') loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  end loop;
end $$;
grant execute on function public.dp_stripe_retry(uuid),public.dp_payment_queue(),public.dp_payment_ops_order(uuid),
  public.dp_refund_prepare(uuid,uuid,integer,text),public.dp_refund_lookup(uuid),public.dp_payment_refund_queue(uuid),public.dp_payment_receipt(uuid),public.dp_payment_history(uuid) to authenticated;
grant execute on function public.dp_stripe_expired(uuid,text,boolean),
  public.dp_refund_result(uuid,text,text,integer,text,text,boolean),public.dp_dispute_result(text,text,integer,text,text,text,timestamptz,boolean) to service_role;

create or replace function public.dp_ops_health() returns jsonb
language sql security definer set search_path='' as $$
  select jsonb_build_object('checkedAt',clock_timestamp(),
    'failedUploads',(select count(*) from public.dp_case_files where state='failed'),
    'staleUploads',(select count(*) from public.dp_case_files where state='uploading' and write_lease_until<now()),
    'erasurePending',(select count(*) from public.dp_cases where status='erasure_pending'),
    'expiredCases',(select count(*) from public.dp_cases where status not in ('erased','erasure_pending') and retention_until<now()),
    'paymentReview',(select count(*) from public.dp_payment_orders where state='review_required'),
    'expiredCheckouts',(select count(*) from public.dp_payment_orders where state in ('created','checkout_open') and checkout_expires_at<now()),
    'pendingRefunds',(select count(*) from public.dp_payment_refunds where state in ('requested','pending')),
    'refundActionRequired',(select count(*) from public.dp_payment_refunds where state='requires_action'),
    'disputesNeedingResponse',(select count(*) from dp_private.payment_disputes where state in ('warning_needs_response','needs_response','appeal_needs_response')));
$$;
notify pgrst,'reload schema';
commit;
