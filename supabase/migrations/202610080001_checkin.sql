-- Lounge check-in (brief §3.3, §8.3). The member card shows a QR the front desk
-- scans. It holds a six-digit code from the server, good for two minutes and one
-- check-in, never the member number: a screenshot or a printed number stops
-- working by itself. Only an active adviser redeems a code, so six digits are
-- enough, and the desk can type them when a scan fails.
begin;

create table public.dp_checkin_codes (
  code text primary key check (code ~ '^[0-9]{6}$'),
  user_id uuid not null references public.dp_memberships(user_id) on delete cascade,
  expires_at timestamptz not null
);
create index dp_checkin_codes_user on public.dp_checkin_codes(user_id);

create table public.dp_checkins (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.dp_memberships(user_id) on delete cascade,
  store_id text not null,
  desk_id uuid not null references auth.users(id),
  checked_in_at timestamptz not null default now()
);

alter table public.dp_checkin_codes enable row level security;
alter table public.dp_checkins enable row level security;
revoke all on public.dp_checkin_codes, public.dp_checkins from public, anon, authenticated;
-- Codes stay inside the functions below. Members can read their own visits.
grant select on public.dp_checkins to authenticated;
create policy dp_own_checkins on public.dp_checkins for select to authenticated using (user_id = (select auth.uid()));

-- A fresh code for the caller's card. The previous code stays good until it
-- expires, so a card that refreshes while it is being scanned still checks in.
create function public.dp_checkin_code() returns public.dp_checkin_codes
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := dp_private.actor();
  result public.dp_checkin_codes;
  tries integer := 0;
begin
  if not exists (select 1 from public.dp_memberships m where m.user_id = actor and m.status = 'active') then
    raise exception 'Check-in needs an active membership' using errcode = '42501';
  end if;
  delete from public.dp_checkin_codes c
    where c.expires_at <= now()
       or (c.user_id = actor and c.code <> (
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

-- The front desk redeems a code (scanned, or typed: anything but the digits is
-- ignored). One use; the member's name, number and drink come back.
create function public.dp_check_in(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  desk uuid := dp_private.require_adviser();
  digits text := regexp_replace(coalesce(p_code, ''), '[^0-9]', '', 'g');
  used public.dp_checkin_codes;
  member public.dp_memberships;
  who public.dp_profiles;
begin
  if length(digits) = 6 then
    delete from public.dp_checkin_codes c where c.code = digits and c.expires_at > now() returning * into used;
  end if;
  if used.code is null then
    raise exception 'This check-in code is not valid. Ask the member to open their card again' using errcode = '22023';
  end if;
  select * into member from public.dp_memberships m where m.user_id = used.user_id;
  if member.status <> 'active' then
    raise exception 'This check-in code is not valid: the membership is not active' using errcode = '22023';
  end if;
  select * into who from public.dp_profiles p where p.user_id = member.user_id;
  insert into public.dp_checkins(user_id, store_id, desk_id) values (member.user_id, member.store_id, desk);
  return jsonb_build_object('member_no', member.member_no, 'name', who.display_name, 'drink', who.drink_preference);
end $$;

revoke all on function public.dp_checkin_code(), public.dp_check_in(text) from public, anon, authenticated;
grant execute on function public.dp_checkin_code(), public.dp_check_in(text) to authenticated;

commit;
