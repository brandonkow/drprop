import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { caseHandler, CaseError, type CasePort, type Diagnosis } from '../functions/_shared/cases';

const db = new PGlite();
const owner = '00000000-0000-4000-8000-000000000001';
const stranger = '00000000-0000-4000-8000-000000000002';
const adviser = '00000000-0000-4000-8000-000000000003';
const otherAdviser = '00000000-0000-4000-8000-000000000004';
const caseId = '10000000-0000-4000-8000-000000000001';
const otherCase = '10000000-0000-4000-8000-000000000002';
const hash = 'a'.repeat(64);
const content = { summary: 'Check the remaining lease.', findings: 'The supplied page does not establish title tenure.', questions: 'Ask the lawyer for the title search.', nextSteps: 'Obtain current documents.', adviserNote: 'Information and analysis only.' };
type Row = Record<string, any>;

async function as(user: string | null, sql: string, args: unknown[] = [], service = false): Promise<Row[]> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${service ? 'service_role' : user ? 'authenticated' : 'anon'}`);
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [user ?? '']);
    return (await tx.query<Row>(sql, args)).rows;
  });
}
const admin = (sql: string, args: unknown[] = []) => as(null, sql, args, true);
const reserve = (user = owner, request = randomUUID(), case_ = caseId, name = 'Title.pdf') =>
  as(user, 'select * from public.dp_reserve_document($1,$2,$3,$4,$5,$6)', [case_,request,name,'application/pdf',123,hash]).then((rows) => rows[0]!);
async function ready() {
  const f = await reserve();
  await admin('select public.dp_finish_document($1,$2,$3,123,true)', [f.id,owner,hash]);
  return f;
}
const save = (id = randomUUID(), revision: number | null = 0, documents: string[] = [], user = adviser) =>
  as(user,'select * from public.dp_save_diagnosis($1,$2,$3,$4,$5,$6)',[caseId,id,revision,content,documents,'Title supplied by client; no independent verification.']).then((rows) => rows[0]!);
const review = (id: string, revision: number | null, submit = true, user = adviser) =>
  as(user,'select * from public.dp_review_diagnosis($1,$2,$3)',[id,revision,submit]).then((rows) => rows[0]!);
const publish = async (id: string, revision: number, user = adviser) => {
  const d = (await db.query<Row>('select * from public.dp_diagnoses where id=$1',[id])).rows[0]!;
  const key = d.state==='review' && d.revision===revision && d.reviewed_by===user
    ? (await admin('select public.dp_prepare_publication($1,$2,$3) as key',[id,revision,user]))[0]!.key
    : `${caseId}/${randomUUID()}.pdf`;
  return (await admin('select * from public.dp_publish_diagnosis($1,$2,$3,$4,$5,456)',[id,revision,user,key,hash]))[0]!;
};

describe('commercial policy and reviewed booking changes',()=>{
  const policy=()=>db.exec("update dp_private.commercial_policy set cancellation_approved=true,cutoff_hours=24,refund_before_percent=100,late_manual_review=true,approval_reference='Fictional unit-test approval only'");
  const operator=()=>db.query('insert into dp_private.payment_operators values($1,true)',[adviser]);
  const request=(kind='cancel',slot:string|null=null,requestId=randomUUID(),user=owner)=>as(user,'select * from public.dp_request_booking_change($1,$2,$3,$4,$5)',[caseId,requestId,kind,slot,'Fictional change request reason']).then(r=>r[0]!);
  const review=(requestId:string,approve=true)=>as(adviser,'select * from public.dp_review_booking_change($1,$2,$3)',[requestId,approve,'Fictional operator review note']).then(r=>r[0]!);
  const futureSlots=async()=>{
    await db.exec("update public.dp_settings set bookings_enabled=true,closed_isodow=null");
    const rows=(await db.query<Row>(`insert into public.dp_slots(adviser_id,starts_at,ends_at)
      select $1,(date_trunc('day',now() at time zone 'Asia/Kuala_Lumpur')+interval '2 days 10 hours'+n*interval '30 minutes') at time zone 'Asia/Kuala_Lumpur',
      (date_trunc('day',now() at time zone 'Asia/Kuala_Lumpur')+interval '2 days 10 hours'+(n+1)*interval '30 minutes') at time zone 'Asia/Kuala_Lumpur'
      from generate_series(0,2) n returning *`,[adviser])).rows;
    await db.query("update public.dp_bookings set consultation_type='clinic',slot_id=$2,starts_at=$3,ends_at=$4 where id=$1",[caseId,rows[0]!.id,rows[0]!.starts_at,rows[0]!.ends_at]);
    return rows;
  };
  it('defaults to unapproved policy and disabled membership charging, and denies customer edits',async()=>{
    await db.exec('update dp_private.commercial_policy set cancellation_approved=false,membership_approved=false');
    const status=(await as(owner,'select public.dp_commercial_status() as status'))[0]!.status;
    expect(status).toMatchObject({cancellationApproved:false,membershipApproved:false,membershipChargingEnabled:false,cutoffHours:null});
    await expect(as(owner,'update dp_private.commercial_policy set cancellation_approved=true')).rejects.toThrow(/permission denied/);
    await db.exec('update dp_private.commercial_policy set approval_reference=null');
    await expect(policy().then(()=>db.exec('update dp_private.commercial_policy set approval_reference=null'))).rejects.toThrow(/check constraint/);
  });
  it('deduplicates owner requests, preserves the appointment and requires approved rules before applying',async()=>{
    await db.exec('update dp_private.commercial_policy set cancellation_approved=false');await operator();
    const requestId=randomUUID();const r=await request('cancel',null,requestId);expect((await request('cancel',null,requestId)).id).toBe(r.id);
    await expect(request('cancel',null,randomUUID(),stranger)).rejects.toThrow(/denied/);
    expect(await as(stranger,'select * from public.dp_booking_changes')).toEqual([]);
    await expect(review(r.id)).rejects.toThrow(/not approved/);
    expect((await db.query<Row>('select status from public.dp_bookings where id=$1',[caseId])).rows[0]!.status).toBe('confirmed');
    expect((await review(r.id,false)).state).toBe('rejected');
  });
  it('applies an available reschedule atomically and retains its policy/reviewer snapshot',async()=>{
    await operator();await policy();const slots=await futureSlots();const r=await request('reschedule',slots[1]!.id);
    const changed=await review(r.id);expect(changed.state).toBe('applied');expect(changed.reviewed_by).toBe(adviser);
    expect(changed.policy_snapshot.approval_reference).toContain('Fictional');
    expect((await db.query<Row>('select slot_id from public.dp_bookings where id=$1',[caseId])).rows[0]!.slot_id).toBe(slots[1]!.id);
    expect((await review(r.id)).id).toBe(r.id);
  });
  it('rejects a target taken after the request without releasing the original time',async()=>{
    await operator();await policy();const slots=await futureSlots();const r=await request('reschedule',slots[1]!.id);
    await db.query("update public.dp_bookings set consultation_type='clinic',slot_id=$2,starts_at=$3,ends_at=$4 where id=$1",[otherCase,slots[1]!.id,slots[1]!.starts_at,slots[1]!.ends_at]);
    await expect(review(r.id)).rejects.toThrow(/no longer available/);
    expect((await db.query<Row>('select slot_id from public.dp_bookings where id=$1',[caseId])).rows[0]!.slot_id).toBe(slots[0]!.id);
  });
  it('records cancellation and a refund suggestion without creating a provider refund',async()=>{
    await operator();await policy();await futureSlots();const o=(await as(owner,'select * from public.dp_stripe_order($1)',[caseId]))[0]!;
    await admin('select public.dp_stripe_paid($1,$2,$3,$4,$5,$6,$7,false)',[o.id,'evt_cancel_test',hash,'cs_test_cancel','pi_cancel',29900,'myr']);
    const r=await request();expect((await review(r.id)).suggested_refund_minor).toBe(29900);
    expect((await db.query<Row>('select state from public.dp_payment_orders where id=$1',[o.id])).rows[0]!.state).toBe('review_required');
    expect((await db.query('select * from public.dp_payment_refunds')).rows).toHaveLength(0);
  });
});

describe('payment recovery, refunds and receipts',()=>{
  const createOrder=async(paid=true)=>{
    const o=(await as(owner,'select * from public.dp_stripe_order($1)',[caseId]))[0]!;
    if(paid)await admin('select public.dp_stripe_paid($1,$2,$3,$4,$5,$6,$7,false)',[o.id,'evt_test_paid',hash,'cs_test_one','pi_test_one',29900,'myr']);
    return o;
  };
  const enableOperator=()=>db.query('insert into dp_private.payment_operators values($1,true)',[adviser]);
  const prepare=(orderId:string,request=randomUUID(),amount=10000,user=adviser)=>as(user,'select * from public.dp_refund_prepare($1,$2,$3,$4)',[orderId,request,amount,'Manual sandbox refund approved']).then(r=>r[0]!);
  const refundResult=(refundId:string,state='succeeded',amount=10000,live=false)=>admin('select * from public.dp_refund_result($1,$2,$3,$4,$5,$6,$7)',[refundId,'re_test_one','pi_test_one',amount,'myr',state,live]).then(r=>r[0]!);
  it('requires a separately provisioned operator and never permits clients to mutate provider results',async()=>{
    const o=await createOrder();await expect(prepare(o.id)).rejects.toThrow(/operator access denied/);
    await enableOperator();const r=await prepare(o.id);
    expect(r.requested_by).toBe(adviser);
    await expect(as(owner,'select public.dp_refund_result($1,$2,$3,$4,$5,$6,false)',[r.id,'re_bad','pi_test_one',10000,'myr','succeeded'])).rejects.toThrow(/permission denied/);
    await db.query("update auth.users set banned_until=now()+interval '1 day' where id=$1",[adviser]);
    await expect(as(adviser,'select public.dp_payment_queue()')).rejects.toThrow(/operator access denied/);
  });
  it('reserves pending refunds, prevents over-refunds, deduplicates intent and records only verified success',async()=>{
    const o=await createOrder();await enableOperator();const request=randomUUID();const r=await prepare(o.id,request,20000);
    expect((await prepare(o.id,request,20000)).id).toBe(r.id);
    await expect(prepare(o.id,request,10000)).rejects.toThrow(/different details/);
    await expect(prepare(o.id,randomUUID(),10000)).rejects.toThrow(/exceeds/);
    await expect(refundResult(r.id,'succeeded',1)).rejects.toThrow(/does not match/);
    await expect(refundResult(r.id,'succeeded',20000,true)).rejects.toThrow(/does not match/);
    expect((await refundResult(r.id,'pending',20000)).state).toBe('pending');
    const receipt=()=>as(owner,'select public.dp_payment_receipt($1) as receipt',[o.id]).then(r=>r[0]!.receipt);
    expect((await receipt()).refundedMinor).toBe(0);
    expect((await refundResult(r.id,'succeeded',20000)).state).toBe('succeeded');
    expect((await refundResult(r.id,'pending',20000)).state).toBe('succeeded');
    expect((await receipt()).refundedMinor).toBe(20000);expect((await receipt()).label).toMatch(/TEST.*not a tax invoice/);
    await expect(as(stranger,'select public.dp_payment_receipt($1)',[o.id])).rejects.toThrow(/unavailable/);
    const history=(await as(adviser,'select public.dp_payment_history($1) as history',[o.id]))[0]!.history;
    expect(history.events.filter((e:Row)=>e.kind==='dp_payment_refunds').map((e:Row)=>e.state)).toEqual(['requested','pending','succeeded']);
  });
  it('only restarts an authoritatively expired checkout and retains earlier order history',async()=>{
    const o=await createOrder(false);
    expect((await as(owner,'select * from public.dp_stripe_retry($1)',[caseId]))[0]!.id).toBe(o.id);
    await expect(as(owner,'select public.dp_stripe_expired($1,$2,false)',[o.id,'cs_test_one'])).rejects.toThrow(/permission denied/);
    await admin('select public.dp_stripe_expired($1,$2,false)',[o.id,'cs_test_one']);
    const next=(await as(owner,'select * from public.dp_stripe_retry($1)',[caseId]))[0]!;
    expect(next.id).not.toBe(o.id);expect((await as(owner,'select * from public.dp_stripe_order($1)',[caseId]))[0]!.id).toBe(next.id);
    expect((await as(owner,'select * from public.dp_payment_orders'))).toHaveLength(2);
    await expect(as(stranger,'select public.dp_stripe_retry($1)',[caseId])).rejects.toThrow(/denied/);
  });
  it('records matched test disputes for manual review without marking bookings paid',async()=>{
    const o=await createOrder();await enableOperator();
    const args=['du_test_one','pi_test_one',29900,'myr','needs_response','general',null,false];
    await expect(as(owner,'select public.dp_dispute_result($1,$2,$3,$4,$5,$6,$7,$8)',args)).rejects.toThrow(/permission denied/);
    await admin('select public.dp_dispute_result($1,$2,$3,$4,$5,$6,$7,$8)',args);
    expect((await as(owner,'select state from public.dp_payment_orders where id=$1',[o.id]))[0]!.state).toBe('review_required');
    expect((await as(adviser,'select public.dp_payment_history($1) as history',[o.id]))[0]!.history.disputes).toHaveLength(1);
    expect((await db.query<Row>('select payment_status from public.dp_bookings where id=$1',[caseId])).rows[0]!.payment_status).toBe('unpaid');
  });
});

describe('gateway rate limits and operator health',()=>{
  it('shares a service-only bounded counter, isolates scopes and clears expired windows',async()=>{
    await expect(as(owner,'select public.dp_gateway_limit($1,$2)',['checkout',hash])).rejects.toThrow(/permission denied/);
    await db.exec('truncate dp_private.gateway_limits');
    for(let i=0;i<6;i++)expect((await admin('select public.dp_gateway_limit($1,$2) as allowed',['checkout',hash]))[0]!.allowed).toBe(true);
    expect((await admin('select public.dp_gateway_limit($1,$2) as allowed',['checkout',hash]))[0]!.allowed).toBe(false);
    expect((await admin('select public.dp_gateway_limit($1,$2) as allowed',['case-action',hash]))[0]!.allowed).toBe(true);
    await db.exec("update dp_private.gateway_limits set window_start=now()-interval '4 minutes'");
    expect((await admin('select public.dp_gateway_limit($1,$2) as allowed',['checkout',hash]))[0]!.allowed).toBe(true);
    expect((await db.query('select * from dp_private.gateway_limits')).rows).toHaveLength(1);
    await expect(admin('select public.dp_gateway_limit($1,$2)',['arbitrary',hash])).rejects.toThrow(/Invalid/);
  });
  it('keeps operational counters private and reports aggregate recovery work',async()=>{
    await expect(as(owner,'select public.dp_ops_health()')).rejects.toThrow(/permission denied/);
    const f=await reserve();await admin('select public.dp_finish_document($1,$2,$3,123,false)',[f.id,owner,hash]);
    const health=(await admin('select public.dp_ops_health() as health'))[0]!.health;
    expect(health.failedUploads).toBe(1);
    expect(JSON.stringify(health)).not.toContain(owner);expect(JSON.stringify(health)).not.toContain('Title.pdf');
  });
});

describe('Stripe test orders and settlement permissions',()=>{
  const order=()=>as(owner,'select * from public.dp_stripe_order($1)',[caseId]).then((r)=>r[0]!);
  const paid=(id:string,event='evt_test_one',amount=29900,currency='myr',live=false,h=hash)=>admin(
    'select * from public.dp_stripe_paid($1,$2,$3,$4,$5,$6,$7,$8)',[id,event,h,'cs_test_one','pi_test_one',amount,currency,live]).then((r)=>r[0]!);
  it('owns prices on the server and gives only the booking owner access',async()=>{
    const o=await order();expect(o.amount_minor).toBe(29900);expect(o.mode).toBe('test');expect((await order()).id).toBe(o.id);
    await expect(as(stranger,'select * from public.dp_stripe_order($1)',[caseId])).rejects.toThrow(/denied/);
    await expect(as(adviser,'select * from public.dp_stripe_order($1)',[caseId])).rejects.toThrow(/denied/);
    expect(await as(stranger,'select * from public.dp_payment_orders')).toEqual([]);
    await expect(as(owner,"update public.dp_payment_orders set amount_minor=1")).rejects.toThrow(/permission denied/);
  });
  it('requires service settlement and exact amount, currency, session and test mode',async()=>{
    const o=await order();
    await expect(as(owner,'select public.dp_stripe_attach($1,$2)',[o.id,'cs_test_one'])).rejects.toThrow(/permission denied/);
    await admin('select public.dp_stripe_attach($1,$2)',[o.id,'cs_test_one']);
    await expect(paid(o.id,'evt_wrong_amount',1)).rejects.toThrow(/do not match/);
    await expect(paid(o.id,'evt_wrong_currency',29900,'usd')).rejects.toThrow(/do not match/);
    await expect(paid(o.id,'evt_live',29900,'myr',true)).rejects.toThrow(/do not match/);
    await expect(admin('select public.dp_stripe_attach($1,$2)',[o.id,'cs_test_other'])).rejects.toThrow(/differs/);
    expect((await paid(o.id)).state).toBe('paid');
    expect((await db.query<Row>('select payment_status from public.dp_bookings where id=$1',[caseId])).rows[0]!.payment_status).toBe('unpaid');
  });
  it('deduplicates callbacks, rejects changed replays and does not downgrade test settlement',async()=>{
    const o=await order();const first=await paid(o.id);const again=await paid(o.id);expect(again.paid_at).toEqual(first.paid_at);
    expect((await db.query('select * from dp_private.stripe_events')).rows).toHaveLength(1);
    await expect(paid(o.id,'evt_test_one',29900,'myr',false,'b'.repeat(64))).rejects.toThrow(/replay differs/);
    expect((await paid(o.id,'evt_test_two')).state).toBe('paid');
    expect((await admin('select * from public.dp_stripe_attach($1,$2)',[o.id,'cs_test_one']))[0]!.state).toBe('paid');
  });
  it('classifies a payment arriving after cancellation for manual review, without inventing a refund policy',async()=>{
    const o=await order();await db.query("update public.dp_bookings set status='cancelled' where id=$1",[caseId]);
    expect((await paid(o.id)).state).toBe('review_required');
    await expect(order()).rejects.toThrow(/denied/);
    expect((await db.query<Row>('select status,payment_status from public.dp_bookings where id=$1',[caseId])).rows[0]).toEqual({status:'cancelled',payment_status:'unpaid'});
  });
});

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,phone text,phone_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;`);
  await db.exec(readFileSync(new URL('./storage-fixture.sql',import.meta.url),'utf8'));
  const dir = new URL('../migrations/',import.meta.url);
  for (const name of readdirSync(dir).sort()) await db.exec(readFileSync(new URL(name,dir),'utf8'));
  // Simulate an overly broad policy belonging to another feature. The case bucket must still be denied.
  await db.exec('create policy unrelated_permissive_policy on storage.objects for all to authenticated using(true) with check(true)');
}, 60_000);
afterAll(() => db.close());
beforeEach(async () => {
  await db.exec('truncate auth.users cascade; truncate storage.objects;');
  for (const [index,id] of [owner,stranger,adviser,otherAdviser].entries()) {
    await db.query('insert into auth.users values($1,$2,now())',[id,`60100000000${index}`]);
    await db.query('insert into public.dp_profiles(user_id,display_name) values($1,$2)',[id,`Person ${index}`]);
  }
  await db.query("insert into public.dp_staff values($1,'Assigned adviser',true),($2,'Other adviser',true)",[adviser,otherAdviser]);
  for (const [id,client,staff] of [[caseId,owner,adviser],[otherCase,stranger,otherAdviser]]) {
    await db.query(`insert into public.dp_bookings(id,user_id,adviser_id,request_id,consultation_type,price_band,property_label,fee_minor,starts_at,ends_at,status)
      values($1,$2,$3,$1,'urgent','lt300k','Fictional terrace',29900,now(),now()+interval '2 hours','confirmed')`,[id,client,staff]);
  }
});

