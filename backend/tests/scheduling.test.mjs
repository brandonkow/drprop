import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const customer='00000000-0000-4000-8000-000000000001';
const other='00000000-0000-4000-8000-000000000002';
const adviser='00000000-0000-4000-8000-000000000003';
const secondAdviser='00000000-0000-4000-8000-000000000004';
const unverified='00000000-0000-4000-8000-000000000005';
const request='10000000-0000-4000-8000-000000000001';
const later=(hours=24)=>new Date(Date.now()+hours*3600000).toISOString();
async function as(user,sql,args=[]) {
  return db.transaction(async tx=>{
    await tx.exec('set local role authenticated');
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);
    return (await tx.query(sql,args)).rows;
  });
}
const slot=(user=adviser,time=later())=>as(user,'select * from public.dp_publish_slot($1)',[time]).then(rows=>rows[0]);
const book=(id,opts={})=>as(opts.user??customer,'select * from public.dp_book($1,$2,$3,$4,$5,$6,$7)',[opts.request??request,id,opts.type??'clinic',opts.band??'lt300k',opts.property??'Terrace near the park',opts.follow??null,opts.expected??Math.round(({lt300k:19900,'300k-600k':39900,'gt2m':199900}[opts.band??'lt300k']) * (opts.type==='urgent'?1.5:opts.type==='review'?.5:1))]).then(rows=>rows[0]);
before(async()=>{
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key,phone text,phone_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
  await db.exec(await readFile(new URL('../../supabase/migrations/202609300001_auth_scheduling.sql',import.meta.url),'utf8'));
  const settings=(await db.query('select * from public.dp_settings')).rows[0];
  assert.equal(settings.bookings_enabled,false,'Fresh deployments must not take bookings');
  assert.equal((await db.query('select count(*)::int n from public.dp_prices where confirmed')).rows[0].n,0);
});
beforeEach(async()=>{
  await db.exec('truncate auth.users cascade; update public.dp_settings set bookings_enabled=true; update public.dp_prices set confirmed=true;');
  for(const [index,id] of [customer,other,adviser,secondAdviser,unverified].entries()) {
    await db.query('insert into auth.users values($1,$2,$3)',[id,`6012345600${index}`,id===unverified?null:new Date()]);
    await db.query('insert into public.dp_profiles(user_id,display_name) values($1,$2)',[id,`User ${index}`]);
  }
  await db.query('insert into public.dp_staff(user_id,display_name,enabled) values($1,$2,true),($3,$4,true)',[adviser,'Adviser One',secondAdviser,'Adviser Two']);
});
after(()=>db.close());

