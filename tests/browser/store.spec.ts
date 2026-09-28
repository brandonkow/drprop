import { test, expect } from '@playwright/test';

test('store GLB loads only at the lounge and replaces the concept poster', async ({ page }) => {
  const requests:string[]=[];page.on('request',request=>{if(request.url().endsWith('/models/store.glb'))requests.push(request.url());});
  await page.goto('/');
  expect(requests).toHaveLength(0);
  await page.locator('#lounge-media').scrollIntoViewIfNeeded();
  await expect(page.locator('#lounge-media')).toHaveAttribute('data-model','rendered',{timeout:30000});
  expect(requests).toHaveLength(1);
  await expect(page.locator('#lounge-media img')).toHaveAttribute('src',/^data:image\/png/);
  await page.screenshot({path:'docs/qa/store-model-website.png',fullPage:true});
});

test('missing store GLB retains the labelled, usable poster', async ({ page }) => {
  await page.route('**/models/store.glb',route=>route.abort());await page.goto('/');
  await page.locator('#lounge-media').scrollIntoViewIfNeeded();
  await expect(page.locator('#lounge-media')).toHaveAttribute('data-model','poster',{timeout:30000});
  await expect(page.locator('#lounge-media img')).toHaveAttribute('src','/images/store-concept.webp');
  expect(await page.locator('#lounge-media img').evaluate((image:HTMLImageElement)=>image.complete&&image.naturalWidth>0)).toBe(true);
});

test('reduced motion keeps the store poster without downloading the model', async ({ page }) => {
  await page.emulateMedia({reducedMotion:'reduce'});const requests:string[]=[];
  page.on('request',request=>{if(request.url().endsWith('.glb'))requests.push(request.url());});
  await page.goto('/');await page.locator('#lounge-media').scrollIntoViewIfNeeded();
  await expect(page.locator('#lounge-media img')).toHaveAttribute('src','/images/store-concept.webp');
  expect(requests).toEqual([]);
});
