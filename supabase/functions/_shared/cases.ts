/** Transport-neutral case gateway. Tests and the deployed function run this same code. */
export const MAX_FILE_BYTES = 6 * 1024 * 1024;
export const BUCKET = 'dp-case-files';
export interface CaseFile {
  id: string; case_id: string; request_id: string; uploader_id: string; kind: 'source' | 'diagnosis';
  name: string; mime: string; byte_size: number; sha256: string; storage_key: string;
  state: 'uploading' | 'ready' | 'failed' | 'removed'; created_at: string;
}
export interface DiagnosisContent { summary: string; findings: string; questions: string; nextSteps: string; adviserNote: string }
export interface Diagnosis {
  id: string; case_id: string; version: number; revision: number; state: 'draft' | 'review' | 'published' | 'erased';
  content: DiagnosisContent; source_snapshot: { id: string; name: string; sha256: string; byteSize: number }[];
  external_sources: string; author_id: string; reviewed_by: string | null; reviewed_at: string | null;
  pdf_file_id: string | null; published_at: string | null;
}
export interface CasePort {
  authenticate(authorization: string): Promise<{ id: string; token: string }>;
  rpc<T>(name: string, args: Record<string, unknown>, token?: string): Promise<T>;
  report(id: string, token: string): Promise<Diagnosis>;
  canReadCase(id: string, token: string): Promise<boolean>;
  get(key: string): Promise<Uint8Array | null>;
  put(key: string, bytes: Uint8Array, mime: string): Promise<void>;
  remove(keys: string[]): Promise<void>;
  render(report: Diagnosis): Promise<Uint8Array>;
}
export class CaseError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) { super(message); this.status=status; }
}
const uuid = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new CaseError('Invalid record identifier.');
  return value;
};
export async function sha256(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}
export function checkFile(bytes: Uint8Array, mime: string): void {
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw new CaseError('Choose a file between 1 byte and 6 MiB.', 413);
  const starts = (...signature: number[]) => signature.every((n, i) => bytes[i] === n);
  const valid = mime === 'application/pdf' ? starts(37,80,68,70,45) && new TextDecoder().decode(bytes.slice(-1024)).includes('%%EOF')
    : mime === 'image/png' ? starts(137,80,78,71,13,10,26,10)
    : mime === 'image/jpeg' && starts(255,216,255) && bytes[bytes.length-2] === 255 && bytes[bytes.length-1] === 217;
  if (!valid) throw new CaseError('The file contents do not match a supported PDF, JPEG or PNG.', 415);
}
export async function readBounded(request: Request, limit: number): Promise<Uint8Array> {
  if (Number(request.headers.get('content-length')) > limit) throw new CaseError('Request too large.', 413);
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); throw new CaseError('Request too large.', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
const headers = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info, x-case-id, x-request-id, x-file-name',
  'cache-control': 'no-store, private', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer',
};
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...headers, 'content-type': 'application/json' } });

