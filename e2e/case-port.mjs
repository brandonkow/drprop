/** Local Auth/Storage adapters only. Authorization, gateway and renderer are production code. */
import { caseHandler, CaseError } from '../supabase/functions/_shared/cases.ts';
import { diagnosisPdf } from '../supabase/functions/_shared/diagnosis-pdf.ts';

export function fixtureCaseHandler(db, asUser, userFromAuth) {
  const objects=new Map();
  const service=async(sql,args)=>db.transaction(async(tx)=>{
    await tx.exec('set local role service_role');return (await tx.query(sql,args)).rows;
  });
  return caseHandler({
    async authenticate(header) {
      const id=userFromAuth({headers:{authorization:header}});
      const row=id?(await db.query('select id from auth.users where id=$1 and phone_confirmed_at is not null',[id])).rows[0]:null;
      if(!row)throw new CaseError('Sign in.',401);return {id,token:id};
    },
    async rpc(name,args,token) {
      const names=Object.keys(args);
      if(!/^dp_[a-z_]+$/.test(name) || names.some((n)=>!/^p_[a-z_]+$/.test(n)))throw new Error('Invalid fixture RPC');
      const call=`public.${name}(${names.map((n,i)=>`${n} => $${i+1}`).join(',')})`;
      const [meta]=(await db.query('select t.typtype from pg_proc p join pg_type t on p.prorettype=t.oid where p.proname=$1',[name])).rows;
      const sql=meta.typtype==='c'?`select * from ${call}`:`select ${call} as value`;
      try {
        const rows=token?await asUser(token,sql,Object.values(args)):await service(sql,Object.values(args));
        return meta.typtype==='c'?rows[0]:rows[0].value;
      } catch(e) {throw new CaseError(e.message,e.code==='42501'?403:e.code==='40001'?409:400);}
    },
    async canReadCase(id,token){return (await asUser(token,'select id from public.dp_cases where id=$1',[id])).length===1;},
    async report(id,token){const [row]=await asUser(token,'select * from public.dp_diagnoses where id=$1',[id]);if(!row)throw new CaseError('Diagnosis unavailable.',403);return row;},
    async get(key){return objects.get(key) ?? null;},
    async put(key,bytes){if(objects.has(key))throw new Error('Object exists');objects.set(key,bytes);await db.query("insert into storage.objects(bucket_id,name) values('dp-case-files',$1)",[key]);},
    async remove(keys){for(const key of keys){objects.delete(key);await db.query('delete from storage.objects where name=$1',[key]);}},
    render:diagnosisPdf,
  });
}
