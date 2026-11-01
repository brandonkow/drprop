/** Read-only operator health check. JSON contains aggregate counts, never client payloads. */
import { supabasePort } from '../supabase/functions/_shared/supabase-port.ts';
const required=(key:string)=>{const value=process.env[key];if(!value)throw new Error(`Missing ${key}`);return value;};
const port=supabasePort(required('SUPABASE_URL'),required('SUPABASE_ANON_KEY'),required('SUPABASE_SERVICE_ROLE_KEY'));
const health=await port.rpc<Record<string,number|string>>('dp_ops_health',{});
console.log(JSON.stringify(health));
// A nonzero result asks the operator to inspect; it never mutates or retries financial actions.
process.exitCode=Object.entries(health).some(([key,value])=>key!=='checkedAt' && typeof value==='number' && value>0)?2:0;
