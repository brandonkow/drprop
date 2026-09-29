import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backendConfig } from '../src/backend/config.ts';
import { secureSessionStorage } from '../src/backend/secure-session.ts';
import { parseMalaysiaSlot } from '../src/backend/schedule-time.ts';

test('backend mode fails closed on missing configuration and rejects secret keys or insecure origins', () => {
  assert.equal(backendConfig().mode, 'preview');
  for (const [mode,url,key] of [['supabase','',''],['supabase','http://remote.example','sb_publishable_example_key'],['supabase','https://project.supabase.co','sb_secret_do_not_expose'],['live','',''],['supabase','https://user:pass@project.supabase.co','sb_publishable_example_key']]) assert.equal(backendConfig(mode,url,key).mode,'invalid');
  assert.equal(backendConfig('supabase','https://project.supabase.co','sb_publishable_example_key').mode,'supabase');
  assert.equal(backendConfig('supabase','http://127.0.0.1:54321','sb_publishable_example_key').mode,'supabase');
});
test('native session storage round-trips large Unicode tokens and clears every current chunk', async () => {
  const values=new Map<string,string>();
  const store=secureSessionStorage({getItemAsync:async key=>values.get(key)??null,setItemAsync:async(key,value)=>{assert.ok(Buffer.byteLength(value)<=2000);values.set(key,value);},deleteItemAsync:async key=>{values.delete(key);}});
  const session=JSON.stringify({token:'a'.repeat(6000),label:'é'.repeat(1200),unicode:'\u{1F3E1}'.repeat(800)});
  await store.setItem('session',session);assert.equal(await store.getItem('session'),session);
  await store.setItem('session','replacement');assert.equal(await store.getItem('session'),'replacement');assert.equal(values.size,2);
  await store.removeItem('session');assert.equal(values.size,0);assert.equal(await store.getItem('session'),null);
});
test('a failed secure session write preserves the previous complete token', async () => {
  const values=new Map<string,string>();let fail=false;
  const store=secureSessionStorage({getItemAsync:async key=>values.get(key)??null,setItemAsync:async(key,value)=>{if(fail&&key.endsWith('.1'))throw new Error('disk unavailable');values.set(key,value);},deleteItemAsync:async key=>{values.delete(key);}});
  await store.setItem('session','original');fail=true;
  await assert.rejects(store.setItem('session','x'.repeat(1000)),/disk unavailable/);assert.equal(await store.getItem('session'),'original');assert.equal(values.size,2);
});
test('corrupt session indexes can be removed without interpreting arbitrary storage keys', async () => {
  const values=new Map([['session','{"generation":"../escape","count":1}']]);
  const store=secureSessionStorage({getItemAsync:async key=>values.get(key)??null,setItemAsync:async(key,value)=>{values.set(key,value);},deleteItemAsync:async key=>{values.delete(key);}});
  await assert.rejects(store.getItem('session'),/Invalid saved/);await store.removeItem('session');assert.equal(values.size,0);
});
test('staff appointment dates are strictly validated and independent of device timezone', () => {
  assert.equal(parseMalaysiaSlot('2026-10-01 11:00'),'2026-10-01T03:00:00.000Z');
  for(const value of ['2026-02-30 10:00','2026-10-01 25:00','01/10/2026 11:00','']) assert.throws(()=>parseMalaysiaSlot(value));
});
