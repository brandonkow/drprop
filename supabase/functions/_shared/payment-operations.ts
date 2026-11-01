import Stripe from 'stripe';
import { CaseError, readBounded, sha256, type CasePort } from './cases.ts';
import type { PaymentOrder, PaymentProvider } from './stripe-provider.ts';

export interface RefundRequest { id:string; order_id:string; request_id:string; amount_minor:number; reason:string; state:string; stripe_refund_id:string|null; created_at:string }
export interface RefundResult { id:string; requestId:string; paymentIntent:string|null; amount:number; currency:string; state:string; live:boolean }
export interface DisputeResult { id:string; paymentIntent:string|null; amount:number; currency:string; state:string; reason:string; due:string|null; live:boolean }
export interface RefundProvider {
  create(refund:RefundRequest,intent:string):Promise<RefundResult>;
  retrieve(id:string):Promise<RefundResult>;
  dispute(id:string):Promise<DisputeResult>;
}
type Port=Pick<CasePort,'authenticate'|'rpc'|'limit'>;
const id=(value:unknown)=>{if(typeof value!=='string'||!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value))throw new CaseError('Choose a valid record.');return value;};

export function stripeRefunds(secret:string,httpClient?:ReturnType<typeof Stripe.createFetchHttpClient>):RefundProvider {
  if(!secret.startsWith('sk_test_'))throw new Error('Only Stripe test refunds are enabled.');
  const stripe=new Stripe(secret,{httpClient:httpClient ?? Stripe.createFetchHttpClient(),maxNetworkRetries:2,timeout:20000});
  const result=async(r:Stripe.Refund):Promise<RefundResult>=>{
    const intent=typeof r.payment_intent==='string'?r.payment_intent:r.payment_intent?.id ?? null;
    if(!intent)throw new CaseError('Refund payment reference unavailable.',409);
    const payment=await stripe.paymentIntents.retrieve(intent);
    return {id:r.id,requestId:r.metadata?.refund_request_id ?? '',paymentIntent:intent,amount:r.amount,currency:r.currency,
      state:r.status ?? 'pending',live:payment.livemode};
  };
  return {
    async dispute(disputeId) {
      if(!/^du_[A-Za-z0-9_]+$/.test(disputeId))throw new CaseError('Invalid dispute reference.');
      const d=await stripe.disputes.retrieve(disputeId);
      return {id:d.id,paymentIntent:typeof d.payment_intent==='string'?d.payment_intent:d.payment_intent?.id ?? null,
        amount:d.amount,currency:d.currency,state:d.status,reason:d.reason,due:d.evidence_details.due_by?new Date(d.evidence_details.due_by*1000).toISOString():null,live:d.livemode};
    },
    async create(refund,intent) {
      // After an uncertain response, never recreate beyond Stripe's idempotency retention window.
      if(Date.now()-Date.parse(refund.created_at)>23*3600000)throw new CaseError('Refund response is uncertain. Reconcile its Stripe refund ID before retrying.',409);
      return result(await stripe.refunds.create({payment_intent:intent,amount:refund.amount_minor,metadata:{refund_request_id:refund.id}},
        {idempotencyKey:`drprop-test-refund-${refund.id}`}));
    },
    async retrieve(refundId){if(!/^re_[A-Za-z0-9_]+$/.test(refundId))throw new CaseError('Invalid refund reference.');return result(await stripe.refunds.retrieve(refundId));},
  };
}