export function caseHandler(port: CasePort) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
    try {
      const upload = new URL(request.url).pathname.endsWith('/upload');
      // Download grants travel in a POST body, never in URL logs or referrers.
      let body: Record<string, unknown> = {};
      if (!upload) {
        try { body = JSON.parse(new TextDecoder().decode(await readBounded(request, 32768))); }
        catch (e) { if (e instanceof CaseError) throw e; throw new CaseError('Invalid request.'); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new CaseError('Invalid request.');
      }
      if (body.action === 'download') {
        if (typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token)) throw new CaseError('Download grant unavailable.', 403);
        const hash = await sha256(new TextEncoder().encode(body.token));
        const file = await port.rpc<CaseFile>('dp_resolve_case_download', { p_token_hash: hash });
        const bytes = await port.get(file.storage_key);
        if (!bytes || bytes.length !== file.byte_size || await sha256(bytes) !== file.sha256) throw new CaseError('Document unavailable. Request a fresh download or contact the adviser.', 503);
        // Recheck after Storage returns, then record delivery. This is not proof the recipient opened it.
        await port.rpc('dp_record_case_download', { p_token_hash: hash });
        return new Response(new Uint8Array(bytes), { headers: { ...headers, 'content-type': file.mime,
          'content-disposition': `attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
          'content-security-policy': "default-src 'none'; sandbox", 'content-length': String(bytes.length) } });
      }
      const actor = await port.authenticate(request.headers.get('authorization') ?? '');
      if (upload) {
        const caseId = uuid(request.headers.get('x-case-id')); const requestId = uuid(request.headers.get('x-request-id'));
        if (!await port.canReadCase(caseId, actor.token)) throw new CaseError('Case access denied.', 403);
        let name: string;
        try { name = decodeURIComponent(request.headers.get('x-file-name') ?? ''); } catch { throw new CaseError('Invalid file name.'); }
        if (!name.trim() || name.length > 120 || /[\x00-\x1f\x7f/\\]/.test(name)) throw new CaseError('Use a file name of 1–120 characters without slashes or control characters.');
        const mime = request.headers.get('content-type') ?? '';
        const bytes = await readBounded(request, MAX_FILE_BYTES); checkFile(bytes, mime);
        const hash = await sha256(bytes);
        const file = await port.rpc<CaseFile>('dp_reserve_document', { p_case: caseId, p_request: requestId, p_name: name, p_mime: mime, p_size: bytes.length, p_hash: hash }, actor.token);
        if (file.state === 'ready') return json(file);
        try {
          // A retry after a lost response may find already-stored bytes. Never overwrite.
          let stored = await port.get(file.storage_key);
          if (!stored) {
            try { await port.put(file.storage_key, bytes, mime); }
            catch (error) { stored = await port.get(file.storage_key); if (!stored) throw error; }
          }
          if (stored && (stored.length !== bytes.length || await sha256(stored) !== hash)) throw new CaseError('Stored upload differs from this request. Contact the operator.', 409);
          return json(await port.rpc('dp_finish_document', { p_file: file.id, p_actor: actor.id, p_hash: hash, p_size: bytes.length, p_success: true }));
        } catch (error) {
          // Keep retry metadata. Erasure can enumerate this path even if cleanup fails or the process stops.
          await port.rpc('dp_finish_document', { p_file: file.id, p_actor: actor.id, p_hash: hash, p_size: bytes.length, p_success: false }).catch(() => {});
          throw error;
        }
      }
      if (body.action === 'discard') {
        const key = await port.rpc<string>('dp_discard_upload', { p_file: uuid(body.id) }, actor.token);
        await port.remove([key]); return json({ discarded: true });
      }
      if (body.action === 'grant') {
        const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');
        const expiresAt = await port.rpc<string>('dp_issue_case_download', { p_file: uuid(body.id), p_actor: actor.id, p_token_hash: await sha256(new TextEncoder().encode(token)) });
        return json({ token, expiresAt });
      }
      if (body.action === 'publish') {
        const id = uuid(body.id);
        if (!Number.isSafeInteger(body.revision)) throw new CaseError('Reload the reviewed version.', 409);
        const report = await port.report(id, actor.token);
        if (report.revision !== body.revision) throw new CaseError('Review changed. Reload before publishing.', 409);
        // A lost success response is safe to retry, without generating another artifact.
        if (report.state === 'published') return json(report);
        const key = await port.rpc<string>('dp_prepare_publication', { p_id: id, p_revision: body.revision, p_actor: actor.id });
        const bytes = await port.render(report); checkFile(bytes, 'application/pdf');
        await port.put(key, bytes, 'application/pdf');
        try {
          return json(await port.rpc('dp_publish_diagnosis', { p_id: id, p_revision: body.revision, p_actor: actor.id,
            p_key: key, p_hash: await sha256(bytes), p_size: bytes.length }));
        } catch (error) {
          // An uncertain commit must not delete the published artifact. Registered artifacts are
          // reclaimed by the operator sweep after expiry, using authoritative database metadata.
          throw error;
        }
      }
      throw new CaseError('Unknown case action.');
    } catch (error) {
      if (error instanceof CaseError) return json({ error: error.message }, error.status);
      return json({ error: 'The operation could not be completed. Reload and retry; contact the operator if it continues.' }, 503);
    }
  };
}
