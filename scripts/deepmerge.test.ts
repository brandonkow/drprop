import { createRequire } from 'node:module';
import { expect,it } from 'vitest';
const require=createRequire(import.meta.url);
const merge=require('deepmerge');
it('does not poison returned prototypes through target, source or nested dangerous keys',()=>{
  const poison=JSON.parse('{"__proto__":{"compromised":true},"constructor":{"prototype":{"compromised":true}},"prototype":{"compromised":true},"safe":1}');
  for(const result of [merge(poison,{}),merge({},poison),merge({nested:poison},{nested:{}}).nested,merge({nested:{}},{nested:poison}).nested]) {
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(result.compromised).toBeUndefined();expect(result.safe).toBe(1);
    for(const key of ['__proto__','constructor','prototype'])expect(Object.hasOwn(result,key)).toBe(false);
  }
  expect(({} as Record<string,unknown>).compromised).toBeUndefined();
});
it('preserves ordinary nested config, array, symbol and custom merging',()=>{
  const key=Symbol('config');
  const result=merge({nested:{a:1},list:[1],[key]:'before'},{nested:{b:2},list:[2],[key]:'after'});
  expect(result).toEqual({nested:{a:1,b:2},list:[1,2],[key]:'after'});
  expect(merge({list:[1]},{list:[2]},{arrayMerge:(_a:unknown,b:unknown)=>b})).toEqual({list:[2]});
  expect(merge.all([{a:1},{b:2}])).toEqual({a:1,b:2});
});
