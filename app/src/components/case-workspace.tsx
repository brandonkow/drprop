import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { caseApi, type CaseData, type Diagnosis, type DiagnosisContent, type PendingUpload } from '../data/cases';
import { FONT, HAIRLINE, SIZE, SPACE, TOUCH_MIN, usePalette } from '../theme';
import { Body, Label, Mono, Small } from './type';
import { OutlineButton, Row, Rule, SolidButton, TextLink } from './ui';

const disclaimer = 'Information and analysis only, not legal, tax or financial advice. The final decision rests with the client.';
const blank: DiagnosisContent = {summary:'',findings:'',questions:'',nextSteps:'',adviserNote:''};
const fields: [keyof DiagnosisContent,string][] = [['summary','Summary'],['findings','Findings and uncertainty'],['questions','Questions to resolve'],['nextSteps','Next steps'],['adviserNote','Adviser note']];

export function CaseWorkspace({id,userId}: {id: string; userId: string}) {
  const [data,setData] = useState<CaseData | null>(null);
  const [error,setError] = useState(''); const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false); const lock = useRef(false);
  const [pending,setPending] = useState<PendingUpload | null>(null);
  const [draft,setDraft] = useState<Diagnosis | null>(null);
  const [draftId,setDraftId] = useState(Crypto.randomUUID);
  const [content,setContent] = useState<DiagnosisContent>(blank);
  const [documents,setDocuments] = useState<string[]>([]); const [sources,setSources] = useState('');
  const p = usePalette();
  const accept = useCallback((next: CaseData) => {
    setData(next);
    const active = next.reports.find((d)=>d.state==='draft' || d.state==='review') ?? null;
    setDraft(active); setDraftId(active?.id ?? Crypto.randomUUID());
    setContent(active?.content ?? blank); setDocuments(active?.source_snapshot.map((s)=>s.id) ?? []); setSources(active?.external_sources ?? '');
  },[]);
  const reload = useCallback(async (resetEditor = true) => {
    try { const next=await caseApi.load(id); if(resetEditor)accept(next);else setData(next); }
    catch(e) { setData(null); setDraft(null); setContent(blank); setDocuments([]); setSources(''); setPending(null); throw e; }
  },[id,accept]);
  useEffect(()=> { let live=true; caseApi.load(id).then((d)=>{if(live)accept(d);}).catch((e)=>{if(live)setError(e.message);}); return ()=>{live=false;}; },[id,accept]);
  const act = async (work: ()=>Promise<void>,done = '') => {
    if(lock.current)return; lock.current=true; setBusy(true); setError(''); setMessage('');
    try { await work(); if(done)setMessage(done); }
    catch(e) { setError(e instanceof Error ? e.message : 'Operation failed. Retry or contact your adviser.'); }
    finally { lock.current=false; setBusy(false); }
  };
  const upload = async (file: PendingUpload) => {
    try { await caseApi.upload(id,file); setPending(null); await reload(false); }
    catch(e) { await reload(false).catch(()=>{}); throw e; }
  };
  const canEdit = data?.status==='open' && data.booking.status!=='cancelled';
  const adviser = data?.booking.adviser_id===userId;
  const inReview = draft?.state==='review';
  const ready = data?.files.filter((f)=>f.kind==='source' && f.state==='ready') ?? [];
  return <View style={s.stack}>
    <Small>Private to the client and currently assigned adviser. Download access expires and is checked again before delivery.</Small>
    {error ? <Small accessibilityRole="alert" accessibilityLiveRegion="polite">{error}</Small> : null}
    {message ? <Small accessibilityLiveRegion="polite">{message}</Small> : null}
    <TextLink label="Reload case" disabled={busy} onPress={()=>void act(reload,'Case reloaded. Unsaved editor changes were replaced.')} />
    {adviser ? <Small>Reload replaces unsaved editor changes with the saved version.</Small> : null}
    {!data ? <Body muted>{error ? 'No case content is available.' : 'Loading case…'}</Body> : <>
      <Body>{data.booking.property_label || 'Property consultation'}</Body>
      {!canEdit ? <Small>This case is read-only.</Small> : null}
      <Small>{data.retention_until ? `Access retained until ${data.retention_until}.` : 'The operator has not set a retention date. Contact the adviser about removal.'}</Small>
      <Rule /><Label>Documents</Label>
      <Small>PDF, JPEG or PNG. Up to 6 MiB per file and 20 source documents. Supplied documents are not independently verified.</Small>
      {data.files.filter((f)=>f.kind==='source').map((f)=><View key={f.id} style={s.stack}>
        <Body>{f.name}</Body><Small>{f.state} · {Math.ceil(f.byte_size/1024)} KiB</Small>
        {f.state==='ready' ? <TextLink label={`Download ${f.name}`} disabled={busy} onPress={()=>void act(()=>caseApi.download(f),'Download delivered. Copies you save remain on your device.')} />
          : f.uploader_id===userId && canEdit ? <TextLink label={`Discard unfinished upload: ${f.name}`} disabled={busy} onPress={()=>void act(async()=>{await caseApi.discard(f.id);if(pending?.requestId===f.request_id)setPending(null);await reload(false);},'Unfinished upload discarded.')} /> : null}
      </View>)}
      {!data.files.some((f)=>f.kind==='source') ? <Body muted>No documents uploaded.</Body> : null}
      {canEdit ? <>
        {pending ? <><Small>Retry ready: {pending.name}. Keep this screen open to retain the selected bytes.</Small>
          <OutlineButton label="Retry selected upload" busy={busy} onPress={()=>void act(()=>upload(pending),'Document uploaded.')} />
          <TextLink label="Clear selected file" disabled={busy} onPress={()=>setPending(null)} />
        </> : <OutlineButton label="Upload document" busy={busy} onPress={()=>void act(async()=>{const file=await caseApi.pick();if(file){setPending(file);await upload(file);}},'')} />}
      </> : null}
      <Rule /><Label>Published diagnoses</Label>
      {!data.reports.some((d)=>d.state==='published') ? <Body muted>No diagnosis has been published yet.</Body> : null}
      {data.reports.filter((d)=>d.state==='published').map((d)=>{
        const file = data.files.find((f)=>f.id===d.pdf_file_id);
        return <View style={s.stack} key={d.id}>
          <Mono>Version {d.version}</Mono><Small>{d.published_at}</Small>
          {fields.map(([key,label])=><View key={key}><Label>{label}</Label><Body>{d.content[key] || 'Not recorded.'}</Body></View>)}
          <Label>Sources and limitations</Label><Body>{d.external_sources || 'Not recorded.'}</Body>
          <Small>{disclaimer}</Small>
          {file ? <OutlineButton label={`Download diagnosis v${d.version}`} busy={busy} onPress={()=>void act(()=>caseApi.download(file),'Diagnosis delivered.')} /> : <Small>PDF metadata unavailable. Reload or contact the adviser.</Small>}
        </View>;
      })}
      {adviser && canEdit ? <>
        <Rule /><Label>{draft ? `Diagnosis v${draft.version} · ${draft.state}` : 'New diagnosis version'}</Label>
        <Small>Drafts are private to you. Saving replaces the draft; review freezes its content. Publication creates an immutable version visible to the client.</Small>
        {fields.map(([key,label])=><View key={key} style={s.stack}>
          <Label>{label}</Label>
          <TextInput accessibilityLabel={label} value={content[key]} onChangeText={(v)=>setContent({...content,[key]:v})}
            editable={!busy && !inReview} multiline maxLength={10000}
            style={[s.input,{color:p.text,borderColor:p.rule}]} />
        </View>)}
        <Label>Sources and limitations</Label>
        <TextInput accessibilityLabel="Sources and limitations" value={sources} onChangeText={setSources} editable={!busy && !inReview} multiline maxLength={8000} style={[s.input,{color:p.text,borderColor:p.rule}]} />
        <Label>Documents used in this version</Label>
        {ready.map((f)=><Row key={f.id} selected={documents.includes(f.id)} disabled={busy || inReview}
          accessibilityLabel={`${documents.includes(f.id)?'Selected':'Select'}: ${f.name}`}
          onPress={()=>setDocuments(documents.includes(f.id)?documents.filter((id)=>id!==f.id):[...documents,f.id])}>
          <Body>{documents.includes(f.id)?'Selected: ':''}{f.name}</Body>
        </Row>)}
        <Small>{disclaimer}</Small>
        {inReview && draft ? <>
          <Small>Read every field and selected source above. Publishing shares this exact revision with the client. Corrections require a new version.</Small>
          <SolidButton label="Publish reviewed PDF" busy={busy} onPress={()=>void act(async()=>{await caseApi.publish(draft.id,draft.revision);await reload();},'Diagnosis published.')} />
          <OutlineButton label="Return to draft" busy={busy} onPress={()=>void act(async()=>{await caseApi.review(draft.id,draft.revision,false);await reload();})} />
        </> : <>
          <SolidButton label="Save diagnosis draft" busy={busy} disabled={!content.summary.trim() || !content.findings.trim()}
            onPress={()=>void act(async()=>{await caseApi.save(id,draftId,draft?.revision ?? 0,content,documents,sources);await reload();},'Draft saved.')} />
          {draft ? <OutlineButton label="Review saved diagnosis" busy={busy} disabled={JSON.stringify(content)!==JSON.stringify(draft.content) || sources!==draft.external_sources || JSON.stringify([...documents].sort())!==JSON.stringify(draft.source_snapshot.map((s)=>s.id).sort())}
            onPress={()=>void act(async()=>{await caseApi.review(draft.id,draft.revision,true);await reload();},'Review frozen. Check every field before publication.')} /> : null}
        </>}
      </> : null}
      <Rule /><Label>Recent case activity</Label>
      {data.events.map((e)=><Small key={e.id}>{e.event.replaceAll('_',' ')} · {e.occurred_at}</Small>)}
      <Small>Delivery records show that bytes were served, not that a person opened or read a file.</Small>
    </>}
  </View>;
}
const s=StyleSheet.create({stack:{gap:SPACE[2]},input:{fontFamily:FONT.body,fontSize:SIZE.body,minHeight:TOUCH_MIN*2,borderBottomWidth:HAIRLINE,paddingVertical:SPACE[1],textAlignVertical:'top'}});
