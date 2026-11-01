-- Freeze approved change rules when the customer submits, not when an operator later reviews.
begin;
create or replace function public.dp_request_booking_change(p_booking uuid,p_request uuid,p_kind text,p_slot uuid,p_reason text) returns public.dp_booking_changes
language plpgsql security definer set search_path='' as $$
declare actor uuid:=dp_private.actor(); b public.dp_bookings; result public.dp_booking_changes; policy dp_private.commercial_policy;
begin
  select * into b from public.dp_bookings where id=p_booking for update;
  if not found or b.user_id<>actor or not dp_private.case_access_as(b.id,actor) then raise exception 'Booking access denied' using errcode='42501'; end if;
  select * into result from public.dp_booking_changes where request_id=p_request;
  if found then
    if result.booking_id<>p_booking or result.kind<>p_kind or result.target_slot is distinct from p_slot or result.reason<>btrim(p_reason)
      then raise exception 'Change request already used with different details'; end if;
    return result;
  end if;
  if b.status not in ('requested','confirmed') or (b.consultation_type<>'urgent' and b.starts_at<=now()) then raise exception 'This booking cannot be changed online'; end if;
  if p_kind='reschedule' and (b.consultation_type='urgent' or p_slot=b.slot_id) then raise exception 'Choose a different clinic appointment'; end if;
  if exists(select 1 from public.dp_booking_changes where booking_id=p_booking and state='pending') then raise exception 'A change is already awaiting review'; end if;
  select * into policy from dp_private.commercial_policy where id;
  insert into public.dp_booking_changes(booking_id,user_id,request_id,kind,target_slot,reason,policy_snapshot)
    values(b.id,actor,p_request,p_kind,p_slot,btrim(p_reason),case when policy.cancellation_approved then to_jsonb(policy) end) returning * into result;
  return result;
end $$;

create or replace function public.dp_review_booking_change(p_id uuid,p_approve boolean,p_note text) returns public.dp_booking_changes
language plpgsql security definer set search_path='' as $$
declare actor uuid:=dp_private.payment_operator(); r public.dp_booking_changes; b public.dp_bookings;
  policy dp_private.commercial_policy; slot public.dp_slots; client uuid; booking uuid; percent integer; paid integer;
begin
  if p_approve is null or p_note is null or length(btrim(p_note)) not between 10 and 500 then raise exception 'Record the review decision and reason'; end if;
  select user_id,booking_id into client,booking from public.dp_booking_changes where id=p_id;
  if not found then raise exception 'Change request unavailable'; end if;
  -- Same client-first lock as booking creation, then lock the booking/request.
  perform 1 from public.dp_profiles where user_id=client for update;
  select * into b from public.dp_bookings where id=booking for update;
  select * into r from public.dp_booking_changes where id=p_id for update;
  if r.state<>'pending' then return r; end if;
  if not p_approve then
    update public.dp_booking_changes set state='rejected',review_note=btrim(p_note),reviewed_by=actor,reviewed_at=now() where id=p_id returning * into r;
    return r;
  end if;
  if r.policy_snapshot is null then raise exception 'Commercial change rules were not approved when this request was submitted; reject it and ask for a new request after approval'; end if;
  select * into policy from jsonb_populate_record(null::dp_private.commercial_policy,r.policy_snapshot);
  if policy.cancellation_approved is distinct from true then raise exception 'Commercial change rules are not approved'; end if;
  if b.status not in ('requested','confirmed') or not dp_private.case_access_as(b.id,b.user_id) then raise exception 'Booking is no longer changeable'; end if;
  if b.consultation_type<>'urgent' and b.starts_at<=now() then raise exception 'The appointment has started; handle the case offline'; end if;
  -- Eligibility uses request time, so operator delay cannot move a timely request into a late band.
  percent:=case when b.starts_at-r.created_at>make_interval(hours=>policy.cutoff_hours) then policy.refund_before_percent
    when not policy.late_manual_review then policy.refund_after_percent end;
  if r.kind='reschedule' then
    select * into slot from public.dp_slots where id=r.target_slot;
    if not found then raise exception 'Target appointment unavailable'; end if;
    perform 1 from public.dp_staff where user_id=slot.adviser_id and enabled for update;
    if not found or slot.adviser_id=b.user_id then raise exception 'Target adviser unavailable'; end if;
    select * into slot from public.dp_slots where id=r.target_slot for update;
    if not slot.enabled or not dp_private.slot_open(slot.starts_at)
      or exists(select 1 from public.dp_bookings where slot_id=slot.id and status<>'cancelled' and id<>b.id)
      or exists(select 1 from public.dp_bookings where user_id=b.user_id and id<>b.id and status in ('requested','confirmed') and starts_at<slot.ends_at and ends_at>slot.starts_at)
      then raise exception 'Target appointment is no longer available'; end if;
    update public.dp_bookings set slot_id=slot.id,adviser_id=slot.adviser_id,starts_at=slot.starts_at,ends_at=slot.ends_at,updated_at=now() where id=b.id;
  else
    update public.dp_bookings set status='cancelled',updated_at=now() where id=b.id;
    insert into public.dp_booking_events(booking_id,actor_id,status) values(b.id,actor,'cancelled');
    update public.dp_payment_orders set state='review_required' where booking_id=b.id and paid_at is not null;
  end if;
  select coalesce(sum(amount_minor),0) into paid from public.dp_payment_orders where booking_id=b.id and paid_at is not null;
  update public.dp_booking_changes set state='applied',review_note=btrim(p_note),reviewed_by=actor,reviewed_at=now(),
    policy_snapshot=to_jsonb(policy),suggested_refund_minor=case when r.kind='cancel' and percent is not null then floor(paid::numeric*percent/100)::integer end
    where id=p_id returning * into r;
  -- A suggestion never moves money. Operator refund requests remain separately audited/idempotent.
  return r;
end $$;

notify pgrst,'reload schema';
commit;
