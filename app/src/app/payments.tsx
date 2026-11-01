import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { backendClient } from '../backend/client';
import { Body, Display, Label, Mono, Small } from '../components/type';
import { OutlineButton, Rule, Screen, TextLink } from '../components/ui';
import { stripeTestEnabled } from '../components/stripe-test-payment';
import { useApp } from '../state/app-state';
import { FONT, SPACE, usePalette } from '../theme';

type Order={id:string;booking_id:string;amount_minor:number;state:string;stripe_session_id:string|null};
type Refund={id:string;amount_minor:number;state:string;stripe_refund_id:string|null};
type Dispute={id:string;state:string;reason:string;due_at:string|null};
type Change={id:string;booking_id:string;kind:string;reason:string;target_slot:string|null};
async function operation<T>(body:Record<string,unknown>):Promise<T> {
  const {data,error}=await backendClient().functions.invoke('payment-operations',{body});
  if(error || data?.error)throw new Error(data?.error ?? 'Payment operation unavailable. Keep the request ID and retry or reconcile.');
  return data;
}

export default function Payments() {
  const {mode}=useApp();const p=usePalette();const lock=useRef(false);
  const [orders,setOrders]=useState<Order[]>([]);const [selected,setSelected]=useState<Order|null>(null);
  const [refunds,setRefunds]=useState<Refund[]>([]);const [disputes,setDisputes]=useState<Dispute[]>([]);
  const [sessionId,setSessionId]=useState('');const [providerRefundId,setProviderRefundId]=useState('');
  const [amount,setAmount]=useState('');const [reason,setReason]=useState('');
  const [requestId,setRequestId]=useState(Crypto.randomUUID);const [submitted,setSubmitted]=useState(false);
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  const [changes,setChanges]=useState<Change[]>([]);const [reviewNote,setReviewNote]=useState('');
  const act=async(work:()=>Promise<void>)=>{
    if(lock.current)return;lock.current=true;setBusy(true);setMessage('');
    try{await work();}catch(e){setMessage(e instanceof Error?e.message:'Payment operation failed.');}
    finally{lock.current=false;setBusy(false);}
  };
  const reload=async()=>{const data=await operation<{orders:Order[]}>({action:'list'});setOrders(data.orders);};
  const details=async(order:Order)=>{
    const r=await operation<{refunds:Refund[]}>({action:'refunds',orderId:order.id});
    const history=await operation<{disputes:Dispute[]}>({action:'history',orderId:order.id});
    setRefunds(r.refunds);setDisputes(history.disputes);
  };
  const inputStyle=[s.input,{color:p.text,borderColor:p.rule}];
  if(mode!=='connected' || !stripeTestEnabled)return <Screen><Display>Payments unavailable</Display><Body>Test payment operations are disabled in this build.</Body><TextLink label="Back" onPress={()=>router.back()} /></Screen>;
  return <Screen>
    <TextLink label="Back" onPress={()=>router.back()} /><Display>Payment operations</Display>
    <Small>Stripe sandbox only. An explicitly provisioned payment-operator role is required. No real money is moved.</Small>
    <OutlineButton label="Load latest test orders" busy={busy} onPress={()=>void act(reload)} />
    {message?<Small accessibilityRole="alert">{message}</Small>:null}
    <Rule /><Label>Booking change reviews</Label>
    <TextLink label="Load pending booking changes" disabled={busy} onPress={()=>void act(async()=>{
      const {data,error}=await backendClient().rpc('dp_booking_change_queue');if(error)throw new Error('Booking change queue unavailable or access denied.');setChanges(data);
    })} />
    <TextInput accessibilityLabel="Booking change review note" placeholder="Review reason (10–500 characters)" value={reviewNote} onChangeText={setReviewNote} editable={!busy} multiline maxLength={500} style={inputStyle} />
    {changes.map(change=><View key={change.id} style={s.section}>
      <Mono>{change.booking_id}</Mono><Small>{change.kind}: {change.reason}</Small>
      {change.target_slot?<Small>Requested appointment reference: {change.target_slot}</Small>:null}
      {([true,false] as const).map(approve=><TextLink key={String(approve)} label={`${approve?'Approve':'Reject'} change ${change.id}`} disabled={busy} onPress={()=>void act(async()=>{
        const {data,error}=await backendClient().rpc('dp_review_booking_change',{p_id:change.id,p_approve:approve,p_note:reviewNote});
        if(error)throw new Error(error.message ?? 'Review could not be saved.');
        setChanges(changes.filter(row=>row.id!==change.id));setReviewNote('');
        setMessage(`Change ${data.state}. ${data.suggested_refund_minor===null?'Any refund needs separate review.':`Suggested refund: RM ${(data.suggested_refund_minor/100).toFixed(2)}; submit a separate reviewed refund request.`}`);
      })} />)}
    </View>)}
    {orders.map(order=><View key={order.id} style={s.section}>
      <Rule /><Mono>{order.id}</Mono><Small>RM {(order.amount_minor/100).toFixed(2)} · {order.state.replaceAll('_',' ')}</Small>
      <TextLink label={`Review test order ${order.id}`} disabled={busy || submitted} onPress={()=>void act(async()=>{
        await details(order);setSelected(order);setSessionId(order.stripe_session_id ?? '');setProviderRefundId('');setAmount('');setReason('');setRequestId(Crypto.randomUUID());
      })} />
    </View>)}
    {selected?<View style={s.section}>
      <Rule /><Label>Selected order</Label><Mono>{selected.id}</Mono>
      <Small>If a checkout response was lost, find the session in Stripe by its order metadata. Never delete a payment to try again.</Small>
      <TextInput accessibilityLabel="Stripe test session ID" placeholder="Stripe test session ID" value={sessionId} onChangeText={setSessionId} editable={!busy} autoCapitalize="none" style={inputStyle} />
      <OutlineButton label="Reconcile with Stripe" busy={busy} onPress={()=>void act(async()=>{
        const result=await operation<{order:Order}>({action:'reconcile',orderId:selected.id,sessionId});
        setSelected(result.order);await reload();await details(result.order);setMessage(`Verified test order: ${result.order.state.replaceAll('_',' ')}.`);
      })} />
      <Rule /><Label>Test refund review</Label>
      <Small>Enter the approved amount in sen and a review reason. Pending or uncertain requests reserve their amount until reconciled.</Small>
      <TextInput accessibilityLabel="Refund amount in sen" placeholder="Refund amount in sen" value={amount} onChangeText={setAmount} editable={!busy && !submitted} keyboardType="number-pad" style={inputStyle} />
      <TextInput accessibilityLabel="Refund review reason" placeholder="Refund review reason (10–500 characters)" value={reason} onChangeText={setReason} editable={!busy && !submitted} multiline maxLength={500} style={inputStyle} />
      <Small>Request ID: {requestId}</Small>
      <OutlineButton label={submitted?'Retry same test refund request':'Submit reviewed test refund'} busy={busy} onPress={()=>void act(async()=>{
        if(!/^\d+$/.test(amount)||!Number.isSafeInteger(Number(amount))||Number(amount)<=0||reason.trim().length<10)throw new Error('Enter a positive amount in sen and a review reason of at least 10 characters.');
        setSubmitted(true);
        const result=await operation<{refund:Refund}>({action:'refund',orderId:selected.id,requestId,amountMinor:Number(amount),reason});
        await details(selected);setMessage(`Test refund: ${result.refund.state.replaceAll('_',' ')}.`);
        if(['succeeded','failed','canceled'].includes(result.refund.state)){setSubmitted(false);setRequestId(Crypto.randomUUID());setAmount('');setReason('');}
      })} />
      <Small>On an uncertain response keep this request ID. A requested refund can require operator reconciliation after 23 hours.</Small>
      <TextInput accessibilityLabel="Stripe refund ID for recovery" placeholder="Stripe refund ID for recovery (optional)" value={providerRefundId} onChangeText={setProviderRefundId} editable={!busy} autoCapitalize="none" style={inputStyle} />
      <TextLink label="Refresh recorded refunds" disabled={busy} onPress={()=>void act(()=>details(selected))} />
      {refunds.map(refund=><View key={refund.id} style={s.section}>
        <Mono>{refund.id}</Mono><Small>RM {(refund.amount_minor/100).toFixed(2)} · {refund.state.replaceAll('_',' ')}</Small>
        <TextLink label={`Reconcile refund ${refund.id}`} disabled={busy} onPress={()=>void act(async()=>{
          await operation({action:'refund-status',refundId:refund.id,stripeRefundId:providerRefundId});await details(selected);setMessage('Refund status reconciled.');
        })} />
      </View>)}
      <Rule /><Label>Disputes requiring review</Label>
      <Small>Review and submit approved evidence in Stripe. This screen never submits evidence or accepts a dispute automatically.</Small>
      {disputes.length?disputes.map(d=><View key={d.id}><Mono>{d.id}</Mono><Small>{d.state.replaceAll('_',' ')} · {d.reason} · Due: {d.due_at ?? 'Check Stripe'}</Small>
        <TextLink label={`Refresh dispute ${d.id}`} disabled={busy} onPress={()=>void act(async()=>{await operation({action:'dispute-status',orderId:selected.id,disputeId:d.id});await details(selected);})} />
      </View>):<Small>No recorded disputes for this order.</Small>}
    </View>:null}
  </Screen>;
}
const s=StyleSheet.create({section:{gap:SPACE[2]},input:{fontFamily:FONT.body,borderWidth:1,padding:12,borderRadius:0,minHeight:48}});
