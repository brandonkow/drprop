import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { backendClient } from '../backend/client';
import { Small, Label } from './type';
import { OutlineButton, TextLink } from './ui';
import { SPACE } from '../theme';

/** Explicit staging opt-in only. This does not replace the unpaid booking status. */
export const stripeTestEnabled=process.env.EXPO_PUBLIC_STRIPE_TEST_ENABLED==='true';
async function readStatus(bookingId:string) {
  const {data,error}=await backendClient().from('dp_payment_orders').select('state').eq('booking_id',bookingId).order('paid_at',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false}).limit(1);
  if(error)throw new Error('Test payment status unavailable.');
  return data[0]?`Test order: ${data[0].state.replaceAll('_',' ')}.`:'No test payment started.';
}
export function StripeTestPayment({bookingId}:{bookingId:string}) {
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [state,setState]=useState('No test payment started.');
  async function load(){setState(await readStatus(bookingId));}
  useEffect(()=>{let live=true;readStatus(bookingId).then((value)=>{if(live)setState(value);},(e)=>{if(live)setMessage(e.message);});return()=>{live=false;};},[bookingId]);
  const act=async(work:()=>Promise<void>)=>{if(busy)return;setBusy(true);setMessage('');try{await work();}catch(e){setMessage(e instanceof Error?e.message:'Test checkout unavailable.');}finally{setBusy(false);}};
  return <View style={{gap:SPACE[2]}}>
    <Label>Stripe test payment</Label><Small>Sandbox only. No real money is collected and no booking or membership is marked paid.</Small>
    <Small>{state}</Small>
    <OutlineButton label="Open Stripe test checkout" busy={busy} onPress={()=>void act(async()=>{
      const {data,error}=await backendClient().functions.invoke('stripe-checkout',{body:{bookingId}});
      if(error || data?.error)throw new Error(data?.error ?? 'Stripe test checkout unavailable. Contact the operator.');
      if(data.mode!=='test')throw new Error('Unexpected checkout mode.');
      if(data.url){const url=new URL(data.url);if(url.protocol!=='https:' || url.hostname!=='checkout.stripe.com')throw new Error('Invalid checkout destination.');await Linking.openURL(data.url);}
      await load();
    })} />
    <TextLink label="Refresh test payment status" disabled={busy} onPress={()=>void act(load)} />
    {state==='Test order: expired.'?<OutlineButton label="Restart verified expired test checkout" busy={busy} onPress={()=>void act(async()=>{
      const {data,error}=await backendClient().functions.invoke('stripe-checkout',{body:{bookingId,retryExpired:true}});
      if(error || data?.error)throw new Error(data?.error ?? 'Test checkout restart unavailable.');
      if(data.mode!=='test' || !data.url)throw new Error('Reconcile the test order before restarting.');
      const url=new URL(data.url);if(url.protocol!=='https:' || url.hostname!=='checkout.stripe.com')throw new Error('Invalid checkout destination.');
      await Linking.openURL(data.url);await load();
    })} />:null}
    <TextLink label="Show test payment record" disabled={busy} onPress={()=>void act(async()=>{
      const {data:orders,error:orderError}=await backendClient().from('dp_payment_orders').select('id').eq('booking_id',bookingId).not('paid_at','is',null).order('paid_at',{ascending:false}).limit(1);
      if(orderError || !orders?.[0])throw new Error('No verified test payment record is available.');
      const {data,error}=await backendClient().rpc('dp_payment_receipt',{p_order:orders[0].id});
      if(error)throw new Error('Test payment record unavailable.');
      setMessage(`${data.label}. Paid RM ${(data.amountMinor/100).toFixed(2)}; refunded RM ${(data.refundedMinor/100).toFixed(2)}. Reference: ${data.orderId}.`);
    })} />
    <Small>Returning from Stripe does not prove payment. Refresh to see the verified webhook result.</Small>
    {message?<Small accessibilityRole="alert">{message}</Small>:null}
  </View>;
}
