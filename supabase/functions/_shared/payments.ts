import { CaseError, readBounded, sha256, type CasePort } from './cases.ts';
import type { PaymentOrder, PaymentProvider, PaymentSession } from './stripe-provider.ts';
type PaymentPort=Pick<CasePort,'authenticate'|'rpc'>;
const headers={'access-control-allow-origin':'*','access-control-allow-headers':'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods':'POST, OPTIONS','cache-control':'no-store','content-type':'application/json'};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
const error=(e:unknown)=>json({error:e instanceof CaseError?e.message:'Payment service unavailable. Retry or contact the operator.'},e instanceof CaseError?e.status:503);
function checkSession(s:PaymentSession,order:PaymentOrder) {
  if(s.live || s.orderId!==order.id || s.amount!==order.amount_minor || s.currency!==order.currency)throw new CaseError('Stripe session does not match this test order.',409);
}
export function checkoutHandler(db:PaymentPort,provider:PaymentProvider,enabled:boolean) {
  return async(req:Request)=>{
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(req.method!=='POST')return json({error:'Use POST.'},405);
    if(!enabled)return json({error:'Stripe test checkout is disabled.'},503);
    try {
      const actor=await db.authenticate(req.headers.get('authorization') ?? '');
      let body:Record<string,unknown>;
      try{body=JSON.parse(new TextDecoder().decode(await readBounded(req,4096)));}catch(e){if(e instanceof CaseError)throw e;throw new CaseError('Invalid checkout request.');}
      if(!body || typeof body.bookingId!=='string' || !/^[a-f0-9-]{36}$/i.test(body.bookingId))throw new CaseError('Choose a booking.');
      const order=await db.rpc<PaymentOrder>('dp_stripe_order',{p_booking:body.bookingId},actor.token);
      if(order.state==='paid' || order.state==='review_required')return json({mode:'test',state:order.state,orderId:order.id});
      const s=order.stripe_session_id?await provider.retrieve(order.stripe_session_id):await provider.create(order);
      checkSession(s,order);
      await db.rpc('dp_stripe_attach',{p_order:order.id,p_session:s.id});
      if(s.paid)return json({mode:'test',state:'awaiting_verified_webhook',orderId:order.id});
      if(s.status!=='open' || !s.url)throw new CaseError('This checkout expired or closed. Ask the operator to reconcile it.',409);
      const url=new URL(s.url);
      if(url.protocol!=='https:' || url.hostname!=='checkout.stripe.com' || url.username || url.password)throw new CaseError('Untrusted checkout URL.',503);
      return json({mode:'test',state:'checkout_open',orderId:order.id,url:s.url});
    }catch(e){return error(e);}
  };
}
export function stripeWebhookHandler(db:PaymentPort,provider:PaymentProvider) {
  return async(req:Request)=>{
    if(req.method!=='POST')return json({error:'Use POST.'},405);
    try {
      const bytes=await readBounded(req,256*1024); const raw=new TextDecoder().decode(bytes);
      let event;
      try{event=await provider.verify(raw,req.headers.get('stripe-signature') ?? '');}
      catch{throw new CaseError('Invalid Stripe signature.',400);}
      if(event.live)throw new CaseError('Live payments are disabled.',400);
      if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))return json({received:true,ignored:true});
      const s=await provider.retrieve(event.sessionId);
      if(s.live)throw new CaseError('Live payments are disabled.',400);
      // A completed checkout is not necessarily paid. Never grant value from a redirect or unpaid event.
      if(!s.paid)return json({received:true,pending:true});
      if(!/^[a-f0-9-]{36}$/i.test(s.orderId) || !s.paymentIntent)throw new CaseError('Unmatched payment. Operator reconciliation required.',409);
      await db.rpc('dp_stripe_paid',{p_order:s.orderId,p_event:event.id,p_hash:await sha256(bytes),p_session:s.id,p_intent:s.paymentIntent,p_amount:s.amount,p_currency:s.currency,p_live:s.live});
      return json({received:true,mode:'test'});
    }catch(e){return error(e);}
  };
}
