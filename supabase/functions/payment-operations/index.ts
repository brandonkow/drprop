import { paymentOperations, stripeRefunds } from '../_shared/payment-operations.ts';
import { stripeProvider } from '../_shared/stripe-provider.ts';
import { supabasePort } from '../_shared/supabase-port.ts';
import { observed } from '../_shared/safeguards.ts';
declare const Deno:{env:{get(key:string):string|undefined};serve(handler:(req:Request)=>Promise<Response>):void};
let handler:ReturnType<typeof paymentOperations>|undefined;
Deno.serve(observed('payment-operations',async(req)=>{
  if(Deno.env.get('DP_STRIPE_TEST_ENABLED')!=='true')return new Response(JSON.stringify({error:'Test payment operations are disabled.'}),{
    status:503,headers:{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'*'}});
  const required=(key:string)=>{const value=Deno.env.get(key);if(!value)throw new Error('Missing configuration');return value;};
  handler ??=paymentOperations(supabasePort(required('SUPABASE_URL'),required('SUPABASE_ANON_KEY'),required('SUPABASE_SERVICE_ROLE_KEY')),
    stripeProvider(required('STRIPE_SECRET_KEY'),required('STRIPE_WEBHOOK_SECRET'),required('DP_APP_ORIGIN')),stripeRefunds(required('STRIPE_SECRET_KEY')),true);
  return handler(req);
}));
