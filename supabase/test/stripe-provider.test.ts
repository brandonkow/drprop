import Stripe from 'stripe';
import { createHmac } from 'node:crypto';
import { beforeEach,describe,expect,it,vi } from 'vitest';
import { stripeProvider,type PaymentOrder,type PaymentSession } from '../functions/_shared/stripe-provider';
import { checkoutHandler,stripeWebhookHandler } from '../functions/_shared/payments';
import { CaseError } from '../functions/_shared/cases';
const id='10000000-0000-4000-8000-000000000001';
const order:PaymentOrder={id,booking_id:id,user_id:id,amount_minor:39900,currency:'myr',mode:'test',state:'created',stripe_session_id:null,checkout_expires_at:new Date(Date.now()+3600000).toISOString()};
const stripeSession={id:'cs_test_one',metadata:{order_id:id},amount_total:39900,currency:'myr',payment_status:'unpaid',payment_intent:null,livemode:false,url:'https://checkout.stripe.com/c/pay/cs_test_one',status:'open'};
const signingSecret='whsec_local_fixture_only';
const event=(type='checkout.session.completed',live=false)=>JSON.stringify({id:'evt_test_one',type,livemode:live,data:{object:{id:'cs_test_one'}}});
const sign=(payload:string,time=Math.floor(Date.now()/1000))=>`t=${time},v1=${createHmac('sha256',signingSecret).update(`${time}.${payload}`).digest('hex')}`;

