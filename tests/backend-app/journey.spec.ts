import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
const userId='00000000-0000-4000-8000-000000000001';
const slotId='00000000-0000-4000-8000-000000000010';
const start=new Date(Date.now()+24*3600000).toISOString();
const end=new Date(Date.parse(start)+30*60000).toISOString();
const user={id:userId,aud:'authenticated',role:'authenticated',phone:'60123456789',phone_confirmed_at:'2026-09-01T00:00:00Z',created_at:'2026-09-01T00:00:00Z',app_metadata:{provider:'phone',providers:['phone']},user_metadata:{}};
const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');
const session={access_token:`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:userId,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.fixture-only-not-a-valid-signature`,token_type:'bearer',expires_in:3600,refresh_token:'fixture-refresh-token',user};
async function fixture(page:Page,options:{staff?:boolean;empty?:boolean;conflict?:boolean;rejectOtp?:boolean;lostResponse?:boolean}={}) {
  let profile:Record<string,unknown>|null=null;let booking:any=null;let attempts=0;const calls:{path:string;body:any}[]=[];
  await page.route('http://127.0.0.1:54321/**',async route=>{
    const request=route.request();const url=new URL(request.url());const body=request.postDataJSON();calls.push({path:url.pathname,body});
    const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS','content-type':'application/json'};
    const send=(data:unknown,status=200)=>route.fulfill({status,headers,body:JSON.stringify(data)});
    if(request.method()==='OPTIONS')return send({});
    const endpoint=url.pathname.split('/').at(-1);
    if(['dp_save_profile','dp_book','dp_cancel','dp_publish_slot','dp_adviser_status'].includes(endpoint??'')) expect(request.headers().accept).toBe('application/vnd.pgrst.object+json');
    if(endpoint==='otp')return send({});
    if(endpoint==='verify')return options.rejectOtp?send({error_code:'otp_expired',msg:'Token has expired or is invalid'},403):send(session);
    if(endpoint==='user')return send(user);
    if(endpoint==='logout')return send({});
    if(endpoint==='dp_profiles')return send(profile?[profile]:[]);
    if(endpoint==='dp_staff')return send(options.staff?[{enabled:true}]:[]);
    if(endpoint==='dp_save_profile'){profile={user_id:userId,display_name:body.p_name,drink_preference:body.p_drink};return send(profile);}
    if(endpoint==='dp_bookings')return send(booking?[booking]:[]);
    if(endpoint==='dp_availability')return send(options.empty?[]:[{id:slotId,adviser_name:'Adviser One',starts_at:start,ends_at:end}]);
    if(endpoint==='dp_quote')return send(19900);
    if(endpoint==='dp_book'){
      if(options.conflict)return send({message:'This appointment is no longer available',code:'22023'},400);
      booking??={id:'00000000-0000-4000-8000-000000000020',user_id:userId,adviser_id:'00000000-0000-4000-8000-000000000003',slot_id:slotId,consultation_type:body.p_type,price_band:body.p_band,property_label:body.p_property,fee_minor:19900,starts_at:start,ends_at:end,status:'requested',payment_status:'unpaid',follow_up_of:null};
      if(options.lostResponse&&attempts++===0)return route.abort('failed');
      return send(booking);
    }
    if(endpoint==='dp_cancel'){booking.status='cancelled';return send(booking);}
    if(endpoint==='dp_slots')return send([]);
    if(endpoint==='dp_adviser_bookings')return send([]);
    if(endpoint==='dp_publish_slot')return send({id:slotId,starts_at:body.p_start,ends_at:end,enabled:true});
    return send({message:`Unexpected fixture request ${url.pathname}`},500);
  });
  return calls;
}
async function login(page:Page){
  await page.goto('/');await page.getByLabel('Phone number',{exact:true}).fill('+60123456789');await page.getByRole('button',{name:'Send sign-in code',exact:true}).click();
  await page.getByLabel('SMS verification code').fill('123456');await page.getByRole('button',{name:'Verify SMS code',exact:true}).click();
  await page.getByLabel('Preferred name',{exact:true}).fill('Alex');await page.getByRole('button',{name:'Save profile',exact:true}).click();
  await expect(page.getByRole('button',{name:'Start a consultation',exact:true})).toBeVisible();
}
async function prepareBooking(page:Page){
  await page.getByRole('button',{name:'Start a consultation',exact:true}).click();await expect(page.getByText('CONSULTATION / 1 OF 4')).toBeVisible();await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByLabel('Property shorthand').fill('Terrace near the park');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('radio').first().click();await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByText('CONSULTATION / 4 OF 4')).toBeVisible();await expect(page.getByText('RM 199',{exact:true})).toBeVisible();
}
test('connected OTP, profile, reservation, reload, cancellation and sign-out',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));const calls=await fixture(page);await login(page);
  await expect(page.getByRole('tab')).toHaveCount(3);expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  await prepareBooking(page);await page.getByRole('button',{name:'Request appointment',exact:true}).click();await expect(page.getByText('requested / unpaid')).toBeVisible();
  await mkdir('docs/qa/backend',{recursive:true});await page.screenshot({path:'docs/qa/backend/requested-booking.png',fullPage:true});
  await page.reload();await page.getByRole('tab',{name:'Records',exact:true}).click();await expect(page.getByText('Terrace near the park',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Cancel Terrace near the park',exact:true}).click();await page.getByRole('button',{name:'Confirm cancellation',exact:true}).click();await expect(page.getByText('cancelled / unpaid')).toBeVisible();
  await page.getByRole('tab',{name:'Me',exact:true}).click();await page.getByLabel('Preferred drink').fill('Tea');await page.getByRole('button',{name:'Save preferences'}).click();await expect(page.getByRole('alert')).toContainText('saved');
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByRole('button',{name:'Confirm sign out'}).click();await expect(page.getByLabel('Phone number',{exact:true})).toBeVisible();
  await page.goto('/booking');await expect(page.getByLabel('Phone number',{exact:true})).toBeVisible();
  expect(calls.filter(call=>call.path.endsWith('/dp_book'))).toHaveLength(1);expect(errors).toEqual([]);
});
test('unavailable slot stays an error and never creates a simulated success',async({page})=>{
  await fixture(page,{conflict:true});await login(page);await prepareBooking(page);await page.getByRole('button',{name:'Request appointment',exact:true}).click();await expect(page.getByRole('alert')).toContainText('no longer available');
  await expect(page.getByText('CONSULTATION / 4 OF 4')).toBeVisible();await expect(page.getByText('requested / unpaid')).toHaveCount(0);
});
test('a lost booking response retries the same idempotency key',async({page})=>{
  const calls=await fixture(page,{lostResponse:true});await login(page);await prepareBooking(page);await page.getByRole('button',{name:'Request appointment',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Connection unavailable');
  await page.getByRole('button',{name:'Request appointment',exact:true}).click();await expect(page.getByText('requested / unpaid')).toBeVisible();
  const bookings=calls.filter(call=>call.path.endsWith('/dp_book'));expect(bookings).toHaveLength(2);expect(bookings[0].body.p_request).toBe(bookings[1].body.p_request);expect(bookings[1].body.p_expected_fee).toBe(19900);
});
test('empty availability remains explicit without fabricated time slots',async({page})=>{
  await fixture(page,{empty:true});await login(page);await page.getByRole('button',{name:'Start a consultation',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByLabel('Property shorthand').fill('Terrace');await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('No appointments');await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();await expect(page.getByRole('radio')).toHaveCount(0);
});
test('invalid server OTP is rejected and the demo code is never accepted locally',async({page})=>{
  await fixture(page,{rejectOtp:true});await page.goto('/');await page.getByLabel('Phone number',{exact:true}).fill('+60123456789');await page.getByRole('button',{name:'Send sign-in code',exact:true}).click();await page.getByLabel('SMS verification code').fill('246810');await page.getByRole('button',{name:'Verify SMS code',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('invalid');await expect(page.getByRole('button',{name:'Start a consultation',exact:true})).toHaveCount(0);
});
test('staff view publishes explicit MYT availability and validates calendar input',async({page})=>{
  const calls=await fixture(page,{staff:true});await login(page);await page.getByRole('tab',{name:'Me',exact:true}).click();await page.getByRole('button',{name:'Manage adviser schedule'}).click();
  await page.getByLabel('Appointment start in Malaysia time').fill('2026-02-30 11:00');await page.getByRole('button',{name:'Publish appointment',exact:true}).click();await expect(page.getByRole('alert')).toContainText('valid calendar');
  await page.getByLabel('Appointment start in Malaysia time').fill('2026-10-01 11:00');await page.getByRole('button',{name:'Publish appointment',exact:true}).click();await expect.poll(()=>calls.filter(call=>call.path.endsWith('/dp_publish_slot')).length).toBe(1);
  expect(calls.find(call=>call.path.endsWith('/dp_publish_slot'))?.body.p_start).toBe('2026-10-01T03:00:00.000Z');
  await page.setViewportSize({width:320,height:740});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await mkdir('docs/qa/backend',{recursive:true});await page.screenshot({path:'docs/qa/backend/adviser-schedule-320.png',fullPage:true});
});
