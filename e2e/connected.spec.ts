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


test('private documents survive retry and an adviser publishes the reviewed PDF to its owner only', async ({ browser }, testInfo) => {
  test.setTimeout(120000);
  const client=await signIn(browser,'012-345 6789');
  await client.getByText('Records',{exact:true}).last().click();
  await client.getByText('Done',{exact:true}).first().click();
  await client.getByText('Open private case',{exact:true}).click();
  await expect(client.getByText('No documents uploaded.')).toBeVisible();
  const caseUrl=client.url();
  await client.route('**/case-files/upload',(route)=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Upload interrupted. Retry the selected file.'})}));
  const chooser=client.waitForEvent('filechooser');
  await client.getByText('Upload document',{exact:true}).click();
  await (await chooser).setFiles({name:'Fictional title.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\nFictional source for browser testing only.\n%%EOF')});
  await expect(client.getByText('Upload interrupted. Retry the selected file.')).toBeVisible();
  await client.unroute('**/case-files/upload');
  await client.getByText('Retry selected upload',{exact:true}).click();
  await expect(client.getByText('Download Fictional title.pdf',{exact:true})).toBeVisible();
  await expect(client.getByText('No diagnosis has been published yet.')).toBeVisible();

  const adviser=await signIn(browser,'011-1111 1111');
  await adviser.goto(caseUrl);
  await adviser.getByLabel('Summary',{exact:true}).fill('Fictional example: confirm the lease before deciding.');
  await adviser.getByLabel('Findings and uncertainty',{exact:true}).fill('The supplied document does not establish the remaining lease. No independent title search has been completed.');
  await adviser.getByLabel('Questions to resolve',{exact:true}).fill('What does the current title search show?');
  await adviser.getByLabel('Next steps',{exact:true}).fill('Ask the appointed lawyer for current evidence.');
  await adviser.getByLabel('Adviser note',{exact:true}).fill('Do not treat an unresolved question as a positive finding.');
  await adviser.getByLabel('Sources and limitations',{exact:true}).fill('Fictional uploaded source only; not independently verified.');
  await adviser.getByRole('button',{name:'Select: Fictional title.pdf',exact:true}).click();
  await adviser.getByText('Save diagnosis draft',{exact:true}).click();
  await expect(adviser.getByText('Draft saved.',{exact:true})).toBeVisible();
  await client.getByText('Reload case',{exact:true}).click();
  await expect(client.getByText('No diagnosis has been published yet.')).toBeVisible();
  await adviser.getByText('Review saved diagnosis',{exact:true}).click();
  await expect(adviser.getByLabel('Summary',{exact:true})).not.toBeEditable();
  expect(await axeViolations(adviser)).toEqual([]);
  await adviser.screenshot({path:testInfo.outputPath('case-adviser-review.png'),fullPage:true});
  const publication=adviser.waitForResponse((r)=>r.url().endsWith('/functions/v1/case-files') && r.request().postDataJSON()?.action==='publish',{timeout:30000});
  await adviser.getByText('Publish reviewed PDF',{exact:true}).click();
  const published=await publication;
  expect(await published.json()).toMatchObject({state:'published'});
  await expect(adviser.getByText('Diagnosis published.',{exact:true})).toBeVisible({timeout:30000});
  await client.getByText('Reload case',{exact:true}).click();
  await expect(client.getByText('Fictional example: confirm the lease before deciding.')).toBeVisible();
  const download=client.waitForEvent('download');
  await client.getByText('Download diagnosis v1',{exact:true}).click();
  const delivered=await download;
  expect(delivered.suggestedFilename()).toBe('Diagnosis v1.pdf');
  await delivered.saveAs(testInfo.outputPath('diagnosis-v1.pdf'));
  expect(await axeViolations(client)).toEqual([]);
  await client.screenshot({path:testInfo.outputPath('case-client-published.png'),fullPage:true});
  const stranger=await signIn(browser,'012-000 0011','Other client');
  await stranger.goto(caseUrl);
  await expect(stranger.getByText('No case content is available.')).toBeVisible();
  await expect(stranger.getByText('Fictional title.pdf',{exact:true})).toHaveCount(0);
  await Promise.all([client.context().close(),adviser.context().close(),stranger.context().close()]);
});