describe('Stripe SDK adapter',()=>{
  it('rejects live keys and untrusted return origins',()=>{
    expect(()=>stripeProvider('sk_live_fake',signingSecret,'https://example.com')).toThrow(/Live keys/);
    expect(()=>stripeProvider('sk_test_fake',signingSecret,'https://example.com/redirect')).toThrow(/trusted app origin/);
    expect(()=>stripeProvider('sk_test_fake',signingSecret,'http://example.com')).toThrow(/trusted app origin/);
  });
  it('sends server-owned MYR amounts, fixed expiry and a stable idempotency key to the real SDK transport',async()=>{
    const fetcher=vi.fn(async(_url:unknown,init?:RequestInit)=>{
      const body=new URLSearchParams(String(init?.body));const headers=new Headers(init?.headers);
      expect(body.get('line_items[0][price_data][unit_amount]')).toBe('39900');expect(body.get('line_items[0][price_data][currency]')).toBe('myr');
      expect(body.get('metadata[order_id]')).toBe(id);expect(body.get('locale')).toBe('en');
      expect(headers.get('idempotency-key')).toBe(`drprop-test-checkout-${id}`);
      expect(body.get('success_url')).toBe(`https://app.example.com/record/${id}?stripe=test-return`);
      return new Response(JSON.stringify(stripeSession),{headers:{'content-type':'application/json'}});
    });
    const provider=stripeProvider('sk_test_fake',signingSecret,'https://app.example.com',Stripe.createFetchHttpClient(fetcher as typeof fetch));
    await provider.create(order);await provider.create(order);expect(fetcher).toHaveBeenCalledTimes(2);
    await expect(provider.create({...order,checkout_expires_at:new Date(Date.now()-1).toISOString()})).rejects.toThrow(/reconcile/);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('verifies exact raw bytes and freshness with the Stripe SDK',async()=>{
    const provider=stripeProvider('sk_test_fake',signingSecret,'https://app.example.com');const raw=event();
    expect((await provider.verify(raw,sign(raw))).id).toBe('evt_test_one');
    await expect(provider.verify(raw+' ',sign(raw))).rejects.toThrow();
    await expect(provider.verify(raw,sign(raw,Math.floor(Date.now()/1000)-600))).rejects.toThrow();
    await expect(provider.verify(raw,'')).rejects.toThrow();
  });
});
describe('payment HTTP boundary',()=>{
  let session:PaymentSession;
  const rpc=vi.fn(async(name:string)=>name==='dp_stripe_order'?order:order);
  const authenticate=vi.fn(async(header:string)=>{if(header!=='Bearer valid')throw new CaseError('Sign in.',401);return {id,token:'valid'};});
  const provider={create:vi.fn(async()=>session),retrieve:vi.fn(async()=>session),verify:vi.fn(async(raw:string,signature:string)=>{
    const actual=stripeProvider('sk_test_fake',signingSecret,'https://app.example.com');return actual.verify(raw,signature);
  })};
  const db={authenticate,limit:async()=>{},rpc:rpc as <T>(name:string,args:Record<string,unknown>,token?:string)=>Promise<T>};
  const checkout=checkoutHandler(db,provider,true);const webhook=stripeWebhookHandler(db,provider);
  beforeEach(()=>{vi.clearAllMocks();session={id:'cs_test_one',orderId:id,amount:39900,currency:'myr',paid:false,live:false,paymentIntent:null,url:'https://checkout.stripe.com/c/pay/cs_test_one',status:'open'};});
  const request=(body:unknown,authorization='Bearer valid')=>new Request('https://function/checkout',{method:'POST',headers:{authorization,'content-type':'application/json'},body:JSON.stringify(body)});
  const hook=(raw=event(),signature=sign(raw))=>webhook(new Request('https://function/webhook',{method:'POST',headers:{'stripe-signature':signature},body:raw}));
  it('defaults disabled, authenticates and ignores client price/redirect fields',async()=>{
    expect((await checkoutHandler(db,provider,false)(request({bookingId:id}))).status).toBe(503);
    expect((await checkout(request({bookingId:id},''))).status).toBe(401);
    const response=await checkout(request({bookingId:id,amount:1,currency:'usd',returnUrl:'https://attacker.example'}));expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('dp_stripe_order',{p_booking:id},'valid');expect(provider.create).toHaveBeenCalledWith(order);
    expect(rpc.mock.calls.some(([name])=>name==='dp_stripe_paid')).toBe(false);
  });
  it('rejects mismatched or live sessions and an untrusted checkout URL',async()=>{
    for(const change of [{amount:1},{currency:'usd'},{live:true},{orderId:'other'},{url:'https://attacker.example/checkout'}]){
      const original={...session};Object.assign(session,change);expect((await checkout(request({bookingId:id}))).status).not.toBe(200);session=original;
    }
  });
  it('does not settle invalid signatures, live events or unpaid checkouts',async()=>{
    expect((await hook(event(),'invalid')).status).toBe(400);
    expect((await hook(event('checkout.session.completed',true))).status).toBe(400);
    expect((await hook()).status).toBe(200);expect(rpc).not.toHaveBeenCalled();
  });
  it('retrieves current Stripe payment data before service settlement and ignores unrelated events',async()=>{
    session.paid=true;session.paymentIntent='pi_test_one';
    expect((await hook()).status).toBe(200);expect(provider.retrieve).toHaveBeenCalledWith('cs_test_one');
    expect(rpc).toHaveBeenCalledWith('dp_stripe_paid',expect.objectContaining({p_order:id,p_amount:39900,p_currency:'myr',p_live:false,p_intent:'pi_test_one'}));
    rpc.mockClear();expect((await hook(event('customer.created'))).status).toBe(200);expect(rpc).not.toHaveBeenCalled();
  });
  it('returns retryable failure when database settlement fails rather than acknowledging a lost payment',async()=>{
    session.paid=true;session.paymentIntent='pi_test_one';rpc.mockRejectedValueOnce(new Error('Database unavailable'));
    expect((await hook()).status).toBe(503);
  });
  it('verifies refund callbacks before retrieving and recording their current provider state',async()=>{
    const operations={create:vi.fn(),retrieve:vi.fn(async()=>({id:'re_test_one',requestId:id,paymentIntent:'pi_test_one',amount:100,currency:'myr',state:'pending',live:false})),dispute:vi.fn()};
    const handler=stripeWebhookHandler(db,provider,operations);
    const raw=JSON.stringify({id:'evt_refund',type:'refund.updated',livemode:false,data:{object:{id:'re_test_one',amount:999999,status:'succeeded'}}});
    const invoke=(signature:string)=>handler(new Request('https://fixture/webhook',{method:'POST',headers:{'stripe-signature':signature},body:raw}));
    expect((await invoke('invalid')).status).toBe(400);expect(operations.retrieve).not.toHaveBeenCalled();
    expect((await invoke(sign(raw))).status).toBe(200);
    expect(operations.retrieve).toHaveBeenCalledWith('re_test_one');
    expect(rpc).toHaveBeenCalledWith('dp_refund_result',expect.objectContaining({p_refund:id,p_amount:100,p_state:'pending',p_live:false}));
  });
  it('records a verified current dispute and does not trust event-body amounts',async()=>{
    const operations={create:vi.fn(),retrieve:vi.fn(),dispute:vi.fn(async()=>({id:'du_test_one',paymentIntent:'pi_test_one',amount:39900,currency:'myr',state:'needs_response',reason:'general',due:null,live:false}))};
    const handler=stripeWebhookHandler(db,provider,operations);
    const raw=JSON.stringify({id:'evt_dispute',type:'charge.dispute.created',livemode:false,data:{object:{id:'du_test_one',amount:1}}});
    expect((await handler(new Request('https://fixture/webhook',{method:'POST',headers:{'stripe-signature':sign(raw)},body:raw}))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('dp_dispute_result',expect.objectContaining({p_id:'du_test_one',p_amount:39900,p_state:'needs_response'}));
  });
});
