/**
 * A local stand-in for a Supabase project, for the connected-app browser tests:
 * just enough of Auth (phone + code) and the REST API (tables and RPC) for the app,
 * over PGlite running the real supabase/migrations as the signed-in user, with
 * row-level security on. Never a substitute for the hosted checks in supabase/README.md.
 *
 *   node e2e/fake-supabase.mjs [port=54321]
 *
 * Every SMS code is 123456. Seeded: bookings open, prices confirmed, urgent call-backs
 * open around the clock, one adviser (+60 11 1111 1111) with times tomorrow and the
 * day after, and the Lounge board.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const port = Number(process.argv[2] ?? 54321);
const ADVISER_PHONE = '601111111111'; // +60 11-1111 1111
const CODE = '123456';
const db = new PGlite();

await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key, phone text, phone_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;`);
const dir = new URL('../supabase/migrations/', import.meta.url);
for (const f of readdirSync(dir).sort()) await db.exec(readFileSync(new URL(f, dir), 'utf8'));

const adviserId = randomUUID();
await db.query("insert into auth.users values ($1, $2, now())", [adviserId, ADVISER_PHONE]);
await db.query("insert into public.dp_profiles (user_id, display_name, drink_preference) values ($1, 'Aisyah', 'Teh tarik')", [adviserId]);
await db.query("insert into public.dp_staff values ($1, 'Aisyah', true)", [adviserId]);
// Aisyah is also a Lounge member, so the check-in test can scan her own card.
await db.query("insert into public.dp_memberships (user_id, member_no, status, renews_at) values ($1, 'PJ-0001', 'active', current_date + 30)", [adviserId]);
await db.exec(`
  update public.dp_settings set bookings_enabled = true, urgent_from = '00:00', urgent_until = '23:59:59', closed_isodow = null;
  update public.dp_prices set confirmed = true;
  update public.dp_lounge set seats_free = 3, mood = 'quiet', todays_coffee = 'Kopi Tarik · Ipoh';`);
// Times tomorrow and the day after, 10:00–12:00 Malaysia time.
for (const days of [1, 2]) {
  for (const hm of ['10:00', '10:30', '11:00', '11:30']) {
    const day = new Date(Date.now() + 8 * 3600e3 + days * 86400e3).toISOString().slice(0, 10);
    await db.query('insert into public.dp_slots (adviser_id, starts_at, ends_at) values ($1, $2, $2::timestamptz + interval \'30 minutes\')', [
      adviserId,
      `${day}T${hm}:00+08:00`,
    ]);
  }
}

/* ---------------------------------------------------------------- helpers */

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = (user) => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, role: 'authenticated', aud: 'authenticated', exp, phone: user.phone })}.fixture`;
};
const userFromAuth = (req) => {
  const raw = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  try {
    const payload = JSON.parse(Buffer.from(raw.split('.')[1] ?? '', 'base64url').toString());
    return payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
};
const userJson = (row) => ({
  id: row.id,
  aud: 'authenticated',
  role: 'authenticated',
  phone: row.phone,
  phone_confirmed_at: row.phone_confirmed_at,
  app_metadata: { provider: 'phone', providers: ['phone'] },
  user_metadata: {},
  created_at: row.phone_confirmed_at,
});

/** Runs SQL as the caller, the way PostgREST does: role + JWT subject, RLS on. */
async function asUser(sub, sql, args = []) {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${sub ? 'authenticated' : 'anon'}`);
    if (sub) await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [sub]);
    return (await tx.query(sql, args)).rows;
  });
}

const ident = (s) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw Object.assign(new Error(`bad identifier ${s}`), { status: 400 });
  return s;
};

function send(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-expose-headers': 'content-range',
  });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

const readBody = (req) =>
  new Promise((resolve) => {
    let s = '';
    req.on('data', (c) => (s += c));
    req.on('end', () => resolve(s ? JSON.parse(s) : {}));
  });

/* ---------------------------------------------------------------- server */

createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers': 'authorization,apikey,content-type,x-client-info,prefer,accept,accept-profile,content-profile,range,x-supabase-api-version',
    });
    return res.end();
  }
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);
  try {
    // ---- Auth
    if (url.pathname === '/auth/v1/otp' && req.method === 'POST') {
      const { phone } = await readBody(req);
      if (!/^\+?60\d{9,10}$/.test(phone ?? '')) return send(res, 400, { code: 400, msg: 'Invalid phone number' });
      return send(res, 200, {});
    }
    if (url.pathname === '/auth/v1/verify' && req.method === 'POST') {
      const { phone, token: code } = await readBody(req);
      if (code !== CODE) return send(res, 403, { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' });
      const digits = String(phone).replace(/^\+/, '');
      let [row] = (await db.query('select * from auth.users where phone = $1', [digits])).rows;
      if (!row) {
        row = (await db.query('insert into auth.users values ($1, $2, now()) returning *', [randomUUID(), digits])).rows[0];
      }
      const user = userJson(row);
      const access = token(user);
      return send(res, 200, { access_token: access, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: randomUUID(), user });
    }
    if (url.pathname === '/auth/v1/user' && req.method === 'GET') {
      const sub = userFromAuth(req);
      const [row] = sub ? (await db.query('select * from auth.users where id = $1', [sub])).rows : [];
      return row ? send(res, 200, userJson(row)) : send(res, 401, { code: 401, msg: 'invalid JWT' });
    }
    if (url.pathname === '/auth/v1/logout') return send(res, 204);
    if (url.pathname === '/auth/v1/health') return send(res, 200, { name: 'fixture' });

    // ---- RPC
    const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/);
    if (rpc && req.method === 'POST') {
      const fn = ident(rpc[1]);
      const args = await readBody(req);
      const names = Object.keys(args).map(ident);
      const call = `public.${fn}(${names.map((n, i) => `${n} => $${i + 1}`).join(', ')})`;
      const [meta] = (
        await db.query("select p.proretset as set, t.typtype as kind, t.typname as name from pg_proc p join pg_type t on t.oid = p.prorettype where p.proname = $1", [fn])
      ).rows;
      if (!meta) return send(res, 404, { code: 'PGRST202', message: `function ${fn} not found` });
      const values = names.map((n) => args[n]);
      if (meta.set) return send(res, 200, await asUser(userFromAuth(req), `select * from ${call}`, values));
      if (meta.name === 'void') {
        await asUser(userFromAuth(req), `select ${call}`, values);
        return send(res, 200, null);
      }
      if (meta.kind === 'c') {
        const [row] = await asUser(userFromAuth(req), `select * from ${call}`, values);
        return send(res, 200, row);
      }
      const [row] = await asUser(userFromAuth(req), `select ${call} as v`, values);
      return send(res, 200, row.v);
    }

    // ---- Tables (select only: the app writes through functions)
    const table = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
    if (table && req.method === 'GET') {
      const name = ident(table[1]);
      const where = [];
      const values = [];
      let order = '';
      let limit = '';
      let cols = '*';
      for (const [k, v] of url.searchParams) {
        if (k === 'select') cols = v === '*' ? '*' : v.split(',').map((c) => ident(c.trim())).join(', ');
        else if (k === 'order') order = `order by ${v.split(',').map((o) => { const [c, dir] = o.split('.'); return `${ident(c)} ${dir === 'desc' ? 'desc' : 'asc'}`; }).join(', ')}`;
        else if (k === 'limit') limit = `limit ${Number(v)}`;
        else {
          const [op, ...rest] = v.split('.');
          const sqlOp = { eq: '=', gte: '>=', lte: '<=', gt: '>', lt: '<' }[op];
          if (!sqlOp) return send(res, 400, { message: `unsupported filter ${op}` });
          values.push(rest.join('.'));
          where.push(`${ident(k)} ${sqlOp} $${values.length}`);
        }
      }
      const rows = await asUser(userFromAuth(req), `select ${cols} from public.${name} ${where.length ? `where ${where.join(' and ')}` : ''} ${order} ${limit}`, values);
      if ((req.headers.accept ?? '').includes('vnd.pgrst.object')) {
        return rows.length === 1 ? send(res, 200, rows[0]) : send(res, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' });
      }
      return send(res, 200, rows);
    }
    return send(res, 404, { message: `not in the fixture: ${req.method} ${url.pathname}` });
  } catch (e) {
    // Database function errors carry the client-safe sentence, as PostgREST relays them.
    return send(res, e.status ?? 400, { code: e.code ?? 'P0001', message: e.message, details: null, hint: null });
  }
}).listen(port, '127.0.0.1', () => console.log(`fake supabase on http://127.0.0.1:${port}`));
