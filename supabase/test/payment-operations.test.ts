import Stripe from 'stripe';
import { describe, expect, it, vi } from 'vitest';
import { paymentOperations, stripeRefunds, type RefundRequest, type RefundResult, type RefundProvider } from '../functions/_shared/payment-operations';
import { CaseError, type CasePort } from '../functions/_shared/cases';
import type { PaymentProvider, PaymentSession } from '../functions/_shared/stripe-provider';
const id='10000000-0000-4000-8000-000000000001';
const refund:RefundRequest={id,order_id:id,request_id:id,amount_minor:10000,reason:'Approved test refund',state:'requested',stripe_refund_id:null,created_at:new Date().toISOString()};
const result:RefundResult={id:'re_test_one',requestId:id,paymentIntent:'pi_test_one',amount:10000,currency:'myr',state:'pending',live:false};
const session:PaymentSession={id:'cs_test_one',orderId:id,amount:29900,currency:'myr',paid:false,live:false,paymentIntent:null,url:null,status:'expired'};

it('uses Stripe SDK refund idempotency, exact amounts and metadata, and checks payment mode',async()=>{
  const requests:RequestInit[]=[];
  const fetcher=vi.fn(async(url:unknown,init?:RequestInit)=>{
    requests.push(init!);
    return Response.json(String(url).includes('/payment_intents/')?{id:'pi_test_one',livemode:false}:
      {id:'re_test_one',payment_intent:'pi_test_one',amount:10000,currency:'myr',status:'pending',metadata:{refund_request_id:id}});
  });
  const api=stripeRefunds('sk_test_fixture',Stripe.createFetchHttpClient(fetcher as typeof fetch));
  expect(await api.create(refund,'pi_test_one')).toEqual(result);
  const body=new URLSearchParams(String(requests[0]!.body));
  expect(body.get('amount')).toBe('10000');expect(body.get('metadata[refund_request_id]')).toBe(id);
  expect(new Headers(requests[0]!.headers).get('idempotency-key')).toBe(`drprop-test-refund-${id}`);
  await expect(api.create({...refund,created_at:new Date(Date.now()-24*3600000).toISOString()},'pi_test_one')).rejects.toThrow(/uncertain/);
  expect(fetcher).toHaveBeenCalledTimes(2);expect(()=>stripeRefunds('sk_live_no')).toThrow(/Only Stripe test/);
});

describe('operator payment HTTP boundary',()=>{
  function fixture() {
    const rpc=vi.fn(async(name:string)=>{
      if(name==='dp_payment_ops_order')return {id,booking_id:id,user_id:id,amount_minor:29900,currency:'myr',mode:'test',state:'paid',payment_intent_id:'pi_test_one',stripe_session_id:'cs_test_one'};
      if(name==='dp_refund_prepare'||name==='dp_refund_lookup')return refund;
      if(name==='dp_refund_result')return {...refund,state:'pending'};
      return [];
    });
    const db:Pick<CasePort,'authenticate'|'rpc'|'limit'>={
      authenticate:async(auth)=>{if(auth!=='Bearer valid')throw new CaseError('Sign in.',401);return {id,token:'valid'};},
      limit:vi.fn(async()=>{}),rpc:rpc as CasePort['rpc'],
    };
    const checkout:PaymentProvider={create:vi.fn(),retrieve:vi.fn(async()=>session),verify:vi.fn()};
    const refunds:RefundProvider={create:vi.fn(async()=>result),retrieve:vi.fn(async()=>result),dispute:vi.fn()};
    const handler=paymentOperations(db,checkout,refunds,true);
    const request=(body:unknown,auth='Bearer valid')=>new Request('https://fixture/ops',{method:'POST',headers:{authorization:auth},body:JSON.stringify(body)});
    return {db,rpc,checkout,refunds,handler,request};
  }
  it('authenticates and requires operator RPC permission before calling Stripe',async()=>{
    const f=fixture();expect((await f.handler(f.request({action:'refund',orderId:id},''))).status).toBe(401);
    f.rpc.mockRejectedValue(new CaseError('Operator access denied.',403));
    expect((await f.handler(f.request({action:'refund',orderId:id}))).status).toBe(403);
    expect(f.refunds.create).not.toHaveBeenCalled();expect(f.checkout.retrieve).not.toHaveBeenCalled();
  });
  it('reserves a reviewed refund before provider calls and does not settle an unrelated response',async()=>{
    const f=fixture();const body={action:'refund',orderId:id,requestId:id,amountMinor:10000,reason:'Approved test refund'};
    expect((await f.handler(f.request(body))).status).toBe(200);
    expect(f.rpc).toHaveBeenCalledWith('dp_refund_prepare',{p_order:id,p_request:id,p_amount:10000,p_reason:'Approved test refund'},'valid');
    expect(f.rpc).toHaveBeenCalledWith('dp_refund_result',expect.objectContaining({p_amount:10000,p_state:'pending',p_live:false}));
    f.rpc.mockClear();vi.mocked(f.refunds.create).mockResolvedValue({...result,requestId:'20000000-0000-4000-8000-000000000001'});
    expect((await f.handler(f.request(body))).status).toBe(409);
    expect(f.rpc.mock.calls.some(([name])=>name==='dp_refund_result')).toBe(false);
  });
  it('requires verified expired status before unlocking checkout retry',async()=>{
    const f=fixture();expect((await f.handler(f.request({action:'reconcile',orderId:id}))).status).toBe(200);
    expect(f.rpc).toHaveBeenCalledWith('dp_stripe_expired',{p_order:id,p_session:'cs_test_one',p_live:false});
    f.rpc.mockClear();vi.mocked(f.checkout.retrieve).mockResolvedValue({...session,orderId:'wrong'});
    expect((await f.handler(f.request({action:'reconcile',orderId:id}))).status).toBe(409);
    expect(f.rpc.mock.calls.some(([name])=>name==='dp_stripe_expired')).toBe(false);
  });
  it('never repeats a financial action when refreshing an uncertain refund',async()=>{
    const f=fixture();expect((await f.handler(f.request({action:'refund-status',refundId:id}))).status).toBe(409);
    expect(f.refunds.create).not.toHaveBeenCalled();
    expect((await f.handler(f.request({action:'refund-status',refundId:id,stripeRefundId:'re_test_one'}))).status).toBe(200);
    expect(f.refunds.retrieve).toHaveBeenCalledWith('re_test_one');expect(f.refunds.create).not.toHaveBeenCalled();
  });
});
