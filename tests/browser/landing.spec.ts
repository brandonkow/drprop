import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';

test('calculator, honest booking state, semantic structure and accessibility', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-MY');
  await expect(page.locator('main > section')).toHaveCount(5);
  await expect(page.locator('#booking-link')).toHaveAttribute('aria-disabled', 'true');
  expect(await page.locator('#booking-link').getAttribute('href')).toBeNull();
  await expect(page.locator('#maps-link')).toBeHidden();
  await expect(page.locator('#fee-value')).toHaveText('—');
  const input = page.getByLabel('Property price', { exact: true });
  for (const [amount, fee] of [['300000', '199'], ['300000.01', '399'], ['600000.01', '699'], ['1000000.01', '1,199'], ['2000000.01', '1,999'], ['500,000', '399']]) {
    await input.fill(amount);
    await expect(page.locator('#fee-value')).toHaveText(fee);
  }
  await input.fill('-100');
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#price-error')).toContainText('Enter a positive amount');
  await expect(page.locator('#fee-value')).toHaveText('—');
  await input.fill('');
  await expect(input).toHaveAttribute('aria-invalid', 'false');
  await expect(page.locator('#price-error')).toBeEmpty();
  await page.keyboard.press('Control+Home');
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.keyboard.press('Tab');
  await expect(page.getByText('Skip to content', { exact: true })).toBeFocused();
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  expect(errors).toEqual([]);
});

for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 720 }]) {
  test(`responsive layout and screenshot ${viewport.width}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    const input = page.getByLabel('Property price', { exact: true });
    await input.fill('500,000');
    await expect(page.locator('#fee-value')).toHaveText('399');
    await page.evaluate(() => window.scrollTo(0, 0));
    await input.blur();
    await mkdir('docs/qa', { recursive: true });
    await page.screenshot({ path: `docs/qa/landing-${viewport.width}.png`, fullPage: true });
    if (viewport.width === 1440 || viewport.width === 390) {
      await page.screenshot({ path: `docs/qa/hero-${viewport.width}.png` });
    }
    const a11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(a11y.violations).toEqual([]);
  });
}

test('content remains available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Before you sign');
  await expect(page.getByText('Up to RM 300,000', { exact: true })).toBeVisible();
  await expect(page.getByText('Enable JavaScript to use the calculator.', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Property price', { exact: true })).toBeDisabled();
  await context.close();
});

test('reduced-motion needs no animation or WebGL', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
});
