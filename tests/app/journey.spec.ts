import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
async function signIn(page: Page) {
  await page.goto('/');
  await page.getByLabel('Phone number', { exact: true }).fill('+60123456789');
  await page.getByRole('button', { name: 'Continue with phone', exact: true }).click();
  await page.getByLabel('Preview verification code', { exact: true }).fill('246810');
  await page.getByRole('button', { name: 'Verify preview code' }).click();
  await page.getByLabel('Preferred name', { exact: true }).fill('Alex');
  await page.getByRole('button', { name: 'Enter the lounge' }).click();
  await expect(page.getByRole('button', { name: 'Start a consultation', exact: true })).toBeVisible();
}
async function screenshot(page:Page,name:string) { await mkdir('docs/qa/app',{recursive:true});await page.screenshot({path:`docs/qa/app/${name}.png`,fullPage:true}); }
test('four-screen booking, attachments, persistence and cancellation',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await signIn(page);await expect(page.getByRole('tab')).toHaveCount(3);await screenshot(page,'home');
  await page.getByRole('button',{name:'Start a consultation',exact:true}).click();
  await expect(page.getByText('CONSULTATION / 1 OF 4')).toBeVisible();await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByText('CONSULTATION / 2 OF 4')).toBeVisible();
  await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.getByRole('alert')).toContainText('short name');
  await page.getByLabel('Property shorthand',{exact:true}).fill('Sample terrace');
  await page.getByRole('radio',{name:'Over RM 300,000 to RM 600,000',exact:true}).click();
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Choose sample documents'}).click();await (await chooser).setFiles(path.resolve('app/src/assets/sample-diagnosis.pdf'));
  await expect(page.getByRole('button',{name:'Remove sample-diagnosis.pdf'})).toBeVisible();
  await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.getByText('CONSULTATION / 3 OF 4')).toBeVisible();
  await page.getByRole('radio').first().click();await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.getByText('CONSULTATION / 4 OF 4')).toBeVisible();
  await expect(page.getByText('RM 399',{exact:true})).toBeVisible();await screenshot(page,'booking-confirmation');
  await page.getByRole('button',{name:'Confirm simulated payment'}).click();await expect(page.getByText('No payment was collected and no adviser was booked.')).toBeVisible();
  await page.getByRole('button',{name:'View booking record'}).click();await expect(page.getByText(/file contents not stored/)).toBeVisible();
  await page.reload();await expect(page.getByText('Sample terrace',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Cancel this booking'}).click();await page.getByRole('button',{name:'Confirm cancellation'}).click();await expect(page.getByText('CANCELLED / PREVIEW RECORD')).toBeVisible();
  expect(errors).toEqual([]);
});
test('fictional report, linked final check, membership and profile',async({page})=>{
  await signIn(page);await page.getByRole('tab',{name:'Records'}).click();await expect(page.getByText('A clean bill of health.')).toBeVisible();
  await page.getByRole('button',{name:'Load fictional sample record'}).click();await page.getByRole('button',{name:'Open record'}).click();await screenshot(page,'sample-record');
  const popup=page.waitForEvent('popup');await page.getByRole('button',{name:'Open sample PDF report'}).click();const report=await popup;await report.waitForLoadState();expect(report.url()).toContain('.pdf');await report.close();
  await page.getByRole('button',{name:'Book a final check'}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('radio').first().click();await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.getByText('RM 199.50',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Confirm simulated payment'}).click();await page.getByRole('button',{name:'Back to Home'}).click();await page.getByRole('button',{name:'View your membership card'}).click();await expect(page.getByText('PREVIEW / NOT A VALID MEMBERSHIP')).toBeVisible();await screenshot(page,'membership');
  await page.getByRole('button',{name:'Enable card motion'}).click();await expect(page.getByRole('alert')).toContainText('reduced-motion');
  await page.getByRole('button',{name:'Back to Home'}).click();await page.getByRole('tab',{name:'Me',exact:true}).click();await page.getByLabel('Preferred drink',{exact:true}).fill('Tea, no sugar');await page.getByRole('button',{name:'Save preferences'}).click();await expect(page.getByRole('alert')).toContainText('saved');
  await page.getByRole('radio',{name:'Night',exact:true}).click();await screenshot(page,'profile-night');
  await page.reload();await expect(page.getByLabel('Preferred drink',{exact:true})).toHaveValue('Tea, no sugar');
  await page.getByRole('button',{name:'Try membership renewal'}).click();await page.getByRole('button',{name:'Confirm simulated renewal'}).click();await expect(page.getByRole('alert')).toContainText('No payment');
});
test('invalid login, accessible home, narrow layout and clearing local state',async({page})=>{
  await page.goto('/');await page.getByLabel('Phone number',{exact:true}).fill('invalid');await page.getByRole('button',{name:'Continue with phone'}).click();await expect(page.getByRole('alert')).toContainText('Malaysian number');
  await signIn(page);const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(results.violations).toEqual([]);
  await page.setViewportSize({width:320,height:740});await screenshot(page,'home-320');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('tab',{name:'Me',exact:true}).click();await page.getByRole('button',{name:'Sign out and clear preview'}).click();await page.getByRole('button',{name:'Confirm sign out'}).click();await expect(page.getByLabel('Phone number',{exact:true})).toBeVisible();await page.goto('/membership');await expect(page.getByLabel('Phone number',{exact:true})).toBeVisible();
});
