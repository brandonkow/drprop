import Stripe from 'stripe';
import { CaseError } from './cases.ts';

export interface PaymentOrder {
  id:string; booking_id:string; user_id:string; amount_minor:number; currency:'myr'; mode:'test';
  state:'created'|'checkout_open'|'paid'|'review_required'; stripe_session_id:string|null; checkout_expires_at:string;
}
export interface PaymentSession {
  id:string; orderId:string; amount:number|null; currency:string|null; paid:boolean; live:boolean;
  paymentIntent:string|null; url:string|null; status:string|null;
}
export interface PaymentProvider {
  create(order:PaymentOrder):Promise<PaymentSession>;
  retrieve(id:string):Promise<PaymentSession>;
  verify(raw:string,signature:string):Promise<{id:string;type:string;sessionId:string;live:boolean}>;
}
const session=(s:Stripe.Checkout.Session):PaymentSession=>({id:s.id,orderId:s.metadata?.order_id ?? '',amount:s.amount_total,
  currency:s.currency,paid:s.payment_status==='paid',live:s.livemode,paymentIntent:typeof s.payment_intent==='string'?s.payment_intent:s.payment_intent?.id ?? null,url:s.url,status:s.status});

/** Test-mode keys only. Live charging needs a separate reviewed rollout and policy. */
export function stripeProvider(secret:string,webhookSecret:string,returnOrigin:string,httpClient?:Stripe.HttpClient):PaymentProvider {
  if(!secret.startsWith('sk_test_') || !webhookSecret.startsWith('whsec_'))throw new Error('Stripe test key and webhook signing secret are required. Live keys are disabled.');
  const origin=new URL(returnOrigin);
  if((origin.protocol!=='https:' && !(origin.protocol==='http:' && ['localhost','127.0.0.1'].includes(origin.hostname))) || origin.origin!==returnOrigin || origin.username || origin.password)throw new Error('Configure a trusted app origin without a path.');
  const stripe=new Stripe(secret,{httpClient:httpClient ?? Stripe.createFetchHttpClient(),maxNetworkRetries:2,timeout:20000});
  return {
    async create(order) {
      if(order.mode!=='test' || order.currency!=='myr' || !Number.isSafeInteger(order.amount_minor) || order.amount_minor<=0)throw new CaseError('Invalid test order.');
      // Never retry a potentially pruned Stripe idempotency key after the order's fixed window.
      if(Date.parse(order.checkout_expires_at)<=Date.now()+30*60000)throw new CaseError('Checkout creation window elapsed. The operator must reconcile this order before another attempt.',409);
      return session(await stripe.checkout.sessions.create({mode:'payment',locale:'en',allowed_payment_method_types:['card'],
        client_reference_id:order.id,metadata:{order_id:order.id},payment_intent_data:{metadata:{order_id:order.id}},
        line_items:[{quantity:1,price_data:{currency:order.currency,unit_amount:order.amount_minor,product_data:{name:'Dr Prop consultation - TEST PAYMENT'}}}],
        expires_at:Math.floor(Date.parse(order.checkout_expires_at)/1000),
        success_url:`${returnOrigin}/record/${order.booking_id}?stripe=test-return`,cancel_url:`${returnOrigin}/record/${order.booking_id}?stripe=test-cancel`,
      },{idempotencyKey:`drprop-test-checkout-${order.id}`}));
    },
    async retrieve(id) {if(!/^cs_test_[A-Za-z0-9_]+$/.test(id))throw new CaseError('Invalid test session.');return session(await stripe.checkout.sessions.retrieve(id));},
    async verify(raw,signature) {
      const event=await stripe.webhooks.constructEventAsync(raw,signature,webhookSecret,300,Stripe.createSubtleCryptoProvider());
      const object=event.data.object as {id:string};
      return {id:event.id,type:event.type,sessionId:object.id,live:event.livemode};
    },
  };
}