describe('the deployed file gateway against real database permissions', () => {
  const pdfBytes = new TextEncoder().encode('%PDF-1.7\nFixture for gateway tests only\n%%EOF');
  const objects = new Map<string,Uint8Array>();
  let putFails=false, renderFails=false, lostPublishResponse=false, puts=0, scanFails=false, limited=false;
  const port: CasePort = {
    async scan() { if(scanFails)throw new CaseError('Document rejected by scanner.',422); },
    async limit() { if(limited)throw new CaseError('Too many requests.',429); },
    async authenticate(header) {
      const id=header.replace(/^Bearer /,'');
      if (![owner,stranger,adviser,otherAdviser].includes(id)) throw new CaseError('Sign in.',401);
      return {id,token:id};
    },
    async rpc<T>(name:string,args:Record<string,unknown>,token?:string):Promise<T> {
      const names=Object.keys(args);
      const call=`public.${name}(${names.map((n,i)=>`${n} => $${i+1}`).join(',')})`;
      const meta=(await db.query<Row>("select t.typtype from pg_proc p join pg_type t on p.prorettype=t.oid where p.proname=$1",[name])).rows[0]!;
      const rows=await as(token ?? null,meta.typtype==='c'?`select * from ${call}`:`select ${call} as value`,Object.values(args),!token);
      if(name==='dp_publish_diagnosis' && lostPublishResponse) {lostPublishResponse=false;throw new Error('Response lost after commit');}
      return (meta.typtype==='c'?rows[0]:rows[0]!.value) as T;
    },
    async canReadCase(id,token) {return (await as(token,'select id from public.dp_cases where id=$1',[id])).length===1;},
    async report(id,token) {
      const [row]=await as(token,'select * from public.dp_diagnoses where id=$1',[id]);
      if(!row)throw new CaseError('Diagnosis unavailable.',403);return row as Diagnosis;
    },
    async get(key){return objects.get(key) ?? null;},
    async put(key,bytes) {
      puts++; if(putFails)throw new Error('Storage unavailable'); if(objects.has(key))throw new Error('Object exists');
      objects.set(key,bytes);
      await db.query("insert into storage.objects(bucket_id,name) values('dp-case-files',$1)",[key]);
    },
    async remove(keys){for(const key of keys){objects.delete(key);await db.query('delete from storage.objects where name=$1',[key]);}},
    async render(){if(renderFails)throw new Error('Renderer unavailable');return pdfBytes;},
  };
  const handler=caseHandler(port);
  const upload=(user=owner,request=randomUUID(),bytes=pdfBytes,mime='application/pdf',name='Title.pdf')=>handler(new Request('https://fixture/case-files/upload',{
    method:'POST',headers:{authorization:`Bearer ${user}`,'x-case-id':caseId,'x-request-id':request,'x-file-name':encodeURIComponent(name),'content-type':mime},body:new Uint8Array(bytes),
  }));
  const action=(body:Record<string,unknown>,user=owner)=>handler(new Request('https://fixture/case-files',{method:'POST',headers:{authorization:`Bearer ${user}`,'content-type':'application/json'},body:JSON.stringify(body)}));
  beforeEach(()=>{objects.clear();putFails=false;renderFails=false;lostPublishResponse=false;puts=0;scanFails=false;limited=false;});

  it('blocks uploads before storage and rechecks safety when serving existing documents',async()=>{
    scanFails=true; expect((await upload()).status).toBe(422); expect(puts).toBe(0);
    scanFails=false; limited=true; expect((await upload()).status).toBe(429); expect(puts).toBe(0);
    limited=false; const file=await (await upload()).json();
    const grant=await (await action({action:'grant',id:file.id})).json();
    scanFails=true; expect((await action({action:'download',token:grant.token})).status).toBe(422);
    expect(await as(owner,"select event from public.dp_case_events where event='download_served'")).toHaveLength(0);
  });

  it('requires verified identity and current case access; body identity cannot override it',async()=>{
    expect((await upload('invalid')).status).toBe(401);
    expect((await upload(stranger)).status).toBe(403);
    const d=await save();const r=await review(d.id,1);
    expect((await action({action:'publish',id:d.id,revision:r.revision,actor:adviser},owner)).status).toBe(403);
    expect(objects.size).toBe(0);
  });
  it('rejects MIME spoofing, unsafe names, empty and oversized byte bodies before reserving',async()=>{
    expect((await upload(owner,randomUUID(),new TextEncoder().encode('<html>evil</html>'))).status).toBe(415);
    expect((await upload(owner,randomUUID(),pdfBytes,'image/png')).status).toBe(415);
    expect((await upload(owner,randomUUID(),pdfBytes,'application/pdf','../x.pdf')).status).toBe(400);
    expect((await upload(owner,randomUUID(),new Uint8Array())).status).toBe(413);
    expect((await upload(owner,randomUUID(),new Uint8Array(6291457))).status).toBe(413);
    expect((await db.query('select * from public.dp_case_files')).rows).toHaveLength(0);
  });
  it('retries failed uploads and a lost success response without duplicate objects',async()=>{
    const request=randomUUID();putFails=true;
    expect((await upload(owner,request)).status).toBe(503);
    expect((await as(owner,'select state from public.dp_case_files'))[0]!.state).toBe('failed');
    putFails=false; const response=await upload(owner,request);expect(response.status).toBe(200);
    const file=await response.json();expect(file.state).toBe('ready');
    expect((await (await upload(owner,request)).json()).id).toBe(file.id);
    expect(objects.size).toBe(1);expect(puts).toBe(2);
    const changed=await upload(owner,request,pdfBytes,'application/pdf','Other.pdf');expect(changed.status).not.toBe(200);
  });
  it('keeps a failed render in review, tracks attempts and publishes a retry',async()=>{
    const d=await save();const r=await review(d.id,1);renderFails=true;
    expect((await action({action:'publish',id:d.id,revision:r.revision},adviser)).status).toBe(503);
    expect((await as(adviser,'select state from public.dp_diagnoses'))[0]!.state).toBe('review');
    expect((await db.query('select * from dp_private.case_artifacts')).rows).toHaveLength(1);
    renderFails=false;
    const published=await action({action:'publish',id:d.id,revision:r.revision},adviser);expect(published.status).toBe(200);
    expect((await published.json()).state).toBe('published');expect(objects.size).toBe(1);
  });
  it('does not delete a published PDF when the commit response is lost',async()=>{
    const d=await save();const r=await review(d.id,1);lostPublishResponse=true;
    expect((await action({action:'publish',id:d.id,revision:r.revision},adviser)).status).toBe(503);
    const published=await action({action:'publish',id:d.id,revision:r.revision},adviser);expect(published.status).toBe(200);
    expect((await published.json()).state).toBe('published');expect(objects.size).toBe(1);expect(puts).toBe(1);
  });
  it('checks hash and expiry, rechecks current access, and audits only served bytes',async()=>{
    const file=await (await upload()).json();
    const grant=await (await action({action:'grant',id:file.id})).json();
    const response=await action({action:'download',token:grant.token},'');expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(pdfBytes);
    objects.set(file.storage_key,new Uint8Array([1]));
    expect((await action({action:'download',token:grant.token})).status).toBe(503);
    expect(await as(owner,"select * from public.dp_case_events where event='download_served'")).toHaveLength(1);
    await db.exec("update dp_private.case_downloads set expires_at=now()-interval '1 second'");
    expect((await action({action:'download',token:grant.token})).status).not.toBe(200);
    const staffGrant=await (await action({action:'grant',id:file.id},adviser)).json();
    await db.query('update public.dp_staff set enabled=false where user_id=$1',[adviser]);
    expect((await action({action:'download',token:staffGrant.token})).status).not.toBe(200);
  });
  it('allows only the uploader to discard unfinished uploads and release quota',async()=>{
    const f=await reserve();
    expect((await action({action:'discard',id:f.id},adviser)).status).not.toBe(200);
    expect((await action({action:'discard',id:f.id})).status).toBe(200);
    expect(await as(owner,'select * from public.dp_case_files')).toHaveLength(0);
    await expect(reserve(owner,f.request_id)).rejects.toThrow(/removed/);
    const readyFile=await (await upload()).json();
    expect((await action({action:'discard',id:readyFile.id})).status).not.toBe(200);
  });
  it('blocks finalization after cancellation and keeps registered orphan cleanup separate from published PDFs',async()=>{
    const f=await reserve();const d=await save();const r=await review(d.id,1);
    const key=(await admin('select public.dp_prepare_publication($1,$2,$3) as key',[d.id,r.revision,adviser]))[0]!.key;
    await port.put(key,pdfBytes,'application/pdf');
    await db.query("update public.dp_bookings set status='cancelled' where id=$1",[caseId]);
    await expect(admin('select public.dp_finish_document($1,$2,$3,123,true)',[f.id,owner,hash])).rejects.toThrow(/denied/);
    await expect(publish(d.id,r.revision)).rejects.toThrow(/denied/);
    await db.exec("update dp_private.case_artifacts set expires_at=now()-interval '1 second'");
    const keys=await admin('select public.dp_case_cleanup_keys() as key');expect(keys.map((r)=>r.key)).toContain(key);
    await port.remove(keys.map((r)=>r.key));expect(objects.size).toBe(0);
  });
});

