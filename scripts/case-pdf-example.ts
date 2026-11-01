import { mkdirSync, writeFileSync } from 'node:fs';
import { diagnosisPdf } from '../supabase/functions/_shared/diagnosis-pdf.ts';
import type { Diagnosis } from '../supabase/functions/_shared/cases.ts';
const example: Diagnosis = {
  id:'30000000-0000-4000-8000-000000000001',case_id:'10000000-0000-4000-8000-000000000001',version:1,revision:2,state:'review',
  content:{summary:'Illustrative example only. Check the title before making a decision.',
    findings:'The supplied document does not establish the current remaining lease. No title search, achieved rent or transaction evidence has been independently verified. This example is not a property recommendation.',
    questions:'What does the current title search show?\nWhich expenses are recurring, and what evidence supports them?',
    nextSteps:'Request a current title search from the appointed lawyer. Confirm the financing terms with the bank. Revisit the assessment when the evidence is available.',
    adviserNote:'Do not treat missing evidence as a positive finding.'},
  source_snapshot:[{id:'20000000-0000-4000-8000-000000000001',name:'Fictional title extract.pdf',sha256:'a'.repeat(64),byteSize:1234}],
  external_sources:'Fictional sample documents only. No external research or client data was used.',author_id:'00000000-0000-4000-8000-000000000003',reviewed_by:'00000000-0000-4000-8000-000000000003',reviewed_at:'2026-10-29T00:00:00+08:00',pdf_file_id:null,published_at:null,
};
mkdirSync(new URL('../output/pdf/',import.meta.url),{recursive:true});
writeFileSync(new URL('../output/pdf/case-diagnosis-example.pdf',import.meta.url),await diagnosisPdf(example));
