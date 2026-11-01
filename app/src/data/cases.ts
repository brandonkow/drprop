import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { fetch as expoFetch } from 'expo/fetch';
import { Platform } from 'react-native';
import { backendClient } from '../backend/client';
import { runtime } from '../backend/config';
import type { CaseFile, Diagnosis, DiagnosisContent } from '../../../supabase/functions/_shared/cases';

export type { CaseFile, Diagnosis, DiagnosisContent };
export interface CaseData {
  id: string; status: 'open' | 'closed'; retention_until: string | null;
  booking: { property_label: string; status: string; adviser_id: string | null };
  files: CaseFile[]; reports: Diagnosis[];
  events: { id: number; event: string; occurred_at: string }[];
}
export interface PendingUpload { requestId: string; name: string; mime: string; bytes: ArrayBuffer }
const MAX = 6 * 1024 * 1024;

async function gateway(body: object | ArrayBuffer, upload?: { caseId: string; file: PendingUpload }): Promise<Response> {
  if (runtime.mode !== 'supabase') throw new Error('Private case delivery requires a connected account.');
  const { data, error } = await backendClient().auth.getSession();
  if (error || !data.session) throw new Error('Sign in again to access your case.');
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await expoFetch(`${runtime.url}/functions/v1/case-files${upload ? '/upload' : ''}`, {
      method: 'POST', signal: controller.signal,
      headers: { apikey: runtime.key, authorization: `Bearer ${data.session.access_token}`,
        'content-type': upload ? upload.file.mime : 'application/json',
        ...(upload ? { 'x-case-id':upload.caseId,'x-request-id':upload.file.requestId,'x-file-name':encodeURIComponent(upload.file.name) } : {}) },
      body: upload ? body as ArrayBuffer : JSON.stringify(body),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(typeof result.error === 'string' ? result.error : 'Case delivery is unavailable. Retry or contact your adviser.');
    }
    return response;
  } finally { clearTimeout(timeout); }
}
async function rpc<T>(name: string, args: Record<string,unknown>): Promise<T> {
  const {data,error} = await backendClient().rpc(name,args);
  if (error) throw new Error(error.message); return data as T;
}

export const caseApi = {
  async load(id: string): Promise<CaseData> {
    const client = backendClient();
    const [c,b,files,reports,events] = await Promise.all([
      client.from('dp_cases').select('*').eq('id',id).single(),
      client.from('dp_bookings').select('property_label,status,adviser_id').eq('id',id).single(),
      client.from('dp_case_files').select('*').eq('case_id',id).order('created_at'),
      client.from('dp_diagnoses').select('*').eq('case_id',id).order('version',{ascending:false}),
      client.from('dp_case_events').select('id,event,occurred_at').eq('case_id',id).order('id',{ascending:false}).limit(30),
    ]);
    if ([c,b,files,reports,events].some((r)=>r.error)) throw new Error('Case unavailable. Access may have changed; sign in again or contact your adviser.');
    return {...c.data,booking:b.data,files:files.data!,reports:reports.data!,events:events.data!} as CaseData;
  },
  async pick(): Promise<PendingUpload | null> {
    const result = await DocumentPicker.getDocumentAsync({type:['application/pdf','image/jpeg','image/png'],multiple:false,copyToCacheDirectory:true,base64:false});
    if (result.canceled) return null;
    const asset = result.assets[0]!;
    const local = Platform.OS === 'web' ? null : new File(asset.uri);
    try {
      const size = asset.size ?? local?.size ?? asset.file?.size;
      if (!size || size > MAX) throw new Error('Choose a PDF, JPEG or PNG no larger than 6 MiB.');
      const bytes = Platform.OS === 'web' ? await asset.file!.arrayBuffer() : await local!.arrayBuffer();
      if (bytes.byteLength > MAX) throw new Error('Choose a file no larger than 6 MiB.');
      return {requestId:Crypto.randomUUID(),name:asset.name,mime:asset.mimeType ?? '',bytes};
    } finally {
      // Only the picker-created cache copy is removed, never a provider's original document.
      if (local?.uri.startsWith(Paths.cache.uri) && local.exists) local.delete();
    }
  },
  async upload(caseId: string, file: PendingUpload): Promise<CaseFile> { return (await gateway(file.bytes,{caseId,file})).json(); },
  async discard(id: string) { await gateway({action:'discard',id}); },
  save(caseId: string,id: string,revision: number,content: DiagnosisContent,documents: string[],sources: string) {
    return rpc<Diagnosis>('dp_save_diagnosis',{p_case:caseId,p_id:id,p_revision:revision,p_content:content,p_documents:documents,p_sources:sources});
  },
  review(id: string,revision: number,review: boolean) { return rpc<Diagnosis>('dp_review_diagnosis',{p_id:id,p_revision:revision,p_review:review}); },
  async publish(id: string,revision: number): Promise<Diagnosis> { return (await gateway({action:'publish',id,revision})).json(); },
  async download(file: CaseFile) {
    const {token} = await (await gateway({action:'grant',id:file.id})).json();
    const response = await gateway({action:'download',token});
    const bytes = await response.arrayBuffer();
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([bytes],{type:file.mime}));
      const a = document.createElement('a'); a.href=url; a.download=file.name; a.click();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
    } else {
      if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');
      const extension = file.mime === 'application/pdf' ? 'pdf' : file.mime === 'image/png' ? 'png' : 'jpg';
      const local = new File(Paths.cache,`drprop-${Crypto.randomUUID()}.${extension}`);
      try { local.write(new Uint8Array(bytes)); await Sharing.shareAsync(local.uri,{mimeType:file.mime,dialogTitle:file.name}); }
      finally { if (local.exists) local.delete(); }
    }
  },
};
