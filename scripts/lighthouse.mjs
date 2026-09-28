import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { mkdir, writeFile } from 'node:fs/promises';

const url = process.env.AUDIT_URL || 'http://127.0.0.1:4173/';
console.log(`Auditing ${url} with simulated mobile throttling`);
const chrome = await launch({
  chromePath: process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' : undefined),
  chromeFlags: ['--headless=new', '--no-first-run'],
});
try {
  const result = await lighthouse(url, {
    port: chrome.port, output: ['html', 'json'], logLevel: 'error', formFactor: 'mobile',
    throttlingMethod: 'simulate', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  });
  if (!result || result.lhr.runtimeError) throw new Error(result?.lhr.runtimeError?.message || 'No Lighthouse result');
  await mkdir('docs/qa', { recursive: true });
  await writeFile('docs/qa/lighthouse-mobile.html', result.report[0].replace(/^[ \t]+$/gm, ''));
  await writeFile('docs/qa/lighthouse-mobile.json', result.report[1]);
  const { lhr } = result;
  const summary = {
    date: lhr.fetchTime, url, lighthouseVersion: lhr.lighthouseVersion,
    environment: lhr.environment, config: lhr.configSettings,
    scores: Object.fromEntries(Object.entries(lhr.categories).map(([name, data]) => [name, Math.round(data.score * 100)])),
    metrics: Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index'].map(id => [id, { value: lhr.audits[id].numericValue, unit: lhr.audits[id].numericUnit }])),
    warnings: lhr.runWarnings,
  };
  await writeFile('docs/qa/lighthouse-summary.json', JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify({ scores: summary.scores, metrics: summary.metrics, warnings: summary.warnings }, null, 2));
} finally {
  try { await chrome.kill(); }
  catch (error) {
    if (error.code !== 'EPERM' && error.code !== 'EBUSY') throw error;
    console.warn('Browser stopped; Windows retained its temporary profile. Saved audit results remain valid.');
  }
}
