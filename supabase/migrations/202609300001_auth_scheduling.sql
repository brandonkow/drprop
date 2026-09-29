-- Additive migration. Run through the deployment owner's migration workflow.
begin;
create schema if not exists dp_private;
revoke all on schema dp_private from public, anon, authenticated;

create table public.dp_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 1 and 40),
  drink_preference text not null default '' check (length(drink_preference) <= 80),
  created_at timestamptz not null default now()
);
create table public.dp_staff (
  user_id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null check (length(btrim(display_name)) between 1 and 80),
  enabled boolean not null default false
);
create table public.dp_settings (
  id boolean primary key default true check (id),
  bookings_enabled boolean not null default false
);
insert into public.dp_settings(id) values (true);
create table public.dp_prices (
  band text primary key check (band in ('lt300k','300k-600k','600k-1m','1m-2m','gt2m')),
  standard_minor integer not null check (standard_minor > 0 and standard_minor <= 10000000),
  confirmed boolean not null default false
);
insert into public.dp_prices(band,standard_minor) values
  ('lt300k',19900),('300k-600k',39900),('600k-1m',69900),('1m-2m',119900),('gt2m',199900);
create table public.dp_slots (
  id uuid primary key default gen_random_uuid(),
  adviser_id uuid not null references public.dp_staff(user_id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  enabled boolean not null default true,
  check (ends_at = starts_at + interval '30 minutes'),
  unique(adviser_id,starts_at)
);
create index dp_slots_future on public.dp_slots(starts_at) where enabled;
create table public.dp_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.dp_profiles(user_id) on delete restrict,
  adviser_id uuid not null references public.dp_staff(user_id),
  slot_id uuid not null references public.dp_slots(id),
  request_id uuid not null,
  consultation_type text not null check (consultation_type in ('clinic','urgent','review')),
  price_band text not null references public.dp_prices(band),
  property_label text not null check (length(btrim(property_label)) between 1 and 80),
  follow_up_of uuid references public.dp_bookings(id),
  fee_minor integer not null check (fee_minor > 0),
  currency text not null default 'MYR' check (currency = 'MYR'),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'requested' check (status in ('requested','confirmed','completed','cancelled')),
  payment_status text not null default 'unpaid' check (payment_status = 'unpaid'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,request_id),
  check (ends_at > starts_at),
  check ((consultation_type = 'review') = (follow_up_of is not null))
);
create unique index dp_one_active_booking_per_slot on public.dp_bookings(slot_id) where status <> 'cancelled';
create index dp_bookings_customer on public.dp_bookings(user_id,created_at desc);
create index dp_bookings_adviser on public.dp_bookings(adviser_id,starts_at);
create table public.dp_booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.dp_bookings(id),
  actor_id uuid not null references auth.users(id),
  status text not null,
  occurred_at timestamptz not null default now()
);

alter table public.dp_profiles enable row level security;
alter table public.dp_staff enable row level security;
alter table public.dp_settings enable row level security;
alter table public.dp_prices enable row level security;
alter table public.dp_slots enable row level security;
alter table public.dp_bookings enable row level security;
alter table public.dp_booking_events enable row level security;
revoke all on public.dp_profiles, public.dp_staff, public.dp_settings, public.dp_prices,
  public.dp_slots, public.dp_bookings, public.dp_booking_events from public, anon, authenticated;
grant select on public.dp_profiles, public.dp_staff, public.dp_slots, public.dp_bookings to authenticated;
create policy dp_own_profile on public.dp_profiles for select to authenticated using (user_id = (select auth.uid()));
create policy dp_own_staff on public.dp_staff for select to authenticated using (user_id = (select auth.uid()));
create policy dp_own_slots on public.dp_slots for select to authenticated using (
  adviser_id = (select auth.uid()) and exists (select 1 from public.dp_staff s where s.user_id = auth.uid() and s.enabled)
);
create policy dp_own_bookings on public.dp_bookings for select to authenticated using (
  user_id = (select auth.uid()) or
  (adviser_id = (select auth.uid()) and exists (select 1 from public.dp_staff s where s.user_id = auth.uid() and s.enabled))
);

