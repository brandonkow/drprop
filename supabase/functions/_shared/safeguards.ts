import { CaseError, readBounded, sha256 } from './cases.ts';

export type Scan = (bytes: Uint8Array, mime: string) => Promise<void>;

/** Connect only to an operator-approved private scanner. Missing/unavailable scanning fails closed. */
export function httpScanner(endpoint?: string, secret?: string, transport: typeof fetch = fetch): Scan {
  return async (bytes, mime) => {
    if (!endpoint || !secret) throw new CaseError('Document safety scanning is not configured. Contact the operator.', 503);
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw new CaseError('Document safety scanning is not configured. Contact the operator.', 503);
    }
    const hash = await sha256(bytes);
    let response: Response;
    try {
      response = await transport(url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
        headers: { authorization: `Bearer ${secret}`, 'content-type': mime, 'x-content-sha256': hash }, body: new Uint8Array(bytes) });
    } catch { throw new CaseError('Document safety scanning is unavailable. Retry later.', 503); }
    if (!response.ok) throw new CaseError('Document safety scanning is unavailable. Retry later.', 503);
    let result: { sha256?: string; verdict?: string; engine?: string };
    try {
      const bounded = new Request('https://scanner-response.invalid', { method: 'POST', body: response.body, duplex: 'half' } as RequestInit);
      result = JSON.parse(new TextDecoder().decode(await readBounded(bounded, 4096)));
    } catch { throw new CaseError('Document safety scanning returned an invalid result.', 503); }
    if (!result || result.sha256 !== hash || typeof result.engine !== 'string' || !/^[\w .:/-]{1,80}$/.test(result.engine)) {
      throw new CaseError('Document safety scanning returned an invalid result.', 503);
    }
    if (result.verdict === 'infected') throw new CaseError('This document was rejected by the safety scanner.', 422);
    if (result.verdict !== 'clean') throw new CaseError('Document safety scanning could not clear this file. Retry later.', 503);
  };
}

/** Deliberately excludes URLs, identities, tokens, filenames, error bodies and document content. */
export function observed(name: string, handler: (request: Request) => Promise<Response>, emit: (entry: object) => void = console.info) {
  return async (request: Request) => {
    const started = Date.now();
    try {
      const response = await handler(request);
      emit({ service: name, status: response.status, durationMs: Date.now() - started });
      return response;
    } catch {
      emit({ service: name, status: 503, durationMs: Date.now() - started });
      return new Response(JSON.stringify({ error: 'Service unavailable. Retry later.' }), {
        status: 503, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' },
      });
    }
  };
}
