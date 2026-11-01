import { BUCKET, CaseError, type CasePort, type Diagnosis } from './cases.ts';

/** Service credentials live only in the function environment or the operator process. */
export function supabasePort(url: string, publishableKey: string, serviceKey: string, render?: CasePort['render']): CasePort {
  const request = async (path: string, init: RequestInit = {}, token?: string) => {
    const response = await fetch(`${url}${path}`, { ...init, signal: AbortSignal.timeout(30000),
      headers: { apikey: token ? publishableKey : serviceKey, authorization: `Bearer ${token ?? serviceKey}`, ...init.headers } });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (response.status === 404 || String(error.statusCode) === '404') throw new CaseError('Object unavailable.',404);
      if (error.code === '42501' || response.status === 401 || response.status === 403) throw new CaseError('Access denied. Sign in again or contact your adviser.',403);
      if (error.code === '40001') throw new CaseError('The record changed. Reload before trying again.',409);
      // Never relay infrastructure details, SQL or provider response bodies.
      throw new CaseError('The operation could not be completed. Reload and retry.',response.status >= 500 ? 503 : 400);
    }
    return response;
  };
  const keyPath = (key: string) => key.split('/').map(encodeURIComponent).join('/');
  return {
    async authenticate(authorization) {
      const token = authorization.match(/^Bearer (\S+)$/i)?.[1];
      if (!token) throw new CaseError('Sign in to access your case.',401);
      const user = await (await request('/auth/v1/user',{},token)).json();
      if (!user.id || !user.phone_confirmed_at) throw new CaseError('A verified phone sign-in is required.',403);
      return { id:user.id,token };
    },
    async rpc<T>(name: string, args: Record<string, unknown>, token?: string): Promise<T> {
      return (await request(`/rest/v1/rpc/${name}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(args)},token)).json();
    },
    async report(id,token) {
      const rows: Diagnosis[] = await (await request(`/rest/v1/dp_diagnoses?id=eq.${encodeURIComponent(id)}&select=*`,{},token)).json();
      if (!rows[0]) throw new CaseError('Diagnosis unavailable.',403); return rows[0];
    },
    async canReadCase(id,token) {
      const rows = await (await request(`/rest/v1/dp_cases?id=eq.${encodeURIComponent(id)}&select=id`,{},token)).json();
      return rows.length === 1;
    },
    async get(key) {
      try { return new Uint8Array(await (await request(`/storage/v1/object/${BUCKET}/${keyPath(key)}`)).arrayBuffer()); }
      catch (e) { if (e instanceof CaseError && e.status === 404) return null; throw e; }
    },
    async put(key,bytes,mime) {
      await request(`/storage/v1/object/${BUCKET}/${keyPath(key)}`,{method:'POST',headers:{'content-type':mime,'x-upsert':'false'},body:new Uint8Array(bytes)});
    },
    async remove(keys) {
      if (keys.length) await request(`/storage/v1/object/${BUCKET}`,{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({prefixes:keys})});
    },
    render: render ?? (async()=>{throw new CaseError('PDF rendering is not configured.',503);}),
  };
}
