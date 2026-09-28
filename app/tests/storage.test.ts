import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeState } from '../src/domain/storage.ts';
const empty={version:1,user:null,membership:null,consultations:[],theme:'system'};
test('corrupt persisted data cannot reach rendering',()=>{assert.deepEqual(decodeState(JSON.stringify(empty)),empty);assert.throws(()=>decodeState('{'));assert.throws(()=>decodeState(JSON.stringify({...empty,user:{id:1}})));assert.throws(()=>decodeState(JSON.stringify({...empty,consultations:[{}]})));});
test('local records cannot be mixed into an anonymous session',()=>{assert.throws(()=>decodeState(JSON.stringify({...empty,membership:{userId:'someone',storeId:'demo',memberNo:'demo',status:'active',renewsAt:null}})));});