test('anonymous users cannot read customer tables or execute booking functions',async()=>{
  for(const sql of ['select * from public.dp_profiles','select * from public.dp_bookings',"select public.dp_availability('clinic')"]){
    await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role anon');await tx.query(sql);}),/permission denied/);
  }
});
test('unverified phone sessions cannot save profiles or query availability',async()=>{
  await assert.rejects(as(unverified,"select public.dp_save_profile('Alex','Tea')"),/Verified phone/);
  await assert.rejects(as(unverified,'select * from public.dp_availability()'),/Verified phone/);
});
test('profiles are scoped to their owner and user metadata cannot grant staff rights',async()=>{
  const rows=await as(customer,"select * from public.dp_save_profile(' Alex ','Tea')");assert.equal(rows[0].display_name,'Alex');
  assert.equal((await as(customer,'select * from public.dp_profiles')).length,1);
  await assert.rejects(as(customer,'update public.dp_profiles set display_name=$1 where user_id=$2',['Intruder',other]),/permission denied/);
  await assert.rejects(as(customer,'insert into public.dp_staff(user_id,display_name,enabled) values($1,$2,true)',[customer,'Admin']),/permission denied/);
  await assert.rejects(slot(customer),/adviser access/);
});
test('operators control readiness and confirmed pricing',async()=>{
  const s=await slot();await db.exec('update public.dp_settings set bookings_enabled=false');
  assert.equal((await as(customer,'select * from public.dp_availability()')).length,0);
  await assert.rejects(book(s.id),/not open/);
  await db.exec('update public.dp_settings set bookings_enabled=true; update public.dp_prices set confirmed=false');
  await assert.rejects(book(s.id),/Fees are not yet/);
  await assert.rejects(as(customer,'update public.dp_settings set bookings_enabled=true'),/permission denied/);
});
test('server prices reject invalid bands and calculate urgent/final-check cents exactly',async()=>{
  assert.equal((await as(customer,"select public.dp_quote('urgent','lt300k') fee"))[0].fee,29850);
  assert.equal((await as(customer,"select public.dp_quote('review','300k-600k') fee"))[0].fee,19950);
  await assert.rejects(as(customer,"select public.dp_quote('clinic','invented')"),/Fees are not yet/);
  await assert.rejects(as(customer,"select public.dp_quote(null,'lt300k')"),/Invalid consultation/);
});
test('a published adviser slot rejects overlapping availability and unavailable times',async()=>{
  const start=later();const s=await slot(adviser,start);
  await assert.rejects(slot(adviser,new Date(Date.parse(start)+15*60000).toISOString()),/overlaps/);
  await assert.rejects(slot(adviser,later(-1)),/future time/);
  await assert.rejects(slot(adviser,later(24*91)),/future time/);
  await as(adviser,'select public.dp_close_slot($1)',[s.id]);
  assert.equal((await as(customer,'select * from public.dp_availability()')).length,0);
  await assert.rejects(book(s.id),/no longer available/);
});
test('booking uses server identity, fee and slot time; retries return one record',async()=>{
  const s=await slot();const b=await book(s.id);const again=await book(s.id);
  assert.equal(b.id,again.id);assert.equal(b.user_id,customer);assert.equal(b.fee_minor,19900);assert.equal(b.payment_status,'unpaid');assert.equal(b.status,'requested');
  assert.equal(Date.parse(b.starts_at),Date.parse(s.starts_at));
  assert.equal((await db.query('select count(*)::int n from public.dp_booking_events')).rows[0].n,1);
  await assert.rejects(book(s.id,{property:'Changed request'}),/different details/);
  await assert.rejects(as(customer,"update public.dp_bookings set payment_status='paid',fee_minor=1"),/permission denied/);
});
test('occupied slots cannot be claimed by a second customer or hidden adviser',async()=>{
  const s=await slot();await book(s.id);
  await assert.rejects(book(s.id,{user:other}),/no longer available/);
  assert.equal((await as(other,'select * from public.dp_availability()')).length,0);
  await assert.rejects(as(adviser,'select public.dp_close_slot($1)',[s.id]),/Cancel the assigned/);
});
test('a changed or client-forged price requires a fresh reviewed quote',async()=>{
  const s=await slot();await assert.rejects(book(s.id,{expected:1}),/fee changed/);
  await db.exec("update public.dp_prices set standard_minor=21000 where band='lt300k'");
  await assert.rejects(book(s.id),/fee changed/);
  assert.equal((await book(s.id,{expected:21000})).fee_minor,21000);
  await db.exec("update public.dp_prices set standard_minor=19900 where band='lt300k'");
});
test('customers cannot overlap appointments across advisers',async()=>{
  const start=later();const a=await slot(adviser,start),b=await slot(secondAdviser,start);await book(a.id);
  await assert.rejects(book(b.id,{request:'10000000-0000-4000-8000-000000000002'}),/overlaps another/);
});
test('customers have an enforced limit on upcoming reservations',async()=>{
  for(let i=0;i<3;i++){const s=await slot(adviser,later(24+i));await book(s.id,{request:`10000000-0000-4000-8000-00000000000${i+1}`});}
  const fourth=await slot(adviser,later(28));await assert.rejects(book(fourth.id,{request:'10000000-0000-4000-8000-000000000004'}),/at most three/);
});
test('booking records and assigned customer contacts are private',async()=>{
  const s=await slot();const b=await book(s.id);
  assert.equal((await as(other,'select * from public.dp_bookings')).length,0);
  assert.equal((await as(secondAdviser,'select * from public.dp_bookings')).length,0);
  assert.equal((await as(customer,'select * from public.dp_bookings')).length,1);
  const assigned=await as(adviser,'select * from public.dp_adviser_bookings()');assert.equal(assigned[0].customer_phone,'60123456000');
  assert.equal((await as(secondAdviser,'select * from public.dp_adviser_bookings()')).length,0);
  await assert.rejects(as(other,'select public.dp_adviser_bookings()'),/adviser access/);
  await assert.rejects(as(other,'select public.dp_cancel($1)',[b.id]),/not found/);
});
test('cancellation is idempotent, releases the slot and preserves booking history',async()=>{
  const s=await slot();const b=await book(s.id);
  await as(customer,'select public.dp_cancel($1)',[b.id]);await as(customer,'select public.dp_cancel($1)',[b.id]);
  assert.equal((await as(customer,'select * from public.dp_availability()')).length,1);
  const replacement=await book(s.id,{user:other});assert.notEqual(replacement.id,b.id);
  assert.equal((await db.query('select count(*)::int n from public.dp_booking_events where booking_id=$1',[b.id])).rows[0].n,2);
});
test('urgent bookings require a real published slot within two hours',async()=>{
  const future=await slot();await assert.rejects(book(future.id,{type:'urgent'}),/within two hours/);
  const soon=await slot(adviser,later(1));const b=await book(soon.id,{type:'urgent'});assert.equal(b.fee_minor,29850);
  assert.equal((await as(other,"select * from public.dp_availability('urgent')")).length,0);
});
test('final checks require an owned completed non-review case at the same band',async()=>{
  const original=await book((await slot()).id);
  const next=await slot(adviser,later(26));
  await assert.rejects(book(next.id,{request:'10000000-0000-4000-8000-000000000002',type:'review',follow:original.id}),/completed consultation/);
  await db.query("update public.dp_bookings set status='completed',starts_at=now()-interval '2 hours',ends_at=now()-interval '90 minutes' where id=$1",[original.id]);
  await assert.rejects(book(next.id,{user:other,type:'review',follow:original.id}),/completed consultation/);
  await assert.rejects(book(next.id,{request:'10000000-0000-4000-8000-000000000002',type:'review',band:'gt2m',follow:original.id}),/same price band/);
  const review=await book(next.id,{request:'10000000-0000-4000-8000-000000000002',type:'review',follow:original.id});assert.equal(review.fee_minor,9950);
});
test('only the active assigned adviser can apply valid lifecycle transitions',async()=>{
  const b=await book((await slot()).id);
  await assert.rejects(as(customer,"select public.dp_adviser_status($1,'confirmed')",[b.id]),/adviser access/);
  await assert.rejects(as(secondAdviser,"select public.dp_adviser_status($1,'confirmed')",[b.id]),/not found/);
  await as(adviser,"select public.dp_adviser_status($1,'confirmed')",[b.id]);
  await assert.rejects(as(adviser,"select public.dp_adviser_status($1,'completed')",[b.id]),/not allowed/);
  await assert.rejects(as(adviser,'select public.dp_adviser_status($1,null)',[b.id]),/Invalid appointment/);
  await db.query("update public.dp_bookings set starts_at=now()-interval '2 hours',ends_at=now()-interval '90 minutes' where id=$1",[b.id]);
  await as(adviser,"select public.dp_adviser_status($1,'completed')",[b.id]);
  await assert.rejects(as(adviser,"select public.dp_adviser_status($1,'cancelled')",[b.id]),/not allowed/);
});
test('disabled advisers lose slot publication, booking and customer contact access',async()=>{
  const s=await slot();await db.query('update public.dp_staff set enabled=false where user_id=$1',[adviser]);
  await assert.rejects(book(s.id),/no longer available/);
  await assert.rejects(slot(),/adviser access/);
  await assert.rejects(as(adviser,'select * from public.dp_adviser_bookings()'),/adviser access/);
  assert.equal((await as(adviser,'select * from public.dp_slots')).length,0);
});
