/** Explicit operator commands. Never import this into an app bundle. Node 22.18+ or 24. */
import { supabasePort } from '../supabase/functions/_shared/supabase-port.ts';
const [command,id,date] = process.argv.slice(2);
if (!['sweep','retain','erase'].includes(command ?? '') || (command !== 'sweep' && !/^[a-f0-9-]{36}$/.test(id ?? ''))) {
  throw new Error('Usage: node scripts/case-retention.ts sweep | retain CASE_UUID ISO_DATE | erase CASE_UUID');
}
if (command === 'retain' && (!date || !Number.isFinite(Date.parse(date)))) throw new Error('Provide an explicit ISO retention date.');
const required=(key:string)=>{const value=process.env[key];if(!value)throw new Error(`Missing ${key}`);return value;};
const port=supabasePort(required('SUPABASE_URL'),required('SUPABASE_ANON_KEY'),required('SUPABASE_SERVICE_ROLE_KEY'));
if(command==='retain') {
  await port.rpc('dp_set_case_retention',{p_case:id,p_until:new Date(date!).toISOString()});
  console.log('Retention date set. Expiry revokes access; use erase to remove content.');
} else if(command==='erase') {
  // Revocation commits before object deletion. On failure, rerun this exact command.
  const keys=await port.rpc<string[]>('dp_begin_case_erasure',{p_case:id});
  for(let i=0;i<keys.length;i+=100)await port.remove(keys.slice(i,i+100));
  await port.rpc('dp_finish_case_erasure',{p_case:id});
  console.log('Case content erased. Minimal audit and the original booking remain. Run the sweep for late failed writes.');
} else {
  const keys=await port.rpc<string[]>('dp_case_cleanup_keys',{});
  for(let i=0;i<keys.length;i+=100)await port.remove(keys.slice(i,i+100));
  console.log(`Sweep completed for ${keys.length} registered paths. Published PDFs were excluded.`);
}
