-- Stripe provider integration is test-only until commercial policy and live rollout approval.
begin;
create table public.dp_payment_orders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.dp_bookings(id),
  user_id uuid not null references auth.users(id),
  amount_minor integer not null check(amount_minor>0),
  currency text not null default 'myr' check(currency='myr'),
  mode text not null default 'test' check(mode='test'),
  state text not null default 'created' check(state in ('created','checkout_open','paid','review_required')),
  stripe_session_id text unique,
  payment_intent_id text unique,
  -- A fixed expiry also keeps Stripe idempotent request parameters stable across retries.
  checkout_expires_at timestamptz not null default date_trunc('second',now())+interval '1 hour',
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create table dp_private.stripe_events (
  event_id text primary key,
  order_id uuid not null references public.dp_payment_orders(id),
  payload_hash text not null check(payload_hash ~ '^[a-f0-9]{64}$'),
  outcome text not null,
  received_at timestamptz not null default now()
);
alter table public.dp_payment_orders enable row level security;
revoke all on public.dp_payment_orders from public,anon,authenticated;
revoke all on dp_private.stripe_events from public,anon,authenticated;
grant select on public.dp_payment_orders to authenticated,service_role;
create policy dp_order_owner on public.dp_payment_orders for select to authenticated using (
  user_id=auth.uid() and dp_private.case_access(booking_id)
);

create function public.dp_stripe_order(p_booking uuid) returns public.dp_payment_orders
language plpgsql security definer set search_path='' as $$
declare actor uuid:=dp_private.actor(); b public.dp_bookings; result public.dp_payment_orders;
begin
  select * into b from public.dp_bookings where id=p_booking for update;
  if not found or b.user_id<>actor or not dp_private.case_access_as(b.id,actor)
    or b.status='cancelled' then raise exception 'Booking payment access denied' using errcode='42501'; end if;
  select * into result from public.dp_payment_orders where booking_id=p_booking;
  if found then return result; end if;
  insert into public.dp_payment_orders(booking_id,user_id,amount_minor) values(b.id,actor,b.fee_minor) returning * into result;
  return result;
end $$;

create function public.dp_stripe_attach(p_order uuid,p_session text) returns public.dp_payment_orders
language plpgsql security definer set search_path='' as $$
declare result public.dp_payment_orders;
begin
  select * into result from public.dp_payment_orders where id=p_order for update;
  if not found or p_session is null or p_session !~ '^cs_test_' then raise exception 'Invalid test checkout'; end if;
  if result.stripe_session_id is not null and result.stripe_session_id<>p_session then raise exception 'Checkout differs; reconcile with Stripe'; end if;
  update public.dp_payment_orders set stripe_session_id=p_session,state=case when state='created' then 'checkout_open' else state end where id=p_order returning * into result;
  return result;
end $$;

-- Only called after Stripe signature verification AND retrieval of the current session.
create function public.dp_stripe_paid(p_order uuid,p_event text,p_hash text,p_session text,p_intent text,p_amount integer,p_currency text,p_live boolean)
returns public.dp_payment_orders language plpgsql security definer set search_path='' as $$
declare result public.dp_payment_orders; previous dp_private.stripe_events; booking_status text;
begin
  -- Same lock order as order creation. Serialize cancellation with settlement classification.
  select b.status into booking_status from public.dp_bookings b where b.id=(select booking_id from public.dp_payment_orders where id=p_order) for update;
  select * into result from public.dp_payment_orders where id=p_order for update;
  if not found then raise exception 'Order unavailable'; end if;
  select * into previous from dp_private.stripe_events where event_id=p_event;
  if found then
    if previous.order_id<>p_order or previous.payload_hash<>p_hash then raise exception 'Webhook replay differs'; end if;
    return result;
  end if;
  if p_event is null or p_event !~ '^evt_' or p_live is distinct from false
    or p_amount is distinct from result.amount_minor or p_currency is distinct from result.currency
    or p_session is null or p_session !~ '^cs_test_' or p_intent is null or p_intent !~ '^pi_'
    or (result.stripe_session_id is not null and result.stripe_session_id<>p_session)
    or (result.payment_intent_id is not null and result.payment_intent_id<>p_intent) then
    raise exception 'Payment details do not match the test order';
  end if;
  update public.dp_payment_orders set stripe_session_id=p_session,payment_intent_id=p_intent,
    state=case when booking_status='cancelled' or state='review_required' then 'review_required' else 'paid' end,
    paid_at=coalesce(paid_at,now()) where id=p_order returning * into result;
  insert into dp_private.stripe_events(event_id,order_id,payload_hash,outcome) values(p_event,p_order,p_hash,result.state);
  -- Deliberately do not mark real bookings or memberships paid from sandbox money.
  return result;
end $$;
revoke all on function public.dp_stripe_order(uuid),public.dp_stripe_attach(uuid,text),
  public.dp_stripe_paid(uuid,text,text,text,text,integer,text,boolean) from public,anon,authenticated;
grant execute on function public.dp_stripe_order(uuid) to authenticated;
grant execute on function public.dp_stripe_attach(uuid,text),
  public.dp_stripe_paid(uuid,text,text,text,text,integer,text,boolean) to service_role;
notify pgrst,'reload schema';
commit;
