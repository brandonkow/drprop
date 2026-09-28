import type { CaseData, MarketData } from './types.ts';
export function validateCase(value: unknown): CaseData {
  const data = value as CaseData;
  if (!data || data.language !== 'en' || !['fictional','anonymized'].includes(data.status) || typeof data.hook !== 'string' || data.hook.length > 100 || !Array.isArray(data.lines) || data.lines.length < 1 || data.lines.length > 6 || data.lines.some(line => typeof line !== 'string' || !line.trim() || line.length > 100) || !['terrace','condo','bungalow'].includes(data.houseType) || !['none','roof','title','facade'].includes(data.highlight)) throw new Error('Invalid case data. Use English copy, 1–6 concise lines and a supported anonymous house.');
  return data;
}
export function validateMarket(value: unknown): MarketData {
  const data = value as MarketData;
  if (!data || data.language !== 'en' || !['demo','observed'].includes(data.status) || !data.title || data.title.length > 90 || !data.source || !data.asOf || !data.retrievedAt || !data.unit || !data.metric || !data.geography || !data.frequency || !Array.isArray(data.series) || data.series.length < 2 || data.series.length > 6 || data.series.some(item => !item.label || item.label.length > 8 || !Number.isFinite(item.value) || item.value < 0)) throw new Error('Invalid market series. Include 2–6 comparable nonnegative observations, source, geography, unit and dates.');
  if (data.status === 'observed' && !/^https:\/\//.test(data.sourceUrl)) throw new Error('Observed statistics require a direct HTTPS source URL.');
  if (new Set(data.series.map(item=>item.label)).size !== data.series.length) throw new Error('Market periods must be unique.');
  return data;
}
