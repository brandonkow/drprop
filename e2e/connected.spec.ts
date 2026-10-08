/**
 * The app in supabase mode against e2e/fake-supabase.mjs (the real migration on
 * PGlite, row security on): proves the app and the database agree on every call.
 * Runs in order: the adviser picks up what the client asked for.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';
import { axeViolations } from './axe';

test.describe.configure({ mode: 'serial' });
test.use({ timezoneId: 'Asia/Kuala_Lumpur', locale: 'en-MY' });

async function signIn(browser: Browser, phone: string, name?: string): Promise<Page> {
  const context = await browser.newContext({ timezoneId: 'Asia/Kuala_Lumpur', locale: 'en-MY', viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on('pageerror', (e) => {
    throw e;
  });
  await page.goto('/');
  await page.getByText('EN', { exact: true }).click();
  await page.getByRole('textbox').fill(phone);
  await page.getByText('Send code').click();
  await expect(page.getByText('The six-digit code.')).toBeVisible();
  await page.getByRole('textbox').fill('123456');
  await page.getByText('Continue').click();
  if (name) {
    await expect(page.getByText('What should we call you?')).toBeVisible();
    await page.getByRole('textbox').fill(name);
    await page.getByText('Start', { exact: true }).click();
  }
  return page;
}

test('a client signs in by SMS, books a published time, cancels it, and asks for an urgent call', async ({ browser }) => {
  const page = await signIn(browser, '012-345 6789', 'Mr Tan');
  await expect(page.getByText(/Mr Tan\./)).toBeVisible();
  // The Lounge board as the front desk set it; no card link without a membership.
  await expect(page.getByText(/3 seats free/)).toBeVisible();
  await expect(page.getByText(/Kopi Tarik · Ipoh/)).toBeVisible();
  await expect(page.getByText('Your member card')).toHaveCount(0);
  expect(await axeViolations(page)).toEqual([]);

  // A consult in a published slot: the fee comes from the server.
  await page.getByText('Start a consult').click();
  await page.getByText('Consult', { exact: true }).click();
  await page.getByText('RM 300k – 600k').click();
  await page.getByText('Next').click();
  await page.getByText('10:30', { exact: true }).click();
  await expect(page.getByText('RM 399', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('No payment is taken in the app yet.').first()).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
  await page.getByText('Request this time').click();
  await expect(page.getByRole('heading', { name: 'Requested.' })).toBeVisible();
  await expect(page.getByText(/with Aisyah/)).toBeVisible();
  await page.getByText('Back to home').click();

  // Records: awaiting the adviser; cancel it.
  await page.getByText('Records', { exact: true }).last().click();
  await page.getByText('Awaiting confirmation').first().click();
  await page.getByText('Cancel this booking').click();
  await page.getByText('Yes, cancel it').click();
  await expect(page.getByText(/Consult · Cancelled/)).toBeVisible();
  await page.getByText('Back', { exact: true }).click();

  // An urgent call-back: no slot, +50%.
  await page.getByText('Home', { exact: true }).last().click();
  await page.getByText('Start a consult').click();
  await page.getByText('Urgent', { exact: true }).click();
  await page.getByText('RM 300k – 600k').click();
  await page.getByText('Next').click();
  await expect(page.getByText('RM 599', { exact: true }).last()).toBeVisible();
  await page.getByText('Request the call').click();
  await expect(page.getByText('An adviser calls within two hours.')).toBeVisible();

  // Me: no membership yet.
  await page.getByText('Back to home').click();
  await page.getByText('Me', { exact: true }).last().click();
  await expect(page.getByText(/Not a member yet/)).toBeVisible();
  await page.context().close();
});

test('the adviser takes the call-back, finishes it, writes the note, and updates the Lounge board', async ({ browser }) => {
  const page = await signIn(browser, '011-1111 1111');
  await expect(page.getByText(/Aisyah\./)).toBeVisible();
  await page.getByText('Me', { exact: true }).last().click();
  await page.getByText('Adviser schedule').last().click();

  // The client's drink travels with the call-back (brief §4.1).
  await expect(page.getByText(/Drink: /)).toHaveCount(0); // Mr Tan set none
  await expect(page.getByText('Mr Tan', { exact: false }).first()).toBeVisible();
  await page.getByText('Take the call').click();
  await expect(page.getByText('Confirmed')).toBeVisible();
  await page.getByText('Mark done').click();
  await expect(page.getByText('Done', { exact: true })).toBeVisible();

  await page.getByLabel('Note for the client').fill('Ask the bank about the lease first.');
  await page.getByLabel('Questions for the client, one per line').fill('How many years are left on the lease?');
  await page.getByText('Save note').click();
  await expect(page.getByText('Saved.')).toBeVisible();

  await page.getByText('+', { exact: true }).click();
  await page.getByText('Update the board').click();
  await expect(page.getByText('Saved.')).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
  await page.context().close();
});

test('the front desk checks a member in with the code on their card, once', async ({ browser }) => {
  const page = await signIn(browser, '011-1111 1111');
  await page.getByText('Your member card').click();
  // Six digits from the server, shown under the QR for typing when a scan fails.
  const shown = await page.getByText(/^Code \d{3} \d{3}$/).textContent();
  const code = shown!.replace(/\D/g, '');
  expect(await axeViolations(page)).toEqual([]);
  await page.getByText('Close', { exact: true }).click();

  await page.getByText('Me', { exact: true }).last().click();
  await page.getByText('Adviser schedule').last().click();
  // A desk scanner types the QR text and presses Enter.
  await page.getByLabel('Check-in code').fill(`drprop:checkin:${code}`);
  await page.getByLabel('Check-in code').press('Enter');
  await expect(page.getByText('Checked in: Aisyah · PJ-0001')).toBeVisible();
  await expect(page.getByText('Drink: Teh tarik')).toBeVisible();

  await page.getByLabel('Check-in code').fill(code);
  await page.getByText('Check in', { exact: true }).click();
  await expect(page.getByText('That code no longer works. Ask the member to open their card again.')).toBeVisible();
  await page.context().close();
});

test('the client sees the finished call with the adviser’s note, and the new Lounge board', async ({ browser }) => {
  const page = await signIn(browser, '012-345 6789'); // returning: no name question
  await expect(page.getByText(/Mr Tan\./)).toBeVisible();
  await expect(page.getByText(/4 seats free/)).toBeVisible();
  await page.getByText('Records', { exact: true }).last().click();
  await page.getByText('Done', { exact: true }).first().click();
  await expect(page.getByText('Ask the bank about the lease first.')).toBeVisible();
  await expect(page.getByText('How many years are left on the lease?')).toBeVisible();
  await expect(page.getByText(/not legal, tax or financial advice/)).toBeVisible();
  await page.context().close();
});
