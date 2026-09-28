import type { CaseData, MarketData } from './types.ts';
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
export function validateCase(value: unknown): CaseData {
  const data = value as CaseData;
  if (!data || data.language !== 'en' || !['fictional','anonymized'].includes(data.status) || !text(data.hook,100) || !Array.isArray(data.lines) || data.lines.length < 1 || data.lines.length > 6 || data.lines.some(line => !text(line,100)) || !['terrace','condo','bungalow'].includes(data.houseType) || !['none','roof','title','facade'].includes(data.highlight)) throw new Error('Invalid case data. Use English copy, 1–6 concise lines and a supported anonymous house.');
  return data;
}
export function validateMarket(value: unknown): MarketData {
  const data = value as MarketData;
  if (!data || data.language !== 'en' || !['demo','observed'].includes(data.status) || !text(data.title,90) || !text(data.source,180) || !text(data.asOf,10) || !text(data.retrievedAt,10) || !text(data.unit,30) || !text(data.metric,90) || !text(data.geography,60) || !text(data.frequency,20) || !Array.isArray(data.series) || data.series.length < 2 || data.series.length > 6 || data.series.some(item => !item || !text(item.label,8) || !Number.isFinite(item.value) || item.value < 0)) throw new Error('Invalid market series. Include 2–6 comparable nonnegative observations, source, geography, unit and dates.');
  if (data.status === 'observed' && !/^https:\/\//.test(data.sourceUrl)) throw new Error('Observed statistics require a direct HTTPS source URL.');
  if (new Set(data.series.map(item=>item.label)).size !== data.series.length) throw new Error('Market periods must be unique.');
  return data;
}