create function dp_private.actor() returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null or not exists(select 1 from auth.users u where u.id = actor and u.phone_confirmed_at is not null and nullif(u.phone,'') is not null) then
    raise exception 'Verified phone sign-in required' using errcode = '42501';
  end if;
  return actor;
end $$;

create function public.dp_save_profile(p_name text, p_drink text default '') returns public.dp_profiles
language plpgsql security definer set search_path = '' as $$
declare actor uuid := dp_private.actor(); result public.dp_profiles;
begin
  if p_name is null or length(btrim(p_name)) not between 1 and 40 or p_drink is null or length(p_drink) > 80 then
    raise exception 'Enter a name of 1-40 characters and a drink preference of up to 80 characters' using errcode='22023';
  end if;
  insert into public.dp_profiles(user_id,display_name,drink_preference) values(actor,btrim(p_name),btrim(p_drink))
  on conflict(user_id) do update set display_name=excluded.display_name, drink_preference=excluded.drink_preference returning * into result;
  return result;
end $$;

create function public.dp_quote(p_type text,p_band text) returns integer
language plpgsql security definer set search_path = '' as $$
declare fee integer;
begin
  perform dp_private.actor();
  if p_type is null or p_type not in ('clinic','urgent','review') then raise exception 'Invalid consultation type' using errcode='22023'; end if;
  select standard_minor into fee from public.dp_prices where band=p_band and confirmed;
  if fee is null then raise exception 'Fees are not yet available for booking' using errcode='22023'; end if;
  return round(fee * case p_type when 'urgent' then 1.5 when 'review' then 0.5 else 1 end)::integer;
end $$;

