import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
test.setTimeout(60000);

test('all three layers initialize; pointer ink clears; scroll reaches skyline', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const canvas = page.locator('#effects-canvas');
  await expect(page.locator('html')).toHaveAttribute('data-effects-state', 'ready', { timeout: 20000 });
  await expect(canvas).toHaveAttribute('data-fluid', 'enabled');
  expect(Number(await canvas.getAttribute('data-pixel-ratio'))).toBeLessThanOrEqual(1.5);
  await expect(canvas).toHaveAttribute('data-ink', 'idle');
  await expect.poll(async () => Number(await canvas.getAttribute('data-progress'))).toBeGreaterThan(0.24);
  const inkArea = { x: 900, y: 200, width: 300, height: 240 };
  const beforeInk = await page.screenshot({ clip: inkArea });
  await page.mouse.move(950, 240);
  await page.mouse.move(1150, 350, { steps: 20 });
  await expect(canvas).toHaveAttribute('data-ink', 'active');
  await mkdir('docs/qa', { recursive: true });
  const afterInk = await page.screenshot({ clip: inkArea, path: 'docs/qa/effects-ink-detail.png' });
  expect(afterInk.equals(beforeInk)).toBe(false);
  await page.screenshot({ path: 'docs/qa/effects-ink-desktop.png' });
  await expect(canvas).toHaveAttribute('data-ink', 'idle', { timeout: 6000 });
  await page.screenshot({ path: 'docs/qa/effects-hero-desktop.png' });
  await page.getByLabel('Property price', { exact: true }).fill('1500000');
  await expect(page.locator('#fee-value')).toHaveText('1,199');
  await expect.poll(async () => Number(await canvas.getAttribute('data-response-peak'))).toBeGreaterThan(0);
  await page.locator('.fee-pulse').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'docs/qa/effects-fees-desktop.png' });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(async () => Number(await canvas.getAttribute('data-progress'))).toBeGreaterThan(0.99);
  await page.screenshot({ path: 'docs/qa/effects-skyline-desktop.png' });
  expect(errors).toEqual([]);
});

test('no WebGL retains visible SVG, body copy and calculator', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type.includes('webgl')) return null;
      return original.call(this, type, ...args);
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-effects-state', 'no-webgl');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('.pulse img')).toBeVisible();
  await page.getByLabel('Property price', { exact: true }).fill('500000');
  await expect(page.locator('#fee-value')).toHaveText('399');
});

test('low memory skips fluid; high-DPR phone is capped and stays responsive', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.addInitScript(() => Object.defineProperty(navigator, 'deviceMemory', { value: 2, configurable: true }));
  await page.goto('http://127.0.0.1:4173');
  await expect(page.locator('html')).toHaveAttribute('data-effects-state', 'ready', { timeout: 20000 });
  await expect(page.locator('canvas')).toHaveAttribute('data-fluid', 'low-memory');
  await expect(page.locator('canvas')).toHaveAttribute('data-pixel-ratio', '1.5');
  await page.getByLabel('Property price', { exact: true }).fill('600001');
  await expect(page.locator('#fee-value')).toHaveText('699');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'docs/qa/effects-low-memory-phone.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await context.close();
});

test('live reduced-motion change tears down and restores the scene', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-effects-state', 'ready', { timeout: 20000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-effects-state', 'reduced-motion');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('.pulse img')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).toHaveAttribute('data-effects-state', 'ready', { timeout: 20000 });
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('4GB mobile uses 256 dye and preserves native touch scrolling under CPU throttling', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addInitScript(() => Object.defineProperty(navigator, 'deviceMemory', { value: 4, configurable: true }));
  await page.goto('http://127.0.0.1:4173');
  await expect(page.locator('html')).toHaveAttribute('data-effects-state', 'ready', { timeout: 20000 });
  await expect(page.locator('canvas')).toHaveAttribute('data-fluid', 'enabled');
  await expect(page.locator('canvas')).toHaveAttribute('data-dye-resolution', '256');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 700 }] });
  for (const y of [620, 540, 460, 380, 300]) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(150);
  await page.getByLabel('Property price', { exact: true }).fill('500000');
  await expect(page.locator('#fee-value')).toHaveText('399');
  await page.screenshot({ path: 'docs/qa/effects-4gb-phone.png', scale: 'css' });
  await context.close();
});

test('hidden-page handler stops GPU frames and resumes without stale ink', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-effects-state', 'ready', { timeout: 20000 });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-paused', 'true');
  const before = await canvas.getAttribute('data-frames');
  // A bounded idle interval is required to observe that no rendering occurs.
  await page.waitForTimeout(500);
  expect(await canvas.getAttribute('data-frames')).toBe(before);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(canvas).toHaveAttribute('data-paused', 'false');
  await expect.poll(async () => Number(await canvas.getAttribute('data-frames'))).toBeGreaterThan(Number(before));
  await expect(canvas).toHaveAttribute('data-ink', 'idle');
});

test('lost GPU context returns to the static page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-effects-state', 'ready', { timeout: 20000 });
  await page.evaluate(() => document.querySelector('canvas')!.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(page.locator('html')).toHaveAttribute('data-effects-state', 'context-lost');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('.pulse img')).toBeVisible();
  await page.getByLabel('Property price', { exact: true }).fill('2000001');
  await expect(page.locator('#fee-value')).toHaveText('1,999');
});

test('reduced motion skips the scene download entirely', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const sceneRequests: string[] = [];
  page.on('request', request => { if (/\/scene-[^/]+\.js/.test(request.url())) sceneRequests.push(request.url()); });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-effects-state', 'reduced-motion');
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(sceneRequests).toEqual([]);
});
