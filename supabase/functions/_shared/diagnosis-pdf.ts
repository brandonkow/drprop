import { PDFDocument, rgb, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { body, display } from './pdf-fonts.ts';
import { CaseError, type Diagnosis } from './cases.ts';

export const DISCLAIMER = 'Information and analysis only, not legal, tax or financial advice. The final decision rests with the client.';
const decode = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

/** Render only the immutable reviewed snapshot; no client HTML or remote resources. */
export async function diagnosisPdf(report: Diagnosis): Promise<Uint8Array> {
  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(decode(body), { subset: true });
  const heading = await pdf.embedFont(decode(display), { subset: true });
  pdf.setTitle(`Dr Prop diagnosis v${report.version}`); pdf.setAuthor('Dr Prop');
  pdf.setSubject(`Case ${report.case_id}; report ${report.id}; reviewed revision ${report.revision}`);
  const ink = rgb(0.12,0.12,0.11); const muted = rgb(0.37,0.37,0.34);
  const width = 499; let y = 0; let page: PDFPage;
  const newPage = () => {
    page = pdf.addPage([595.28,841.89]); y = 750;
    page.drawText('Dr Prop', { x:48,y:805,size:17,font:heading,color:ink });
    page.drawText(`PRIVATE / DIAGNOSIS V${report.version}`, { x:330,y:807,size:9,font:regular,color:muted });
    page.drawLine({ start:{x:48,y:790},end:{x:547,y:790},thickness:0.5,color:muted });
  };
  const text = (input: string, font = regular, size = 11, color = ink) => {
    const supported = new Set(font.getCharacterSet());
    const clean = input.replace(/\r\n?/g,'\n').replace(/\t/g,'    ');
    if ([...clean].some((c) => c !== '\n' && !supported.has(c.codePointAt(0)!))) {
      throw new CaseError('The report contains a character the PDF font cannot render. Return to draft and replace unsupported symbols.', 422);
    }
    for (const paragraph of clean.split('\n')) {
      // Character wrapping also bounds long URLs and source hashes without clipping.
      const lines: string[] = []; let line = ''; let lineWidth=0;
      const widths=new Map<string,number>();
      const measure=(char:string)=>{let n=widths.get(char);if(n===undefined){n=font.widthOfTextAtSize(char,size);widths.set(char,n);}return n;};
      for (const char of paragraph) {
        if (lineWidth+measure(char) > width && line) {
          const space = line.lastIndexOf(' ');
          if (space > line.length / 2) { lines.push(line.slice(0,space)); line = line.slice(space+1); }
          else { lines.push(line); line = ''; }
          lineWidth=[...line].reduce((sum,c)=>sum+measure(c),0);
        }
        line += char; lineWidth+=measure(char);
      }
      lines.push(line);
      // Account for font shaping once per line, including any positive kerning.
      for(let i=0;i<lines.length;i++) {
        while(font.widthOfTextAtSize(lines[i]!,size)>width && lines[i]!.length>1) {
          const chars=[...lines[i]!];const last=chars.pop()!;lines[i]=chars.join('');
          lines[i+1]=last+(lines[i+1] ?? '');
        }
      }
      for (const value of lines) {
        if (y < 102) newPage();
        if (value) page.drawText(value, {x:48,y,size,font,color});
        y -= size * 1.5;
      }
    }
    y -= 7;
  };
  const section = (title: string, value: string) => {
    if (y < 155) newPage();
    text(title,heading,20); text(value || 'Not recorded.'); y -= 6;
  };
  newPage();
  text('Property diagnosis',heading,32);
  text(`Case ${report.case_id}\nReport ${report.id}\nVersion ${report.version} / reviewed revision ${report.revision}`,regular,9,muted);
  text(`Reviewed: ${report.reviewed_at ?? 'Not recorded'}\nReviewer ID: ${report.reviewed_by ?? 'Not recorded'}`,regular,9,muted);
  section('Summary',report.content.summary);
  section('Findings and uncertainty',report.content.findings);
  section('Questions to resolve',report.content.questions);
  section('Next steps',report.content.nextSteps);
  section('Adviser note',report.content.adviserNote);
  section('Sources and limitations',report.external_sources);
  if (report.source_snapshot.length && y < 250) newPage();
  section('Source document provenance',report.source_snapshot.length ? 'These hashes identify the exact supplied files used for this version. A supplied document is not independent verification.' : 'No case documents were selected for this version.');
  for (const source of report.source_snapshot) {
    if (y < 190) newPage();
    text(`${source.name}\nDocument ${source.id}\n${source.byteSize} bytes\nSHA-256 ${source.sha256}`,regular,9,muted);
  }
  const pages = pdf.getPages();
  for (const [index,p] of pages.entries()) {
    p.drawLine({start:{x:48,y:78},end:{x:547,y:78},thickness:0.5,color:muted});
    p.drawText('Information and analysis only, not legal, tax or financial advice.',{x:48,y:61,size:8,font:regular,color:muted});
    p.drawText('The final decision rests with the client.',{x:48,y:49,size:8,font:regular,color:muted});
    p.drawText(`${index+1} / ${pages.length}`,{x:510,y:49,size:9,font:regular,color:muted});
  }
  return pdf.save();
}