create function public.dp_availability(p_type text default 'clinic')
returns table(id uuid,adviser_name text,starts_at timestamptz,ends_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  perform dp_private.actor();
  if p_type is null or p_type not in ('clinic','urgent','review') then raise exception 'Invalid consultation type' using errcode='22023'; end if;
  return query select s.id,a.display_name,s.starts_at,s.ends_at
    from public.dp_slots s join public.dp_staff a on a.user_id=s.adviser_id
    where s.enabled and a.enabled and s.starts_at > now() and s.starts_at <= now()+interval '90 days'
      and (p_type <> 'urgent' or s.starts_at <= now()+interval '2 hours')
      and exists(select 1 from public.dp_settings where bookings_enabled)
      and not exists(select 1 from public.dp_bookings b where b.slot_id=s.id and b.status <> 'cancelled')
    order by s.starts_at,s.id limit 200;
end $$;

create function public.dp_book(p_request uuid,p_slot uuid,p_type text,p_band text,p_property text,p_follow_up uuid default null,p_expected_fee integer default null)
returns public.dp_bookings language plpgsql security definer set search_path = '' as $$
declare actor uuid := dp_private.actor(); slot public.dp_slots; prior public.dp_bookings; result public.dp_bookings; adviser uuid; fee integer;
begin
  if p_request is null or p_slot is null or p_property is null or length(btrim(p_property)) not between 1 and 80 then
    raise exception 'A request ID, slot and property shorthand are required' using errcode='22023';
  end if;
  -- Serialize requests for this customer before checking limits and overlaps.
  perform 1 from public.dp_profiles where user_id=actor for update;
  if not found then raise exception 'Complete your profile first' using errcode='22023'; end if;
  select * into prior from public.dp_bookings where user_id=actor and request_id=p_request;
  if found then
    if prior.slot_id is distinct from p_slot or prior.consultation_type is distinct from p_type or prior.price_band is distinct from p_band
       or prior.property_label is distinct from btrim(p_property) or prior.follow_up_of is distinct from p_follow_up or prior.fee_minor is distinct from p_expected_fee then
      raise exception 'Request ID already used with different details' using errcode='22023';
    end if;
    return prior;
  end if;
  if not exists(select 1 from public.dp_settings where bookings_enabled) then raise exception 'Bookings are not open yet' using errcode='22023'; end if;
  fee := public.dp_quote(p_type,p_band);
  if fee is distinct from p_expected_fee then raise exception 'The fee changed. Review the current quote before booking' using errcode='22023'; end if;
  select adviser_id into adviser from public.dp_slots where id=p_slot;
  -- The same adviser lock is used when publishing or disabling availability.
  perform 1 from public.dp_staff where user_id=adviser and enabled for update;
  if not found then raise exception 'This appointment is no longer available' using errcode='22023'; end if;
  select * into slot from public.dp_slots where id=p_slot for update;
  if not slot.enabled or slot.starts_at <= now() or slot.starts_at > now()+interval '90 days'
     or exists(select 1 from public.dp_bookings where slot_id=p_slot and status <> 'cancelled') then
    raise exception 'This appointment is no longer available' using errcode='22023';
  end if;
  if adviser=actor then raise exception 'You cannot book your own availability' using errcode='22023'; end if;
  if p_type='urgent' and slot.starts_at > now()+interval '2 hours' then raise exception 'Choose an urgent slot within two hours' using errcode='22023'; end if;
  if p_type='review' then
    if not exists(select 1 from public.dp_bookings where id=p_follow_up and user_id=actor and status='completed' and consultation_type <> 'review' and price_band=p_band) then
      raise exception 'Final checks require your completed consultation in the same price band' using errcode='22023';
    end if;
  elsif p_follow_up is not null then raise exception 'Only final checks can reference an earlier consultation' using errcode='22023'; end if;
  if (select count(*) from public.dp_bookings where user_id=actor and status in ('requested','confirmed') and ends_at > now()) >= 3 then
    raise exception 'You can have at most three upcoming bookings' using errcode='22023';
  end if;
  if exists(select 1 from public.dp_bookings where user_id=actor and status in ('requested','confirmed') and starts_at < slot.ends_at and ends_at > slot.starts_at) then
    raise exception 'This overlaps another appointment of yours' using errcode='22023';
  end if;
  insert into public.dp_bookings(user_id,adviser_id,slot_id,request_id,consultation_type,price_band,property_label,follow_up_of,fee_minor,starts_at,ends_at)
    values(actor,adviser,p_slot,p_request,p_type,p_band,btrim(p_property),p_follow_up,fee,slot.starts_at,slot.ends_at) returning * into result;
  insert into public.dp_booking_events(booking_id,actor_id,status) values(result.id,actor,'requested');
  return result;
end $$;

create function public.dp_cancel(p_booking uuid) returns public.dp_bookings
language plpgsql security definer set search_path = '' as $$
declare actor uuid := dp_private.actor(); result public.dp_bookings;
begin
  select * into result from public.dp_bookings where id=p_booking and user_id=actor for update;
  if not found then raise exception 'Booking not found' using errcode='42501'; end if;
  if result.status='cancelled' then return result; end if;
  if result.status not in ('requested','confirmed') or result.starts_at <= now() then raise exception 'This booking cannot be cancelled online' using errcode='22023'; end if;
  update public.dp_bookings set status='cancelled',updated_at=now() where id=p_booking returning * into result;
  insert into public.dp_booking_events(booking_id,actor_id,status) values(result.id,actor,'cancelled');
  return result;
end $$;

create function public.dp_publish_slot(p_start timestamptz) returns public.dp_slots
language plpgsql security definer set search_path = '' as $$
declare actor uuid := dp_private.actor(); result public.dp_slots;
begin
  perform 1 from public.dp_staff where user_id=actor and enabled for update;
  if not found then raise exception 'Active adviser access required' using errcode='42501'; end if;
  if p_start is null or p_start <= now() or p_start > now()+interval '90 days' then raise exception 'Choose a future time within 90 days' using errcode='22023'; end if;
  if exists(select 1 from public.dp_slots where adviser_id=actor and enabled and starts_at < p_start+interval '30 minutes' and ends_at > p_start) then
    raise exception 'This overlaps published availability' using errcode='22023';
  end if;
  insert into public.dp_slots(adviser_id,starts_at,ends_at) values(actor,p_start,p_start+interval '30 minutes')
    on conflict(adviser_id,starts_at) do update set enabled=true returning * into result;
  return result;
end $$;

create function public.dp_close_slot(p_slot uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := dp_private.actor();
begin
  perform 1 from public.dp_staff where user_id=actor and enabled for update;
  if not found then raise exception 'Active adviser access required' using errcode='42501'; end if;
  perform 1 from public.dp_slots where id=p_slot and adviser_id=actor for update;
  if not found then raise exception 'Slot not found' using errcode='42501'; end if;
  if exists(select 1 from public.dp_bookings where slot_id=p_slot and status <> 'cancelled') then raise exception 'Cancel the assigned booking before closing this slot' using errcode='22023'; end if;
  update public.dp_slots set enabled=false where id=p_slot;
end $$;

create function public.dp_adviser_status(p_booking uuid,p_status text) returns public.dp_bookings
language plpgsql security definer set search_path = '' as $$
declare actor uuid := dp_private.actor(); result public.dp_bookings;
begin
  if not exists(select 1 from public.dp_staff where user_id=actor and enabled) then raise exception 'Active adviser access required' using errcode='42501'; end if;
  select * into result from public.dp_bookings where id=p_booking and adviser_id=actor for update;
  if not found then raise exception 'Booking not found' using errcode='42501'; end if;
  if p_status is null or p_status not in ('confirmed','completed','cancelled') then raise exception 'Invalid appointment status' using errcode='22023'; end if;
  if result.status=p_status then return result; end if;
  if (p_status='confirmed' and (result.status <> 'requested' or result.starts_at <= now()))
    or (p_status='completed' and (result.status <> 'confirmed' or result.ends_at > now()))
    or (p_status='cancelled' and result.status not in ('requested','confirmed')) then
    raise exception 'This status transition is not allowed' using errcode='22023';
  end if;
  update public.dp_bookings set status=p_status,updated_at=now() where id=p_booking returning * into result;
  insert into public.dp_booking_events(booking_id,actor_id,status) values(result.id,actor,p_status);
  return result;
end $$;

create function public.dp_adviser_bookings()
returns table(booking jsonb,customer_name text,customer_phone text)
language plpgsql security definer set search_path = '' as $$
declare actor uuid := dp_private.actor();
begin
  if not exists(select 1 from public.dp_staff where user_id=actor and enabled) then raise exception 'Active adviser access required' using errcode='42501'; end if;
  return query select to_jsonb(b),p.display_name,u.phone from public.dp_bookings b
    join public.dp_profiles p on p.user_id=b.user_id join auth.users u on u.id=b.user_id
    where b.adviser_id=actor order by b.starts_at desc limit 200;
end $$;

-- PostgreSQL functions are executable by PUBLIC by default: remove that grant.
revoke all on function dp_private.actor() from public,anon,authenticated;
revoke all on function public.dp_save_profile(text,text), public.dp_quote(text,text), public.dp_availability(text),
  public.dp_book(uuid,uuid,text,text,text,uuid,integer), public.dp_cancel(uuid), public.dp_publish_slot(timestamptz),
  public.dp_close_slot(uuid), public.dp_adviser_status(uuid,text), public.dp_adviser_bookings() from public,anon,authenticated;
grant execute on function public.dp_save_profile(text,text), public.dp_quote(text,text), public.dp_availability(text),
  public.dp_book(uuid,uuid,text,text,text,uuid,integer), public.dp_cancel(uuid), public.dp_publish_slot(timestamptz),
  public.dp_close_slot(uuid), public.dp_adviser_status(uuid,text), public.dp_adviser_bookings() to authenticated;
commit;
