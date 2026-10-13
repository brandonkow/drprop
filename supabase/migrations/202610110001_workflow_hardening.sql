-- Existing-workflow corrections. No payment or private-document features.
begin;
alter table public.dp_settings
  add column opens_at time not null default '10:00',
  add column closes_at time not null default '20:00',
  add column booking_days integer not null default 90 check (booking_days between 1 and 90),
  add constraint dp_opening_hours check (opens_at < closes_at);
alter table public.dp_bookings add column urgent_overdue_acknowledged_at timestamptz;

-- Valid until the start of the renewal date in Malaysia. No implicit grace period.
create function dp_private.member_valid(p_status text, p_renews date) returns boolean
language sql stable set search_path = '' as $$
  select p_status = 'active' and p_renews > (now() at time zone 'Asia/Kuala_Lumpur')::date
$$;
revoke all on function dp_private.member_valid(text, date) from public, anon, authenticated;

create function dp_private.slot_open(p_start timestamptz) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p_start > now() and p_start <= now() + make_interval(days => s.booking_days)
    and (s.closed_isodow is null or extract(isodow from p_start at time zone 'Asia/Kuala_Lumpur') <> s.closed_isodow)
    and (p_start at time zone 'Asia/Kuala_Lumpur')::time >= s.opens_at
    and ((p_start + interval '30 minutes') at time zone 'Asia/Kuala_Lumpur')::time <= s.closes_at
    and (p_start at time zone 'Asia/Kuala_Lumpur')::date = ((p_start + interval '30 minutes') at time zone 'Asia/Kuala_Lumpur')::date
    from public.dp_settings s), false)
$$;
revoke all on function dp_private.slot_open(timestamptz) from public, anon, authenticated;

create function public.dp_calendar() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform dp_private.actor();
  return (select jsonb_build_object('opensAt', opens_at, 'closesAt', closes_at,
    'closedIsodow', closed_isodow, 'bookingDays', booking_days) from public.dp_settings);
end $$;
revoke all on function public.dp_calendar() from public, anon, authenticated;
grant execute on function public.dp_calendar() to authenticated;


create or replace function public.dp_checkin_code() returns public.dp_checkin_codes
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := dp_private.actor();
  result public.dp_checkin_codes;
  tries integer := 0;
begin
  perform 1 from public.dp_memberships m where m.user_id = actor and dp_private.member_valid(m.status, m.renews_at) for update;
  if not found then
    raise exception 'Check-in needs an active membership' using errcode = '42501';
  end if;
  delete from public.dp_checkin_codes c
    where c.user_id = actor and (c.expires_at <= now()
       or c.code <> (
             select c2.code from public.dp_checkin_codes c2 where c2.user_id = actor order by c2.expires_at desc limit 1));
  loop
    begin
      -- gen_random_uuid() draws from a strong random source; its first 8 hex digits are random.
      insert into public.dp_checkin_codes(code, user_id, expires_at)
        values (lpad(((('x' || left(gen_random_uuid()::text, 8))::bit(32)::bigint) % 1000000)::text, 6, '0'),
                actor, now() + interval '2 minutes')
        returning * into result;
      return result;
    exception when unique_violation then
      tries := tries + 1;
      if tries >= 5 then raise; end if;
    end;
  end loop;
end $$;