describe('private case authorization and files', () => {
  it('creates one case per booking and scopes rows to owner and assigned adviser', async () => {
    expect(await as(owner,'select id from public.dp_cases')).toEqual([{id:caseId}]);
    expect(await as(adviser,'select id from public.dp_cases')).toEqual([{id:caseId}]);
    await expect(reserve(stranger)).rejects.toThrow(/not available/);
    await expect(reserve(otherAdviser)).rejects.toThrow(/not available/);
    await expect(as(null,'select * from public.dp_cases')).rejects.toThrow(/permission denied/);
    await expect(as(owner,"update public.dp_cases set status='closed'")).rejects.toThrow(/permission denied/);
  });
  it('revokes disabled, reassigned and unverified identities', async () => {
    await db.query('update public.dp_staff set enabled=false where user_id=$1',[adviser]);
    expect(await as(adviser,'select * from public.dp_cases')).toEqual([]);
    await db.query('update public.dp_bookings set adviser_id=$1 where id=$2',[otherAdviser,caseId]);
    expect(await as(otherAdviser,'select * from public.dp_cases')).toHaveLength(2);
    await db.query('update auth.users set phone_confirmed_at=null where id=$1',[owner]);
    expect(await as(owner,'select * from public.dp_cases')).toEqual([]);
    await expect(reserve()).rejects.toThrow();
  });
  it('makes reservations idempotent and refuses changed retry payloads', async () => {
    const request = randomUUID();
    const a = await reserve(owner,request);
    expect((await reserve(owner,request)).id).toBe(a.id);
    await expect(reserve(owner,request,caseId,'Different.pdf')).rejects.toThrow(/different details/);
    expect(a.storage_key).not.toContain('Title');
    expect(await as(stranger,'select * from public.dp_case_files')).toEqual([]);
  });
  it('enforces MIME, byte bounds, safe names, hash shape and case quota', async () => {
    for (const [name,mime,size,h] of [['a.pdf','text/html',123,hash],['a.pdf','application/pdf',6291457,hash],['../title.pdf','application/pdf',123,hash],['a.pdf','application/pdf',123,'bad']]) {
      await expect(as(owner,'select public.dp_reserve_document($1,$2,$3,$4,$5,$6)',[caseId,randomUUID(),name,mime,size,h])).rejects.toThrow();
    }
    for (let i=0;i<20;i++) await reserve();
    await expect(reserve()).rejects.toThrow(/20 source documents/);
  });
  it('only the service can finalize validated bytes; failed uploads can retry', async () => {
    const f = await reserve();
    await expect(as(owner,'select public.dp_finish_document($1,$2,$3,123,true)',[f.id,owner,hash])).rejects.toThrow(/permission denied/);
    await expect(admin('select public.dp_finish_document($1,$2,$3,124,true)',[f.id,owner,hash])).rejects.toThrow(/bytes do not match/);
    await admin('select public.dp_finish_document($1,$2,$3,123,false)',[f.id,owner,hash]);
    expect((await reserve(owner,f.request_id)).state).toBe('uploading');
    await admin('select public.dp_finish_document($1,$2,$3,123,true)',[f.id,owner,hash]);
    expect((await reserve(owner,f.request_id)).state).toBe('ready');
  });
  it('keeps bucket private and blocks direct storage despite unrelated permissive policies', async () => {
    const [bucket] = (await db.query<Row>("select * from storage.buckets where id='dp-case-files'")).rows;
    expect(bucket).toMatchObject({public:false,file_size_limit:6291456});
    await db.exec("insert into storage.objects(bucket_id,name) values('dp-case-files','secret')");
    expect(await as(owner,'select * from storage.objects')).toEqual([]);
    await expect(as(owner,"insert into storage.objects(bucket_id,name) values('dp-case-files','evil')")).rejects.toThrow(/row-level security/);
  });
});

