import * as Crypto from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { backendClient } from '../backend/client';
import { source } from '../data/source';
import type { ConsultType } from '@drprop/brand/pricing';
import type { Slot } from '../data/types';
import { formatWhen } from '../i18n/format';
import { FONT, SPACE, usePalette } from '../theme';
import { Label, Small } from './type';
import { OutlineButton, TextLink } from './ui';

type Change={id:string;kind:string;state:string;review_note:string|null};
async function changes(bookingId:string):Promise<Change[]> {
  const {data,error}=await backendClient().from('dp_booking_changes').select('id,kind,state,review_note').eq('booking_id',bookingId).order('created_at',{ascending:false});
  if(error)throw new Error('Change requests are unavailable.');return data;
}
export function BookingChange({bookingId,type}:{bookingId:string;type:ConsultType}) {
  const p=usePalette();const lock=useRef(false);const request=useRef(Crypto.randomUUID());
  const [rows,setRows]=useState<Change[]>([]);const [slots,setSlots]=useState<Slot[]>([]);const [shown,setShown]=useState(20);
  const [kind,setKind]=useState<'cancel'|'reschedule'>('cancel');const [slot,setSlot]=useState<string|null>(null);
  const [reason,setReason]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  useEffect(()=>{let live=true;changes(bookingId).then(data=>{if(live)setRows(data);},()=>{if(live)setMessage('Change requests are unavailable.');});return()=>{live=false;};},[bookingId]);
  const act=async(work:()=>Promise<void>)=>{if(lock.current)return;lock.current=true;setBusy(true);setMessage('');try{await work();}catch(e){setMessage(e instanceof Error?e.message:'Request failed.');}finally{lock.current=false;setBusy(false);}};
  const pending=rows.some(row=>row.state==='pending');
  return <View style={{gap:SPACE[2]}}>
    <Label>Request a booking change</Label><Small>Requests need operator review. Your existing appointment remains in place until approved; a requested time is not reserved. Refunds are confirmed separately.</Small>
    {message?<Small accessibilityRole="alert">{message}</Small>:null}
    <TextLink label="Refresh change requests" disabled={busy} onPress={()=>void act(async()=>setRows(await changes(bookingId)))} />
    {rows.map(row=><Small key={row.id}>{row.kind==='cancel'?'Cancellation':'Rescheduling'}: {row.state}{row.review_note?` · ${row.review_note}`:''}</Small>)}
    {!pending?<>
      <TextLink label={kind==='cancel'?'Cancellation review selected':'Choose cancellation review'} disabled={busy} onPress={()=>{setKind('cancel');setSlot(null);request.current=Crypto.randomUUID();}} />
      {type!=='urgent'?<TextLink label="Choose another appointment" disabled={busy} onPress={()=>void act(async()=>{setSlots(await source.slots(type));setKind('reschedule');setShown(20);request.current=Crypto.randomUUID();})} />:null}
      {kind==='reschedule'?<>
        {slots.slice(0,shown).map(s=><TextLink key={s.id} label={`${slot===s.id?'Selected: ':''}${formatWhen(s.at,'en')}${s.adviser?` · ${s.adviser}`:''}`} disabled={busy} onPress={()=>{setSlot(s.id);request.current=Crypto.randomUUID();}} />)}
        {shown<slots.length?<TextLink label="Show more available appointments" onPress={()=>setShown(shown+20)} />:null}
        {!slots.length?<Small>No alternative appointments are currently available.</Small>:null}
      </>:null}
      <TextInput accessibilityLabel="Booking change reason" placeholder="Reason for the change (10–500 characters)" placeholderTextColor={p.muted} multiline maxLength={500} editable={!busy} value={reason} onChangeText={value=>{setReason(value);request.current=Crypto.randomUUID();}} style={{fontFamily:FONT.body,color:p.text,borderBottomColor:p.rule,borderBottomWidth:1,minHeight:80}} />
      <OutlineButton label="Send change request for review" busy={busy} onPress={()=>void act(async()=>{
        if(reason.trim().length<10 || (kind==='reschedule' && !slot))throw new Error('Enter a reason of at least 10 characters and choose a time for rescheduling.');
        const {error}=await backendClient().rpc('dp_request_booking_change',{p_booking:bookingId,p_request:request.current,p_kind:kind,p_slot:kind==='reschedule'?slot:null,p_reason:reason});
        if(error)throw new Error(error.message ?? 'The change request could not be saved. Refresh before retrying.');
        setRows(await changes(bookingId));setMessage('Change request saved for review. Your appointment has not changed.');
      })} />
    </>:null}
  </View>;
}
