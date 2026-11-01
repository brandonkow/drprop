import { describe, expect, it, vi } from 'vitest';
import { httpScanner, observed } from '../functions/_shared/safeguards';
import { sha256 } from '../functions/_shared/cases';

const bytes = new TextEncoder().encode('%PDF-1.7\nfixture\n%%EOF');
describe('approved scanner protocol', () => {
  it('requires configuration and never sends bytes to an insecure or credential-bearing URL', async () => {
    const fetcher = vi.fn();
    for (const url of [undefined, 'http://scanner.example', 'https://user:secret@scanner.example', 'https://scanner.example?key=secret']) {
      await expect(httpScanner(url, 'test-token', fetcher)(bytes, 'application/pdf')).rejects.toThrow(/not configured/);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('binds a clean verdict to the exact bytes, blocks redirects, and sends no filename or client identity', async () => {
    const hash = await sha256(bytes);
    const fetcher = vi.fn(async () => Response.json({ sha256: hash, verdict: 'clean', engine: 'ClamAV fixture' }));
    await httpScanner('https://scanner.example/scan', 'test-token', fetcher)(bytes, 'application/pdf');
    expect(fetcher.mock.calls[0]).toEqual([new URL('https://scanner.example/scan'), expect.objectContaining({
      method: 'POST', redirect: 'error', body: bytes,
      headers: { authorization: 'Bearer test-token', 'content-type': 'application/pdf', 'x-content-sha256': hash },
    })]);
  });
  it('rejects infected, unknown, malformed, oversized, wrong-hash and unavailable responses', async () => {
    const hash = await sha256(bytes);
    for (const result of [
      { sha256: hash, verdict: 'infected', engine: 'fixture' },
      { sha256: hash, verdict: 'unknown', engine: 'fixture' },
      { sha256: 'b'.repeat(64), verdict: 'clean', engine: 'fixture' },
      { sha256: hash, verdict: 'clean' }, null,
    ]) await expect(httpScanner('https://scanner.example', 'token', async () => Response.json(result))(bytes, 'application/pdf')).rejects.toThrow(/scann/);
    for (const response of [new Response('x'.repeat(5000)), new Response('bad'), new Response(null, { status: 503 })]) {
      await expect(httpScanner('https://scanner.example', 'token', async () => response)(bytes, 'application/pdf')).rejects.toThrow(/scann/);
    }
    await expect(httpScanner('https://scanner.example', 'token', async () => { throw new Error('secret infrastructure detail'); })(bytes, 'application/pdf')).rejects.toThrow('scanning is unavailable');
  });
});

it('logs status and duration without bodies, tokens, identities, URLs or exception text', async () => {
  const emit = vi.fn();
  const request = new Request('https://example.test/private?token=secret', { headers: { authorization: 'Bearer secret' } });
  const success = observed('case-files', async () => new Response('private content'), emit);
  expect((await success(request)).status).toBe(200);
  const failure = observed('case-files', async () => { throw new Error('secret document'); }, emit);
  expect((await failure(request)).status).toBe(503);
  expect(emit.mock.calls.map(([entry]) => entry)).toEqual([
    { service: 'case-files', status: 200, durationMs: expect.any(Number) },
    { service: 'case-files', status: 503, durationMs: expect.any(Number) },
  ]);
  expect(JSON.stringify(emit.mock.calls)).not.toMatch(/secret|private|Bearer/);
});
