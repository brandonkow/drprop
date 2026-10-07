/** The built website (web/dist), as a visitor sees it. */
import { expect, test } from '@playwright/test';
import { axeViolations } from './axe';

test('home: five sections, one CTA, the calculator prices every band', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('main section')).toHaveCount(5);
  await expect(page.locator('a.cta')).toHaveCount(1);
  await expect(page.locator('a.cta')).toHaveAttribute('href', /^https:\/\/wa\.me\//);

  const input = page.getByLabel('Property value');
  const fee = page.locator('[data-fee]');
  await expect(fee).toHaveText('—');
  for (const [typed, expected] of [
    ['300000', '199'],
    ['300000.01', '399'],
    ['500000.00', '399'], // a full stop starts the sen: not RM 50 million
    ['600,000', '399'],
    ['1000000', '699'],
    ['2000000', '1,199'],
    ['2000001', '1,999'],
  ] as const) {
    await input.fill(typed);
    await expect(fee).toHaveText(expected);
  }
  await expect(page.locator('a.cta')).toHaveAttribute('href', /RM%201%2C999/);
  await input.fill('abc');
  await expect(fee).toHaveText('—');
  expect(errors).toEqual([]);
});

for (const path of ['/', '/zh/', '/ms/', '/terms/', '/zh/terms/', '/privacy/']) {
  test(`${path} has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(path);
    expect(await axeViolations(page)).toEqual([]);
  });
}

test('terms carry the zero-commission and referral-fee promises in all three languages', async ({ page }) => {
  for (const [path, re] of [
    ['/terms/', /no commission[\s\S]*no referral fees/i],
    ['/zh/terms/', /不从任何交易中收取佣金[\s\S]*不收转介费/],
    ['/ms/terms/', /tidak mengambil komisen[\s\S]*tidak mengambil yuran rujukan/i],
  ] as const) {
    await page.goto(path);
    await expect(page.locator('main')).toContainText(re);
  }
  const notices = await page.request.get('/third-party-notices.txt');
  expect(notices.ok()).toBe(true);
  expect(await notices.text()).toContain('SIL OPEN FONT LICENSE');
});

test('without JavaScript, the text, fee table and booking link are all there', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('table.bands tr')).toHaveCount(5);
  await expect(page.locator('a.cta')).toHaveAttribute('href', /^https:\/\/wa\.me\//);
  await context.close();
});

test('reduced motion and the data saver keep the static line and skip WebGL', async ({ browser }) => {
  const reduced = await browser.newContext({ reducedMotion: 'reduce' });
  const saver = await browser.newContext();
  await saver.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true } }));
  for (const context of [reduced, saver]) {
    const page = await context.newPage();
    const scripts: string[] = [];
    page.on('response', (r) => r.url().endsWith('.js') && scripts.push(r.url()));
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.locator('.pulse svg').first()).toBeVisible();
    expect(scripts.some((u) => /pulse-line|fluid/.test(u))).toBe(false);
    await context.close();
  }
});

for (const width of [320, 390, 768, 1440]) {
  test(`no sideways scrolling at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/zh/', '/terms/']) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
}