export async function recordRefund(db:Pick<Port,'rpc'>,refund:RefundResult) {
  if(refund.live)throw new CaseError('Live refunds are disabled.',409);
  return db.rpc('dp_refund_result',{p_refund:id(refund.requestId),p_provider_id:refund.id,p_intent:refund.paymentIntent,
    p_amount:refund.amount,p_currency:refund.currency,p_state:refund.state,p_live:refund.live});
}
export async function recordDispute(db:Pick<Port,'rpc'>,dispute:DisputeResult) {
  if(dispute.live)throw new CaseError('Live dispute processing is disabled.',409);
  return db.rpc('dp_dispute_result',{p_id:dispute.id,p_intent:dispute.paymentIntent,p_amount:dispute.amount,
    p_currency:dispute.currency,p_state:dispute.state,p_reason:dispute.reason,p_due:dispute.due,p_live:dispute.live});
}
export function paymentOperations(db:Port,checkout:PaymentProvider,refunds:RefundProvider,enabled:boolean) {
  const headers={'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'*',
    'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'authorization, apikey, content-type, x-client-info'};
  const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
  return async(req:Request)=>{
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(req.method!=='POST')return json({error:'Use POST.'},405);
    if(!enabled)return json({error:'Test payment operations are disabled.'},503);
    try {
      const actor=await db.authenticate(req.headers.get('authorization') ?? '');
      await db.limit('payment-ops',actor.id);
      let body:Record<string,unknown>;
      try{body=JSON.parse(new TextDecoder().decode(await readBounded(req,4096)));}catch(e){if(e instanceof CaseError)throw e;throw new CaseError('Invalid operation.');}
      if(!body || Array.isArray(body))throw new CaseError('Invalid operation.');
      if(body.action==='list')return json({orders:await db.rpc('dp_payment_queue',{},actor.token)});
      if(body.action==='refund-status') {
        const refund=await db.rpc<RefundRequest>('dp_refund_lookup',{p_id:id(body.refundId)},actor.token);
        const providerId=refund.stripe_refund_id ?? (typeof body.stripeRefundId==='string'?body.stripeRefundId:null);
        if(!providerId)throw new CaseError('Find the refund in Stripe by its request metadata and supply its refund ID.',409);
        const actual=await refunds.retrieve(providerId);
        if(actual.requestId!==refund.id)throw new CaseError('Stripe refund differs from this request.',409);
        return json({refund:await recordRefund(db,actual)});
      }
      const order=await db.rpc<PaymentOrder & {payment_intent_id:string|null}>('dp_payment_ops_order',{p_order:id(body.orderId)},actor.token);
      if(body.action==='history')return json(await db.rpc('dp_payment_history',{p_order:order.id},actor.token));
      if(body.action==='dispute-status') {
        const dispute=await refunds.dispute(typeof body.disputeId==='string'?body.disputeId:'');
        if(dispute.paymentIntent!==order.payment_intent_id)throw new CaseError('Dispute differs from this order.',409);
        await recordDispute(db,dispute);return json({dispute});
      }
      if(body.action==='refunds')return json({refunds:await db.rpc('dp_payment_refund_queue',{p_order:order.id},actor.token)});
      if(body.action==='reconcile') {
        const sessionId=order.stripe_session_id ?? (typeof body.sessionId==='string'?body.sessionId:null);
        if(!sessionId)throw new CaseError('Find the Checkout session in Stripe by order metadata and supply its ID.',409);
        const session=await checkout.retrieve(sessionId);
        if(session.live || session.orderId!==order.id || session.amount!==order.amount_minor || session.currency!==order.currency)
          throw new CaseError('Checkout does not match this test order.',409);
        if(session.paid && session.paymentIntent) {
          const hash=await sha256(new TextEncoder().encode(JSON.stringify([session.id,order.id,session.amount,session.currency,session.paymentIntent])));
          await db.rpc('dp_stripe_paid',{p_order:order.id,p_event:`evt_reconcile_${session.id}`,p_hash:hash,p_session:session.id,
            p_intent:session.paymentIntent,p_amount:session.amount,p_currency:session.currency,p_live:false});
        } else if(session.status==='expired' && !session.paid) {
          await db.rpc('dp_stripe_expired',{p_order:order.id,p_session:session.id,p_live:false});
        } else {
          await db.rpc('dp_stripe_attach',{p_order:order.id,p_session:session.id});
        }
        return json({order:await db.rpc('dp_payment_ops_order',{p_order:order.id},actor.token)});
      }
      if(body.action==='refund') {
        if(!Number.isSafeInteger(body.amountMinor) || typeof body.reason!=='string')throw new CaseError('Enter a refund amount and review reason.');
        const refund=await db.rpc<RefundRequest>('dp_refund_prepare',{p_order:order.id,p_request:id(body.requestId),p_amount:body.amountMinor,p_reason:body.reason},actor.token);
        if(['succeeded','failed','canceled'].includes(refund.state))return json({refund});
        if(!order.payment_intent_id)throw new CaseError('Reconcile the paid order first.',409);
        const actual=refund.stripe_refund_id?await refunds.retrieve(refund.stripe_refund_id):await refunds.create(refund,order.payment_intent_id);
        if(actual.requestId!==refund.id)throw new CaseError('Stripe refund differs from this request.',409);
        return json({refund:await recordRefund(db,actual)});
      }
      throw new CaseError('Unknown payment operation.');
    } catch(e){return json({error:e instanceof CaseError?e.message:'Payment operation unavailable. Keep the request ID and retry or reconcile.'},e instanceof CaseError?e.status:503);}
  };
}
