import { stripeWebhookHandler } from '../_shared/payments.ts';
import { stripeProvider } from '../_shared/stripe-provider.ts';
import { supabasePort } from '../_shared/supabase-port.ts';
import { stripeRefunds } from '../_shared/payment-operations.ts';
import { observed } from '../_shared/safeguards.ts';
declare const Deno:{env:{get(key:string):string|undefined};serve(handler:(req:Request)=>Promise<Response>):void};
let handler:ReturnType<typeof stripeWebhookHandler>|undefined;
Deno.serve(observed('stripe-webhook',async(req)=>{
  try {
    const required=(key:string)=>{const value=Deno.env.get(key);if(!value)throw new Error('Missing configuration');return value;};
    handler ??=stripeWebhookHandler(supabasePort(required('SUPABASE_URL'),required('SUPABASE_ANON_KEY'),required('SUPABASE_SERVICE_ROLE_KEY')),
      stripeProvider(required('STRIPE_SECRET_KEY'),required('STRIPE_WEBHOOK_SECRET'),required('DP_APP_ORIGIN')),stripeRefunds(required('STRIPE_SECRET_KEY')));
    return handler(req);
  }catch{return new Response(JSON.stringify({error:'Stripe webhook configuration is incomplete.'}),{status:503,headers:{'content-type':'application/json','cache-control':'no-store'}});}
}));
