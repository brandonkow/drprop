/**
 * Runs supabase/migrations against PGlite (Postgres in-process) with a minimal
 * stand-in for Supabase Auth, and checks who can read and change what.
 * PGlite is a single connection: these tests do not prove behaviour under
 * concurrent connections on a hosted project (see supabase/README.md).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const db = new PGlite();
const customer = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const adviser = '00000000-0000-4000-8000-000000000003';
const secondAdviser = '00000000-0000-4000-8000-000000000004';
const unverified = '00000000-0000-4000-8000-000000000005';
const req = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const hoursFromNow = (h = 24) => new Date(Date.now() + h * 3_600_000).toISOString();

type Row = Record<string, any>;

/** Run SQL as a signed-in user, the way PostgREST does. */
async function as(user: string, sql: string, args: unknown[] = []): Promise<Row[]> {
  return db.transaction(async (tx) => {
    await tx.exec('set local role authenticated');
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [user]);
    return (await tx.query<Row>(sql, args)).rows;
  });
}

const FEES: Record<string, number> = { lt300k: 19900, '300k-600k': 39900, '600k-1m': 69900, '1m-2m': 119900, gt2m: 199900 };
const expectedFee = (type: string, band: string) =>
  Math.ceil((FEES[band]! * (type === 'urgent' ? 1.5 : type === 'review' ? 0.5 : 1)) / 100) * 100;

const publish = (user = adviser, at = hoursFromNow()) =>
  as(user, 'select * from public.dp_publish_slot($1)', [at]).then((r) => r[0]!);

function book(
  slot: string | null,
  o: { user?: string; request?: string; type?: string; band?: string; property?: string; follow?: string | null; fee?: number } = {},
) {
  const type = o.type ?? 'clinic';
  const band = o.band ?? 'lt300k';
  return as(o.user ?? customer, 'select * from public.dp_book($1, $2, $3, $4, $5, $6, $7)', [
    o.request ?? req(1), slot, type, band, o.property ?? 'Terrace near the park', o.follow ?? null, o.fee ?? expectedFee(type, band),
  ]).then((r) => r[0]!);
}

/** Opens urgent call-backs around the clock and every day, for tests that need them. */
const urgentAlwaysOpen = () =>
  db.exec("update public.dp_settings set urgent_from = '00:00', urgent_until = '23:59:59', closed_isodow = null");

beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key, phone text, phone_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;`);
  const dir = new URL('../migrations/', import.meta.url);
  for (const file of readdirSync(dir).sort()) await db.exec(readFileSync(new URL(file, dir), 'utf8'));
});

afterAll(() => db.close());

describe('a fresh install', () => {
  it('takes no bookings and has no confirmed price', async () => {
    expect((await db.query<Row>('select bookings_enabled from public.dp_settings')).rows[0]!.bookings_enabled).toBe(false);
    expect((await db.query<Row>('select count(*)::int n from public.dp_prices where confirmed')).rows[0]!.n).toBe(0);
  });

  it('stores the brief §3.2 fees, in sen', async () => {
    const rows = (await db.query<Row>('select band, standard_minor from public.dp_prices order by standard_minor')).rows;
    expect(Object.fromEntries(rows.map((r) => [r.band, r.standard_minor]))).toEqual(FEES);
  });
});

describe('with bookings open', () => {
  beforeEach(async () => {
    await db.exec(`truncate auth.users cascade;
      update public.dp_settings set bookings_enabled = true, urgent_from = '10:00', urgent_until = '18:00', closed_isodow = 1;
      update public.dp_prices set confirmed = true;
      update public.dp_lounge set seats_free = 0, mood = 'quiet', todays_coffee = '';`);
    for (const [i, id] of [customer, other, adviser, secondAdviser, unverified].entries()) {
      await db.query('insert into auth.users values ($1, $2, $3)', [id, `6012345600${i}`, id === unverified ? null : new Date()]);
      await db.query("insert into public.dp_profiles (user_id, display_name, drink_preference) values ($1, $2, 'Kopi-O kosong')", [id, `User ${i}`]);
    }
    await db.query('insert into public.dp_staff (user_id, display_name, enabled) values ($1, $2, true), ($3, $4, true)', [
      adviser, 'Adviser One', secondAdviser, 'Adviser Two',
    ]);
  });

  it('keeps anonymous visitors out of every table and function', async () => {
    for (const sql of ['select * from public.dp_profiles', 'select * from public.dp_bookings', "select public.dp_availability('clinic')"]) {
      await expect(db.transaction(async (tx) => { await tx.exec('set local role anon'); await tx.query(sql); })).rejects.toThrow(/permission denied/);
    }
  });

  it('requires a verified phone', async () => {
    await expect(as(unverified, "select public.dp_save_profile('Alex', 'Tea')")).rejects.toThrow(/Verified phone/);
    await expect(as(unverified, 'select * from public.dp_availability()')).rejects.toThrow(/Verified phone/);
  });

  it('scopes profiles to their owner, keeps the language, and grants no staff rights from the client', async () => {
    const [p] = await as(customer, "select * from public.dp_save_profile(' Alex ', 'Teh tarik', 'zh')");
    expect(p).toMatchObject({ display_name: 'Alex', drink_preference: 'Teh tarik', language: 'zh' });
    expect(await as(customer, 'select * from public.dp_profiles')).toHaveLength(1);
    await expect(as(customer, "select public.dp_save_profile('Alex', '', 'fr')")).rejects.toThrow(/language/);
    await expect(as(customer, 'update public.dp_profiles set display_name = $1 where user_id = $2', ['Intruder', other])).rejects.toThrow(/permission denied/);
    await expect(as(customer, "insert into public.dp_staff values ($1, 'Admin', true)", [customer])).rejects.toThrow(/permission denied/);
    await expect(publish(customer)).rejects.toThrow(/adviser access/);
  });

  it('lets only the operator open bookings and confirm prices', async () => {
    const s = await publish();
    await db.exec('update public.dp_settings set bookings_enabled = false');
    expect(await as(customer, 'select * from public.dp_availability()')).toHaveLength(0);
    await expect(book(s.id)).rejects.toThrow(/not open/);
    await db.exec('update public.dp_settings set bookings_enabled = true; update public.dp_prices set confirmed = false');
    await expect(book(s.id)).rejects.toThrow(/Fees are not yet/);
    await expect(as(customer, 'update public.dp_settings set bookings_enabled = true')).rejects.toThrow(/permission denied/);
  });

  it('quotes whole ringgit, rounded up, like brand/pricing.ts', async () => {
    const quote = async (type: string, band: string) => (await as(customer, 'select public.dp_quote($1, $2) fee', [type, band]))[0]!.fee;
    expect(await quote('clinic', 'lt300k')).toBe(19900);
    expect(await quote('urgent', 'lt300k')).toBe(29900); // RM 298.50 → RM 299
    expect(await quote('review', '300k-600k')).toBe(20000); // RM 199.50 → RM 200
    expect(await quote('urgent', 'gt2m')).toBe(299900);
    await expect(quote('clinic', 'invented')).rejects.toThrow(/Fees are not yet/);
    await expect(as(customer, "select public.dp_quote(null, 'lt300k')")).rejects.toThrow(/Invalid consultation/);
  });

  it('rejects overlapping, past and far-future availability', async () => {
    const at = hoursFromNow();
    const s = await publish(adviser, at);
    await expect(publish(adviser, new Date(Date.parse(at) + 15 * 60_000).toISOString())).rejects.toThrow(/overlaps/);
    await expect(publish(adviser, hoursFromNow(-1))).rejects.toThrow(/future time/);
    await expect(publish(adviser, hoursFromNow(24 * 91))).rejects.toThrow(/future time/);
    await as(adviser, 'select public.dp_close_slot($1)', [s.id]);
    expect(await as(customer, 'select * from public.dp_availability()')).toHaveLength(0);
    await expect(book(s.id)).rejects.toThrow(/no longer available/);
  });

  it('books with the server identity, fee and time; a retry returns the same booking', async () => {
    const s = await publish();
    const b = await book(s.id);
    const again = await book(s.id);
    expect(again.id).toBe(b.id);
    expect(b).toMatchObject({ user_id: customer, adviser_id: adviser, fee_minor: 19900, payment_status: 'unpaid', status: 'requested' });
    expect(Date.parse(b.starts_at)).toBe(Date.parse(s.starts_at));
    expect((await db.query<Row>('select count(*)::int n from public.dp_booking_events')).rows[0]!.n).toBe(1);
    await expect(book(s.id, { property: 'Changed' })).rejects.toThrow(/different details/);
    await expect(as(customer, "update public.dp_bookings set fee_minor = 1")).rejects.toThrow(/permission denied/);
  });

  it('gives a slot to one customer only', async () => {
    const s = await publish();
    await book(s.id);
    await expect(book(s.id, { user: other })).rejects.toThrow(/no longer available/);
    expect(await as(other, 'select * from public.dp_availability()')).toHaveLength(0);
    await expect(as(adviser, 'select public.dp_close_slot($1)', [s.id])).rejects.toThrow(/Cancel the booking/);
  });

  it('asks for a fresh quote when the client sends a different fee or the price changes', async () => {
    const s = await publish();
    await expect(book(s.id, { fee: 1 })).rejects.toThrow(/fee changed/);
    await db.exec("update public.dp_prices set standard_minor = 21000 where band = 'lt300k'");
    await expect(book(s.id)).rejects.toThrow(/fee changed/);
    expect((await book(s.id, { fee: 21000 })).fee_minor).toBe(21000);
    await db.exec("update public.dp_prices set standard_minor = 19900 where band = 'lt300k'");
  });

  it('never double-books a customer, and caps upcoming bookings at three', async () => {
    const at = hoursFromNow();
    const a = await publish(adviser, at);
    const b = await publish(secondAdviser, at);
    await book(a.id);
    await expect(book(b.id, { request: req(2) })).rejects.toThrow(/overlaps another/);
    for (let i = 1; i <= 2; i++) await book((await publish(adviser, hoursFromNow(24 + i))).id, { request: req(10 + i) });
    await expect(book((await publish(adviser, hoursFromNow(30))).id, { request: req(20) })).rejects.toThrow(/at most three/);
  });

  it('keeps bookings and client contacts private to the client and their adviser', async () => {
    const b = await book((await publish()).id);
    expect(await as(other, 'select * from public.dp_bookings')).toHaveLength(0);
    expect(await as(secondAdviser, 'select * from public.dp_bookings')).toHaveLength(0);
    expect(await as(customer, 'select * from public.dp_bookings')).toHaveLength(1);
    const [mine] = await as(adviser, 'select * from public.dp_adviser_bookings()');
    expect(mine).toMatchObject({ customer_phone: '60123456000', customer_drink: 'Kopi-O kosong' });
    expect(await as(secondAdviser, 'select * from public.dp_adviser_bookings()')).toHaveLength(0);
    await expect(as(other, 'select public.dp_adviser_bookings()')).rejects.toThrow(/adviser access/);
    await expect(as(other, 'select public.dp_cancel($1)', [b.id])).rejects.toThrow(/not found/);
  });

  it('cancels idempotently, frees the slot and keeps the history', async () => {
    const s = await publish();
    const b = await book(s.id);
    await as(customer, 'select public.dp_cancel($1)', [b.id]);
    await as(customer, 'select public.dp_cancel($1)', [b.id]);
    expect(await as(customer, 'select * from public.dp_availability()')).toHaveLength(1);
    expect((await book(s.id, { user: other })).id).not.toBe(b.id);
    expect((await db.query<Row>('select count(*)::int n from public.dp_booking_events where booking_id = $1', [b.id])).rows[0]!.n).toBe(2);
  });

  it('takes urgent consults as call-backs within opening hours, for any free adviser to take', async () => {
    const s = await publish();
    await expect(book(s.id, { type: 'urgent' })).rejects.toThrow(/no slots/);
    await expect(as(customer, "select * from public.dp_availability('urgent')")).rejects.toThrow(/call-backs/);

    await db.exec("update public.dp_settings set urgent_from = '00:00', urgent_until = '00:00:01', closed_isodow = null");
    await expect(book(null, { type: 'urgent' })).rejects.toThrow(/closed right now/);

    await urgentAlwaysOpen();
    const u = await book(null, { type: 'urgent' });
    expect(u).toMatchObject({ adviser_id: null, slot_id: null, fee_minor: 29900, status: 'requested' });
    expect(Date.parse(u.ends_at) - Date.parse(u.starts_at)).toBe(2 * 3_600_000);

    // Both advisers see the open call-back; the first to take it owns it.
    expect(await as(secondAdviser, 'select * from public.dp_adviser_bookings()')).toHaveLength(1);
    await expect(as(customer, 'select public.dp_take_urgent($1)', [u.id])).rejects.toThrow(/adviser access/);
    const [taken] = await as(adviser, 'select * from public.dp_take_urgent($1)', [u.id]);
    expect(taken).toMatchObject({ adviser_id: adviser, status: 'confirmed' });
    await expect(as(secondAdviser, 'select public.dp_take_urgent($1)', [u.id])).rejects.toThrow(/already been taken/);
    expect(await as(secondAdviser, 'select * from public.dp_adviser_bookings()')).toHaveLength(0);
    const [done] = await as(adviser, "select * from public.dp_adviser_status($1, 'completed')", [u.id]);
    expect(done!.status).toBe('completed');
  });

  it('closes urgent call-backs on the closed day', async () => {
    await db.exec(`update public.dp_settings set urgent_from = '00:00', urgent_until = '23:59:59',
      closed_isodow = extract(isodow from now() at time zone 'Asia/Kuala_Lumpur')::int`);
    expect((await as(customer, 'select public.dp_urgent_open() open'))[0]!.open).toBe(false);
  });

  it('allows a pre-signing review only after the client’s own completed consult, in the same band', async () => {
    const original = await book((await publish()).id);
    const next = await publish(adviser, hoursFromNow(26));
    await expect(book(next.id, { request: req(2), type: 'review', follow: original.id })).rejects.toThrow(/completed consultation/);
    await db.query("update public.dp_bookings set status = 'completed', starts_at = now() - interval '2 hours', ends_at = now() - interval '90 minutes' where id = $1", [original.id]);
    await expect(book(next.id, { user: other, type: 'review', follow: original.id })).rejects.toThrow(/completed consultation/);
    await expect(book(next.id, { request: req(2), type: 'review', band: 'gt2m', follow: original.id })).rejects.toThrow(/same price band/);
    await expect(book(next.id, { request: req(3), follow: original.id })).rejects.toThrow(/Only a pre-signing review/);
    expect((await book(next.id, { request: req(2), type: 'review', follow: original.id })).fee_minor).toBe(10000);
  });

  it('lets only the assigned, active adviser move a booking through its life', async () => {
    const b = await book((await publish()).id);
    await expect(as(customer, "select public.dp_adviser_status($1, 'confirmed')", [b.id])).rejects.toThrow(/adviser access/);
    await expect(as(secondAdviser, "select public.dp_adviser_status($1, 'confirmed')", [b.id])).rejects.toThrow(/not found/);
    await as(adviser, "select public.dp_adviser_status($1, 'confirmed')", [b.id]);
    await expect(as(adviser, "select public.dp_adviser_status($1, 'completed')", [b.id])).rejects.toThrow(/not allowed/);
    await expect(as(adviser, 'select public.dp_adviser_status($1, null)', [b.id])).rejects.toThrow(/Invalid booking/);
    await db.query("update public.dp_bookings set starts_at = now() - interval '2 hours', ends_at = now() - interval '90 minutes' where id = $1", [b.id]);
    await as(adviser, "select public.dp_adviser_status($1, 'completed')", [b.id]);
    await expect(as(adviser, "select public.dp_adviser_status($1, 'cancelled')", [b.id])).rejects.toThrow(/not allowed/);
  });

  it('lets the adviser write the note and questions the client sees', async () => {
    const b = await book((await publish()).id);
    await expect(as(adviser, "select public.dp_adviser_note($1, 'Early', '{}')", [b.id])).rejects.toThrow(/confirmed or completed/);
    await as(adviser, "select public.dp_adviser_status($1, 'confirmed')", [b.id]);
    await as(adviser, 'select public.dp_adviser_note($1, $2, $3)', [b.id, ' Check the lease. ', ['How many years are left on the lease?']]);
    const [seen] = await as(customer, 'select advisor_note, questions from public.dp_bookings');
    expect(seen).toEqual({ advisor_note: 'Check the lease.', questions: ['How many years are left on the lease?'] });
    await expect(as(secondAdviser, "select public.dp_adviser_note($1, 'x', '{}')", [b.id])).rejects.toThrow(/not found/);
    await expect(as(adviser, 'select public.dp_adviser_note($1, $2, $3)', [b.id, 'x', ['']])).rejects.toThrow(/questions/);
  });

  it('shows each member only their own membership', async () => {
    await db.query("insert into public.dp_memberships (user_id, member_no, status, renews_at) values ($1, 'PJ-0001', 'active', '2027-01-01')", [customer]);
    expect(await as(customer, 'select member_no from public.dp_memberships')).toEqual([{ member_no: 'PJ-0001' }]);
    expect(await as(other, 'select * from public.dp_memberships')).toHaveLength(0);
    await expect(as(customer, "update public.dp_memberships set status = 'active'")).rejects.toThrow(/permission denied/);
  });

  it('lets advisers, and only advisers, update the Lounge board', async () => {
    await expect(as(customer, "select public.dp_set_lounge(3, 'quiet', 'Kopi Tarik')")).rejects.toThrow(/adviser access/);
    await as(adviser, "select public.dp_set_lounge(3, 'quiet', ' Kopi Tarik · Ipoh ')");
    expect(await as(customer, 'select seats_free, mood, todays_coffee from public.dp_lounge')).toEqual([
      { seats_free: 3, mood: 'quiet', todays_coffee: 'Kopi Tarik · Ipoh' },
    ]);
    await expect(as(adviser, "select public.dp_set_lounge(-1, 'quiet', '')")).rejects.toThrow(/Seats/);
  });

  it('cuts a disabled adviser off from availability, bookings and contacts', async () => {
    const s = await publish();
    await db.query('update public.dp_staff set enabled = false where user_id = $1', [adviser]);
    await expect(book(s.id)).rejects.toThrow(/no longer available/);
    await expect(publish()).rejects.toThrow(/adviser access/);
    await expect(as(adviser, 'select * from public.dp_adviser_bookings()')).rejects.toThrow(/adviser access/);
    expect(await as(adviser, 'select * from public.dp_slots')).toHaveLength(0);
  });
});
