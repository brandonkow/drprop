import { checkoutHandler } from '../_shared/payments.ts';
import { stripeProvider } from '../_shared/stripe-provider.ts';
import { supabasePort } from '../_shared/supabase-port.ts';
declare const Deno:{env:{get(key:string):string|undefined};serve(handler:(req:Request)=>Promise<Response>):void};
let handler:ReturnType<typeof checkoutHandler>|undefined;
Deno.serve(async(req)=>{
  const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'authorization, apikey, content-type, x-client-info','cache-control':'no-store'};
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(Deno.env.get('DP_STRIPE_TEST_ENABLED')!=='true')return new Response(JSON.stringify({error:'Stripe test checkout is disabled.'}),{status:503,headers});
  try {
    const required=(key:string)=>{const value=Deno.env.get(key);if(!value)throw new Error('Missing configuration');return value;};
    handler ??=checkoutHandler(supabasePort(required('SUPABASE_URL'),required('SUPABASE_ANON_KEY'),required('SUPABASE_SERVICE_ROLE_KEY')),
      stripeProvider(required('STRIPE_SECRET_KEY'),required('STRIPE_WEBHOOK_SECRET'),required('DP_APP_ORIGIN')),true);
    return handler(req);
  }catch{return new Response(JSON.stringify({error:'Stripe test configuration is incomplete.'}),{status:503,headers});}
});
