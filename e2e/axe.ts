import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { Page } from '@playwright/test';

const source = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

/** WCAG 2.1 A/AA violations on the page, as short strings (empty when clean). */
export async function axeViolations(page: Page): Promise<string[]> {
  if (!(await page.evaluate(() => 'axe' in window))) await page.addScriptTag({ content: source });
  return page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run(ctx: Document, opts: object): Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe;
    const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
    return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  });
}