create or replace function public.dp_check_in(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  desk uuid := dp_private.require_adviser();
  digits text := regexp_replace(coalesce(p_code, ''), '[^0-9]', '', 'g');
  owner_id uuid;
  used public.dp_checkin_codes;
  member public.dp_memberships;
  who public.dp_profiles;
begin
  if length(digits) = 6 then
    select c.user_id into owner_id from public.dp_checkin_codes c where c.code = digits and c.expires_at > now();
    -- Match issuance lock order: membership first, then its code. Recheck after waiting.
    select * into member from public.dp_memberships m where m.user_id = owner_id for update;
    delete from public.dp_checkin_codes c where c.code = digits and c.user_id = owner_id and c.expires_at > now() returning * into used;
  end if;
  if used.code is null then
    raise exception 'This check-in code is not valid. Ask the member to open their card again' using errcode = '22023';
  end if;
  if not coalesce(dp_private.member_valid(member.status, member.renews_at), false) then
    raise exception 'This check-in code is not valid: the membership is not active' using errcode = '22023';
  end if;
  select * into who from public.dp_profiles p where p.user_id = member.user_id;
  insert into public.dp_checkins(user_id, store_id, desk_id) values (member.user_id, member.store_id, desk);
  return jsonb_build_object('member_no', member.member_no, 'name', who.display_name, 'drink', who.drink_preference);
end $$;

create or replace function public.dp_publish_slot(p_start timestamptz) returns public.dp_slots
language plpgsql security definer set search_path = '' as $$
declare actor uuid := dp_private.require_adviser(); result public.dp_slots;
begin
  perform 1 from public.dp_staff where user_id = actor and enabled for update;
  if p_start is null or p_start <= now() or p_start > now() + interval '90 days' then
    raise exception 'Choose a future time within 90 days' using errcode = '22023';
  end if;
  if not dp_private.slot_open(p_start) then
    raise exception 'Choose a time within configured opening days, hours and booking horizon' using errcode = '22023';
  end if;
  if exists (select 1 from public.dp_slots
             where adviser_id = actor and enabled and starts_at < p_start + interval '30 minutes' and ends_at > p_start) then
    raise exception 'This overlaps published availability' using errcode = '22023';
  end if;
  insert into public.dp_slots(adviser_id, starts_at, ends_at) values (actor, p_start, p_start + interval '30 minutes')
    on conflict (adviser_id, starts_at) do update set enabled = true
    returning * into result;
  return result;
end $$;

create or replace function public.dp_availability(p_type text default 'clinic')
returns table (id uuid, adviser_name text, starts_at timestamptz, ends_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  perform dp_private.actor();
  if p_type is null or p_type not in ('clinic', 'review') then
    raise exception 'Urgent consults are call-backs and have no slots' using errcode = '22023';
  end if;
  return query
    select s.id, a.display_name, s.starts_at, s.ends_at
    from public.dp_slots s join public.dp_staff a on a.user_id = s.adviser_id
    where s.enabled and a.enabled and dp_private.slot_open(s.starts_at)
      and exists (select 1 from public.dp_settings where bookings_enabled)
      and not exists (select 1 from public.dp_bookings b where b.slot_id = s.id and b.status <> 'cancelled')
    order by s.starts_at, s.id
    ;
end $$;

create or replace function public.dp_book(
  p_request uuid, p_slot uuid, p_type text, p_band text, p_property text,
  p_follow_up uuid default null, p_expected_fee integer default null
) returns public.dp_bookings
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := dp_private.actor();
  slot public.dp_slots;
  prior public.dp_bookings;
  result public.dp_bookings;
  adviser uuid;
  fee integer;
  t0 timestamptz;
  t1 timestamptz;
begin
  if p_request is null or p_property is null or length(btrim(p_property)) not between 1 and 80 then
    raise exception 'A request ID and a short name for the property are required' using errcode = '22023';
  end if;
  -- Serialize this customer's requests before checking limits and overlaps.
  perform 1 from public.dp_profiles where user_id = actor for update;
  if not found then raise exception 'Complete your profile first' using errcode = '22023'; end if;

  select * into prior from public.dp_bookings where user_id = actor and request_id = p_request;
  if found then
    if prior.slot_id is distinct from p_slot or prior.consultation_type is distinct from p_type
       or prior.price_band is distinct from p_band or prior.property_label is distinct from btrim(p_property)
       or prior.follow_up_of is distinct from p_follow_up or prior.fee_minor is distinct from p_expected_fee then
      raise exception 'Request ID already used with different details' using errcode = '22023';
    end if;
    return prior;
  end if;

  if not exists (select 1 from public.dp_settings where bookings_enabled) then
    raise exception 'Bookings are not open yet' using errcode = '22023';
  end if;
  fee := public.dp_quote(p_type, p_band);
  if fee is distinct from p_expected_fee then
    raise exception 'The fee changed. Review the current quote before booking' using errcode = '22023';
  end if;

  if p_type = 'urgent' then
    if p_slot is not null then raise exception 'Urgent consults are call-backs and have no slots' using errcode = '22023'; end if;
    if not public.dp_urgent_open() then
      raise exception 'Urgent call-backs are closed right now' using errcode = '22023';
    end if;
    t0 := now();
    t1 := now() + interval '2 hours';
  else
    if p_slot is null then raise exception 'Choose an appointment' using errcode = '22023'; end if;
    select s.adviser_id into adviser from public.dp_slots s where s.id = p_slot;
    -- The same adviser lock is taken when publishing or closing availability.
    perform 1 from public.dp_staff where user_id = adviser and enabled for update;
    if not found then raise exception 'This appointment is no longer available' using errcode = '22023'; end if;
    select * into slot from public.dp_slots where id = p_slot for update;
    if not slot.enabled or not dp_private.slot_open(slot.starts_at)
       or exists (select 1 from public.dp_bookings where slot_id = p_slot and status <> 'cancelled') then
      raise exception 'This appointment is no longer available' using errcode = '22023';
    end if;
    if adviser = actor then raise exception 'You cannot book your own availability' using errcode = '22023'; end if;
    t0 := slot.starts_at;
    t1 := slot.ends_at;
  end if;

  if p_type = 'review' then
    -- A pre-signing review follows a diagnosis of the same property band.
    if not exists (
      select 1 from public.dp_bookings
      where id = p_follow_up and user_id = actor and status = 'completed' and consultation_type <> 'review'
    ) then
      raise exception 'A pre-signing review needs your completed consultation' using errcode = '22023';
    end if;
    if not exists (select 1 from public.dp_bookings where id = p_follow_up and price_band = p_band) then
      raise exception 'A pre-signing review keeps the same price band as its consultation' using errcode = '22023';
    end if;
  elsif p_follow_up is not null then
    raise exception 'Only a pre-signing review can follow an earlier consultation' using errcode = '22023';
  end if;

  if (select count(*) from public.dp_bookings
      where user_id = actor and status in ('requested', 'confirmed') and ends_at > now()) >= 3 then
    raise exception 'You can have at most three upcoming bookings' using errcode = '22023';
  end if;
  if exists (select 1 from public.dp_bookings
             where user_id = actor and status in ('requested', 'confirmed') and starts_at < t1 and ends_at > t0) then
    raise exception 'This overlaps another booking of yours' using errcode = '22023';
  end if;

  insert into public.dp_bookings(user_id, adviser_id, slot_id, request_id, consultation_type, price_band,
                                 property_label, follow_up_of, fee_minor, starts_at, ends_at)
    values (actor, adviser, p_slot, p_request, p_type, p_band, btrim(p_property), p_follow_up, fee, t0, t1)
    returning * into result;
  insert into public.dp_booking_events(booking_id, actor_id, status) values (result.id, actor, 'requested');
  return result;
end $$;

drop function public.dp_take_urgent(uuid);

create or replace function public.dp_take_urgent(p_booking uuid, p_allow_overdue boolean default false) returns public.dp_bookings
language plpgsql security definer set search_path = '' as $$
declare actor uuid := dp_private.require_adviser(); result public.dp_bookings;
begin
  select * into result from public.dp_bookings
    where id = p_booking and consultation_type = 'urgent' and adviser_id is null for update;
  if not found then raise exception 'This call-back has already been taken' using errcode = '22023'; end if;
  if result.status <> 'requested' then raise exception 'This call-back is no longer open' using errcode = '22023'; end if;
  if result.user_id = actor then raise exception 'You cannot take your own call-back' using errcode = '22023'; end if;
  if result.ends_at <= now() and not coalesce(p_allow_overdue, false) then
    raise exception 'This call-back is overdue. Acknowledge recovery before taking it' using errcode = '22023';
  end if;
  update public.dp_bookings set urgent_overdue_acknowledged_at = case when result.ends_at <= now() then now() else null end, adviser_id = actor, status = 'confirmed', updated_at = now()
    where id = p_booking returning * into result;
  insert into public.dp_booking_events(booking_id, actor_id, status) values (result.id, actor, case when result.urgent_overdue_acknowledged_at is not null then 'overdue_recovery' else 'confirmed' end);
  return result;
end $$;

revoke all on function public.dp_take_urgent(uuid, boolean) from public, anon, authenticated;
grant execute on function public.dp_take_urgent(uuid, boolean) to authenticated;

create or replace function public.dp_save_profile(p_name text, p_drink text default '', p_language text default 'en')
returns public.dp_profiles
language plpgsql security definer set search_path = '' as $$
declare actor uuid := dp_private.actor(); result public.dp_profiles;
begin
  if p_name is null or length(btrim(p_name)) not between 1 and 40 or p_drink is null or length(p_drink) > 80 then
    raise exception 'Enter a name of 1-40 characters and a drink of up to 80 characters' using errcode = '22023';
  end if;
  if p_language is null or p_language not in ('en', 'zh', 'ms') then
    raise exception 'Unsupported language' using errcode = '22023';
  end if;
  insert into public.dp_profiles(user_id, display_name, drink_preference, language)
    values (actor, btrim(p_name), btrim(p_drink), 'en')
  on conflict (user_id) do update
    set display_name = excluded.display_name, drink_preference = excluded.drink_preference, language = excluded.language
  returning * into result;
  return result;
end $$;

update public.dp_profiles set language = 'en' where language <> 'en';

notify pgrst, 'reload schema';
commit;