describe('diagnosis review and immutable publication', () => {
  it('keeps drafts private and captures source hashes', async () => {
    const f = await ready();
    const d = await save(undefined,0,[f.id]);
    expect(d.source_snapshot).toEqual([{id:f.id,name:'Title.pdf',sha256:hash,byteSize:123}]);
    expect(await as(owner,'select * from public.dp_diagnoses')).toEqual([]);
    expect(await as(otherAdviser,'select * from public.dp_diagnoses')).toEqual([]);
    await expect(save(undefined,0,[],owner)).rejects.toThrow(/not available/);
    await expect(save(undefined,0,[randomUUID()])).rejects.toThrow(/ready source documents/);
  });
  it('rejects stale or null revisions and freezes review until explicitly returned', async () => {
    const d = await save();
    await expect(save(d.id,0)).rejects.toThrow(/changed/);
    await expect(save(d.id,null)).rejects.toThrow(/changed/);
    await expect(review(d.id,null)).rejects.toThrow(/changed/);
    const r = await review(d.id,1);
    expect(r.state).toBe('review');
    await expect(save(d.id,r.revision)).rejects.toThrow(/not a draft/);
    const draft = await review(d.id,r.revision,false);
    expect(draft.reviewed_by).toBeNull();
    expect((await save(d.id,draft.revision)).revision).toBe(4);
  });
  it('requires review and service publication; published versions are immutable and visible to owner', async () => {
    const d = await save();
    await expect(publish(d.id,1)).rejects.toThrow(/Review/);
    const r = await review(d.id,1);
    await expect(as(adviser,'select public.dp_publish_diagnosis($1,$2,$3,$4,$5,456)',[d.id,r.revision,adviser,`${caseId}/${randomUUID()}.pdf`,hash])).rejects.toThrow(/permission denied/);
    await expect(publish(d.id,1)).rejects.toThrow(/Review changed/);
    const published = await publish(d.id,r.revision);
    expect((await publish(d.id,r.revision)).pdf_file_id).toBe(published.pdf_file_id);
    expect(await as(owner,'select id from public.dp_diagnoses')).toEqual([{id:d.id}]);
    expect(await as(owner,"select id from public.dp_case_files where kind='diagnosis'")).toEqual([{id:published.pdf_file_id}]);
    await expect(save(d.id,r.revision)).rejects.toThrow(/not a draft/);
    await expect(as(adviser,"update public.dp_diagnoses set content='{}' where id=$1",[d.id])).rejects.toThrow(/permission denied/);
    expect((await save()).version).toBe(2);
    expect((await as(owner,'select * from public.dp_diagnoses'))[0]!.content).toEqual(content);
  });
  it('does not let a newly assigned adviser publish the previous adviser review', async () => {
    const d=await save(); const r=await review(d.id,1);
    await db.query('update public.dp_bookings set adviser_id=$1 where id=$2',[otherAdviser,caseId]);
    await expect(publish(d.id,r.revision)).rejects.toThrow(/access denied/);
    await expect(publish(d.id,r.revision,otherAdviser)).rejects.toThrow(/Review this/);
    const draft=await review(d.id,r.revision,false,otherAdviser);
    const reviewed=await review(d.id,draft.revision,true,otherAdviser);
    expect((await publish(d.id,reviewed.revision,otherAdviser)).reviewed_by).toBe(otherAdviser);
  });
  it('rejects cancelled and closed case edits', async () => {
    await db.query("update public.dp_bookings set status='cancelled' where id=$1",[caseId]);
    await expect(save()).rejects.toThrow(/not available/);
    await db.query("update public.dp_bookings set status='completed' where id=$1",[caseId]);
    await db.query("update public.dp_cases set status='closed' where id=$1",[caseId]);
    await expect(reserve()).rejects.toThrow(/not available/);
  });
});