test('a payment operator reconciles and refunds a fictional test order while clients are denied',async({browser,request},testInfo)=>{
  const seeded=await request.post('http://127.0.0.1:54321/__fixture/paid-order');expect(seeded.ok()).toBe(true);
  const order=await seeded.json();const adviser=await signIn(browser,'011-1111 1111');
  await adviser.goto('/payments');await adviser.getByText('Load latest test orders',{exact:true}).click();
  await adviser.getByRole('button',{name:`Review test order ${order.id}`,exact:true}).click();
  await adviser.getByRole('button',{name:'Reconcile with Stripe',exact:true}).click();
  await expect(adviser.getByText('Verified test order: paid.',{exact:true})).toBeVisible();
  await adviser.getByLabel('Refund amount in sen',{exact:true}).fill('100');
  await adviser.getByLabel('Refund review reason',{exact:true}).fill('Fictional browser refund review.');
  await adviser.getByRole('button',{name:'Submit reviewed test refund',exact:true}).click();
  await expect(adviser.getByText('Test refund: succeeded.',{exact:true})).toBeVisible();
  expect(await axeViolations(adviser)).toEqual([]);
  await adviser.screenshot({path:testInfo.outputPath('test-payment-operator.png'),fullPage:true});
  const client=await signIn(browser,'012-345 6789');await client.goto('/payments');
  await client.getByText('Load latest test orders',{exact:true}).click();
  await expect(client.getByRole('alert')).toBeVisible();await expect(client.getByText(order.id,{exact:true})).toHaveCount(0);
  await client.goto(`/record/${order.bookingId}`);await client.getByText('Show test payment record',{exact:true}).click();
  await expect(client.getByText(/TEST payment record.*refunded RM 1.00/)).toBeVisible();
  await Promise.all([client.context().close(),adviser.context().close()]);
});

test('profile save failure is visible and retry persists the latest English profile', async ({ browser }) => {
  const page = await signIn(browser, '012-345 6789');
  await expect(page.getByText(/Mr Tan\./)).toBeVisible();
  await page.getByText('Me', { exact: true }).last().click();
  await page.route('**/rpc/dp_save_profile', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Offline test' }) }));
  await page.getByRole('textbox').first().fill('Tan Updated');
  await expect(page.getByText('Your changes were not saved. Check your connection and retry.')).toBeVisible();
  await page.unroute('**/rpc/dp_save_profile');
  const saved = page.waitForResponse((r) => r.url().includes('/rpc/dp_save_profile') && r.status() === 200);
  await page.getByText('Retry saving profile').click();
  const response = await saved;
  expect(response.request().postDataJSON()).toMatchObject({ p_name: 'Tan Updated', p_language: 'en' });
  await expect(page.getByText('Retry saving profile')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('textbox').first()).toHaveValue('Tan Updated');
  await page.context().close();
});

test('a delayed foreground refresh cannot restore a signed-out account', async ({ browser }) => {
  const page = await signIn(browser, '011-1111 1111');
  await expect(page.getByText(/Aisyah\./)).toBeVisible();
  await page.getByText('Me', { exact: true }).last().click();
  let release!: () => void;
  let started!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const requested = new Promise<void>((resolve) => { started = resolve; });
  await page.route('**/rest/v1/dp_bookings?*', async (route) => {
    const response = await route.fetch();
    started();
    await held;
    await route.fulfill({ response });
  });
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await requested;
  await page.getByText('Sign out', { exact: true }).click();
  await expect(page.getByText('Send code')).toBeVisible();
  const returned = page.waitForResponse((r) => r.url().includes('/rest/v1/dp_bookings?'));
  release();
  await returned;
  await expect(page.getByText('Send code')).toBeVisible();
  await expect(page.getByText('Adviser schedule')).toHaveCount(0);
  await page.context().close();
});

test('an expired displayed check-in code disappears even when refresh fails', async ({ browser }) => {
  const page = await signIn(browser, '011-1111 1111');
  await expect(page.getByText(/Aisyah\./)).toBeVisible();
  await page.clock.install();
  await page.route('**/rpc/dp_checkin_code', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: '654321', expires_at: new Date(Date.now() + 2000).toISOString() }) }));
  await page.getByText('Your member card').click();
  await expect(page.getByText('Code 654 321')).toBeVisible();
  await page.clock.fastForward(3000);
  await expect(page.getByText('Code 654 321')).toHaveCount(0);
  await page.unroute('**/rpc/dp_checkin_code');
  await page.route('**/rpc/dp_checkin_code', (route) => route.abort());
  await page.clock.fastForward(60000);
  await expect(page.getByText('Code 654 321')).toHaveCount(0);
  await page.context().close();
});
