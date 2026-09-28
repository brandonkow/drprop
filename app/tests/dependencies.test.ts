import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
test('patched query decoding retains routes and terminates on malformed input',()=>{
  const query=require('query-string');
  assert.equal(query.parse('followUp=sample%2Dcase').followUp,'sample-case');
  assert.equal(query.stringify({name:'Café & tea'}),'name=Caf%C3%A9%20%26%20tea');
  const start=performance.now();const parsed=query.parse('value='+ '%E0%A4'.repeat(1000));
  assert.equal(typeof parsed.value,'string');assert.ok(performance.now()-start<1000);
});
test('Xcode project identifiers remain 24 uppercase hexadecimal characters',()=>{
  const project=require('xcode').project('preview.pbxproj');
  project.hash={project:{objects:{PBXProject:{}}}};
  const first=project.generateUuid(),second=project.generateUuid();assert.match(first,/^[0-9A-F]{24}$/);assert.notEqual(first,second);
});
