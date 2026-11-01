/** Fictional provider transport only. Runs the production operator gateway and real SQL permissions. */
import { paymentOperations } from '../supabase/functions/_shared/payment-operations.ts';
import { CaseError } from '../supabase/functions/_shared/cases.ts';
export function fixturePayments(db,asUser,userFromAuth) {
  const providerRefunds=new Map();
  const rpc=async(name,args,token)=>{
    const names=Object.keys(args);
    if(!/^dp_[a-z_]+$/.test(name)||names.some(n=>!/^p_[a-z_]+$/.test(n)))throw new Error('Invalid RPC');
    const call=`public.${name}(${names.map((n,i)=>`${n} => $${i+1}`).join(',')})`;
    const [meta]=(await db.query('select t.typtype from pg_proc p join pg_type t on p.prorettype=t.oid where p.proname=$1',[name])).rows;
    const sql=meta.typtype==='c'?`select * from ${call}`:`select ${call} as value`;
    try {
      const rows=token?await asUser(token,sql,Object.values(args)):await db.transaction(async tx=>{
        await tx.exec('set local role service_role');return (await tx.query(sql,Object.values(args))).rows;
      });
      return meta.typtype==='c'?rows[0]:rows[0].value;
    }catch(e){throw new CaseError(e.message,e.code==='42501'?403:400);}
  };
  const port={
    rpc,
    async authenticate(header){const user=userFromAuth({headers:{authorization:header}});if(!user)throw new CaseError('Sign in.',401);return {id:user,token:user};},
    async limit(){},
  };
  const checkout={
    async create(){throw new Error('Fixture never opens an external Stripe checkout.');},
    async verify(){throw new Error('Fixture does not simulate signature verification.');},
    async retrieve(id){const [o]=(await db.query('select * from public.dp_payment_orders where stripe_session_id=$1',[id])).rows;if(!o)throw new Error('Missing fixture session');
      return {id,orderId:o.id,amount:o.amount_minor,currency:o.currency,paid:!!o.paid_at,live:false,paymentIntent:o.payment_intent_id,url:null,status:o.paid_at?'complete':'expired'};},
  };
  const refunds={
    async create(refund,intent){const value={id:`re_fixture_${refund.id.replaceAll('-','')}`,requestId:refund.id,paymentIntent:intent,amount:refund.amount_minor,currency:'myr',state:'succeeded',live:false};providerRefunds.set(value.id,value);return value;},
    async retrieve(id){const value=providerRefunds.get(id);if(!value)throw new Error('Missing fixture refund');return value;},
    async dispute(){throw new Error('Dispute fixtures are covered by SDK/database tests.');},
  };
  return paymentOperations(port,checkout,refunds,true);
}