describe('expiring access, audit and retention', () => {
  it('denies other clients and not-ready files; records grants separately from served downloads', async () => {
    const f=await reserve();
    await expect(admin('select public.dp_issue_case_download($1,$2,$3)',[f.id,owner,hash])).rejects.toThrow(/access denied/);
    await admin('select public.dp_finish_document($1,$2,$3,123,true)',[f.id,owner,hash]);
    await expect(admin('select public.dp_issue_case_download($1,$2,$3)',[f.id,stranger,hash])).rejects.toThrow(/access denied/);
    await expect(as(owner,'select public.dp_issue_case_download($1,$2,$3)',[f.id,owner,hash])).rejects.toThrow(/permission denied/);
    await admin('select public.dp_issue_case_download($1,$2,$3)',[f.id,owner,hash]);
    expect((await admin('select * from public.dp_resolve_case_download($1)',[hash]))[0]!.id).toBe(f.id);
    expect(await as(owner,"select event from public.dp_case_events where event='download_served'")).toEqual([]);
    await admin('select public.dp_record_case_download($1)',[hash]);
    expect(await as(owner,"select event from public.dp_case_events where event='download_served'")).toHaveLength(1);
    await db.exec("update dp_private.case_downloads set expires_at=now()-interval '1 second'");
    await expect(admin('select public.dp_resolve_case_download($1)',[hash])).rejects.toThrow(/expired/);
  });
  it('rechecks current adviser access at download time', async () => {
    const f=await ready();
    await admin('select public.dp_issue_case_download($1,$2,$3)',[f.id,adviser,hash]);
    await db.query('update public.dp_staff set enabled=false where user_id=$1',[adviser]);
    await expect(admin('select public.dp_resolve_case_download($1)',[hash])).rejects.toThrow(/revoked/);
  });
  it('revokes existing grants when an account is banned and never sweeps a published PDF',async()=>{
    const f=await ready();const d=await save();const r=await review(d.id,1);const p=await publish(d.id,r.revision);
    await admin('select public.dp_issue_case_download($1,$2,$3)',[f.id,owner,hash]);
    await db.query("update auth.users set banned_until=now()+interval '1 day' where id=$1",[owner]);
    await expect(admin('select public.dp_resolve_case_download($1)',[hash])).rejects.toThrow(/revoked/);
    expect(await as(owner,'select * from public.dp_cases')).toHaveLength(0);
    await db.exec("update dp_private.case_artifacts set expires_at=now()-interval '1 second'");
    const keys=await admin('select public.dp_case_cleanup_keys() as key');
    const [file]=await as(adviser,'select storage_key from public.dp_case_files where id=$1',[p.pdf_file_id]);
    expect(keys.map((k)=>k.key)).not.toContain(file!.storage_key);
  });
  it('denies retained-expired cases without inventing a default retention date', async () => {
    expect((await as(owner,'select retention_until from public.dp_cases'))[0]!.retention_until).toBeNull();
    await expect(as(owner,'select public.dp_set_case_retention($1,now())',[caseId])).rejects.toThrow(/permission denied/);
    await admin('select public.dp_set_case_retention($1,now())',[caseId]);
    expect(await as(owner,'select * from public.dp_cases')).toEqual([]);
    await expect(reserve()).rejects.toThrow(/not available/);
  });
  it('revokes before erasure, requires object removal, scrubs content and supports retry', async () => {
    const f=await ready(); const d=await save(undefined,0,[f.id]);
    const reviewed=await review(d.id,1); await publish(d.id,reviewed.revision);
    await db.query("insert into storage.objects(bucket_id,name) values('dp-case-files',$1)",[f.storage_key]);
    await admin('select public.dp_issue_case_download($1,$2,$3)',[f.id,owner,hash]);
    await expect(admin('select public.dp_finish_case_erasure($1)',[caseId])).rejects.toThrow(/Revoke/);
    const keys=await admin('select * from public.dp_begin_case_erasure($1)',[caseId]); expect(keys).toHaveLength(2);
    expect(await as(owner,'select * from public.dp_cases')).toEqual([]);
    await expect(admin('select public.dp_resolve_case_download($1)',[hash])).rejects.toThrow(/expired/);
    await expect(admin('select public.dp_finish_case_erasure($1)',[caseId])).rejects.toThrow(/outstanding file operations/);
    await db.exec("update public.dp_case_files set write_lease_until=now()-interval '1 second'; update dp_private.case_artifacts set expires_at=now()-interval '1 second'");
    await expect(admin('select public.dp_finish_case_erasure($1)',[caseId])).rejects.toThrow(/Remove stored objects/);
    expect(await admin('select * from public.dp_begin_case_erasure($1)',[caseId])).toHaveLength(2);
    await db.exec('delete from storage.objects');
    await admin('select public.dp_finish_case_erasure($1)',[caseId]);
    await admin('select public.dp_finish_case_erasure($1)',[caseId]);
    expect((await db.query<Row>('select * from public.dp_diagnoses where id=$1',[d.id])).rows[0]).toMatchObject({state:'erased',content:{},source_snapshot:[],external_sources:''});
    expect((await db.query<Row>('select name from public.dp_case_files where case_id=$1',[caseId])).rows.every((row)=>row.name==='Removed document')).toBe(true);
  });
});
