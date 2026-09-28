import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { formats, safeZone, reelDefinitions } from '../src/layout.ts';
import { validateCase, validateMarket } from '../src/validate.ts';
test('all three layouts reserve platform furniture and remain usable',()=>{for (const {width,height} of Object.values(formats)){const zone=safeZone(width,height);assert.ok(zone.width>=700);assert.ok(zone.height>=700);assert.equal(zone.left+zone.width+zone.right,width);assert.equal(zone.top+zone.height+zone.bottom,height);} const vertical=safeZone(1080,1920);assert.ok(vertical.bottom>=672);assert.equal(vertical.right,230);});
test('all eight named reel series are present with brief durations',()=>{assert.equal(reelDefinitions.length,8);assert.ok(reelDefinitions.every(item=>item.seconds>=7 && item.seconds<=45));assert.equal(new Set(reelDefinitions.map(item=>item.id)).size,8);});
test('source and period metadata cannot be removed from observed statistics',()=>{const data=JSON.parse(readFileSync(new URL('../src/data/market/sample.json',import.meta.url),'utf8'));assert.equal(validateMarket(data).status,'demo');assert.throws(()=>validateMarket({...data,status:'observed',sourceUrl:''}));assert.throws(()=>validateMarket({...data,series:[{label:'2025',value:1},{label:'2025',value:2}]}));});
test('cases must remain short, English and anonymous by design',()=>{const data=JSON.parse(readFileSync(new URL('../src/data/cases/sample.json',import.meta.url),'utf8'));assert.equal(validateCase(data).status,'fictional');assert.throws(()=>validateCase({...data,language:'ms'}));assert.throws(()=>validateCase({...data,lines:['a'.repeat(101)]}));});
