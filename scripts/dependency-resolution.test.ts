import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const require=createRequire(import.meta.url);
const from=(name:string)=>createRequire(require.resolve(name));
describe('installed dependency resolution and legacy compatibility',()=>{
  it('actually resolves the hardened deepmerge from Expo, including poisoned targets',()=>{
    const merge=from('@expo/config')('deepmerge');
    const result=merge(JSON.parse('{"__proto__":{"polluted":true},"safe":1}'),{other:2});
    expect(result).toEqual({safe:1,other:2});expect(result.polluted).toBeUndefined();
    expect(from('@expo/config').resolve('deepmerge')).toBe(require.resolve('deepmerge'));
  });
  it('uses patched Zod for Remotion and preserves the required Zod 3 Expo API',()=>{
    expect(from('@remotion/studio')('zod/package.json').version).toBe('4.6.7');
    const cli=createRequire(from('expo').resolve('@expo/cli/package.json'));
    expect(cli('zod/package.json').version).toBe('3.25.76');
  });
  it('retains callable legacy minimatch without the advisory preprocessing amplification mechanism',()=>{
    for(const consumer of ['eslint','eslint-plugin-import','eslint-plugin-react','@eslint/config-array','@eslint/eslintrc']){
      const local=from(consumer);const match=local('minimatch');
      expect(local('minimatch/package.json').version).toBe('3.1.5');
      expect(match('app/src/index.ts','**/*.ts')).toBe(true);
      const code=readFileSync(local.resolve('minimatch'),'utf8');
      expect(code).not.toMatch(/firstPhasePreProcess|secondPhasePreProcess/);
      const pattern=new match.Minimatch('**/../'.repeat(100)+'file.ts',{optimizationLevel:2});
      expect(pattern.globParts).toHaveLength(1);
    }
  });
});
