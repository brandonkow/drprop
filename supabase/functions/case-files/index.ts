import { caseHandler } from '../_shared/cases.ts';
import { supabasePort } from '../_shared/supabase-port.ts';
import { diagnosisPdf } from '../_shared/diagnosis-pdf.ts';
import { httpScanner, observed } from '../_shared/safeguards.ts';

// This structural declaration lets the repository typecheck the thin Deno entrypoint too.
declare const Deno: { env: { get(key: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void };
const required = (name: string) => { const value = Deno.env.get(name); if (!value) throw new Error(`Missing ${name}`); return value; };
const port = supabasePort(required('SUPABASE_URL'),required('SUPABASE_ANON_KEY'),required('SUPABASE_SERVICE_ROLE_KEY'),diagnosisPdf,
  httpScanner(Deno.env.get('DP_SCANNER_URL'), Deno.env.get('DP_SCANNER_TOKEN')));
Deno.serve(observed('case-files', caseHandler(port)));
