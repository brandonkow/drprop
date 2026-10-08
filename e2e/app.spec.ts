/** The app's preview journey, from its web export (app/dist). */
import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from './axe';

async function signIn(page: Page) {
  await page.goto('/');
  await page.getByText('EN', { exact: true }).click();
  await page.getByRole('textbox').fill('+60 12 345 6789');
  await page.getByText('Send code').click();
  await expect(page.getByText('The six-digit code.')).toBeVisible();
  await page.getByRole('textbox').fill('123456');
  await page.getByText('Continue').click();
  await expect(page.getByText('What should we call you?')).toBeVisible();
  await page.getByRole('textbox').fill('Mr Tan');
  await page.getByText('Start', { exact: true }).click();
  await expect(page.getByText(/Mr Tan\./)).toBeVisible();
}

test('sign in, book a consult, see it in Records, cancel it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await signIn(page);
  expect(await axeViolations(page)).toEqual([]);

  await page.getByText('Start a consult').click();
  expect(await axeViolations(page)).toEqual([]);
  await page.getByText('Consult', { exact: true }).click();
  await page.getByText('RM 300k – 600k').click();
  expect(await axeViolations(page)).toEqual([]);
  await page.getByText('Next').click();
  await page.locator('text=/^1[0-9]:[03]0$/').nth(1).click();
  await page.getByText('Pay RM 399').click();
  await expect(page.getByRole('heading', { name: 'Booked.' })).toBeVisible();
  await page.getByText('Back to home').click();

  await page.goto('/records');
  await expect(page.getByText('Booked', { exact: true })).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
  await page.getByText('Booked', { exact: true }).click();
  // Every diagnosis carries the disclaimer (brief §2.5).
  await expect(page.getByText(/not legal, tax or financial advice/)).toBeVisible();
  await page.getByText('Cancel this booking').click();
  await page.getByText('Yes, cancel it').click();
  await expect(page.getByText(/Consult · Cancelled/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('a review follows the sample diagnosis, at half its fee', async ({ page }) => {
  await signIn(page);
  await page.goto('/records');
  await page.getByText(/Sample/).first().click();
  // The sample record opens the sample report itself (a bundled PDF, in a new tab on the web).
  const [pdf] = await Promise.all([page.context().waitForEvent('page'), page.getByText('Open the sample diagnosis (PDF)').click()]);
  await pdf.waitForLoadState('domcontentloaded').catch(() => undefined);
  expect(pdf.url()).toMatch(/diagnosis-en.*\.pdf/);
  await pdf.close();
  await page.getByText('Book a pre-signing review').click();
  // RM 699 band, half price, rounded up to whole ringgit.
  await expect(page.getByText('RM 350', { exact: true })).toBeVisible();
});
