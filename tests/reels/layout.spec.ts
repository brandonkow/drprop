import { test, expect } from '@playwright/test';
import { formats, reelDefinitions, safeZone } from '../../reels/src/layout';
import { mkdir } from 'node:fs/promises';
for(const [ratio,size] of Object.entries(formats)) {
  test(`${ratio}: all eight compositions keep every caption inside safe bounds`,async({page})=>{
    await page.setViewportSize(size);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    for(const item of reelDefinitions) {
      await page.goto(`/qa.html?kind=${item.id}&ratio=${ratio}&frame=90`);
      await expect(page.locator('[data-safe-content]')).toBeVisible();await page.evaluate(()=>document.fonts.ready);
      await expect.poll(()=>page.evaluate(()=>document.fonts.check('72px InstrumentSerif'))).toBe(true);
      const zone=safeZone(size.width,size.height);
      for (const progress of [.1,.3,.5,.7,.9]) {
      const frame=Math.floor(item.seconds*30*progress);
      await page.evaluate(frame=>window.reelQA?.seekTo(frame),frame);
      await expect.poll(()=>page.evaluate(()=>window.reelQA?.getCurrentFrame())).toBe(frame);
      await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
      const failures=await page.locator('[data-safe-text]').evaluateAll((elements,z)=>elements.flatMap(element=>{const r=element.getBoundingClientRect();return r.left<z.left-1||r.top<z.top-1||r.right>z.left+z.width+1||r.bottom>z.top+z.height+1?[{text:element.textContent?.slice(0,100),left:r.left,top:r.top,right:r.right,bottom:r.bottom}]:[];}),zone);
      expect(failures,`${item.id} ${ratio} frame ${frame}`).toEqual([]);
      }
      await mkdir('docs/qa/reels',{recursive:true});await page.screenshot({path:`docs/qa/reels/${item.id}-${ratio}.png`});
    }
    expect(errors).toEqual([]);
  });
}
test('missing GLB requests fall back to procedural geometry',async({page})=>{
  await page.route('**/*.glb',route=>route.abort());await page.setViewportSize(formats['16x9']);await page.goto('/qa.html?kind=StoreReveal&ratio=16x9&frame=90');
  await expect(page.locator('canvas')).toBeVisible();await expect(page.getByText('Unconfirmed 96 m² concept.',{exact:false})).toBeVisible();await page.screenshot({path:'docs/qa/reels/store-model-fallback.png'});
});
