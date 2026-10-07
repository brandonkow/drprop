/**
 * Episode data. Adding an R2 episode = adding one JSON file to cases/;
 * adding an R5 month = one JSON file in market/. Nothing else changes.
 */
import type { HousePart, HouseType } from '@drprop/brand/3d';
import { validateMarket, type MarketMonth } from './validate';

export type { MarketMonth };

export interface CaseEpisode {
  houseType: HouseType;
  highlight: HousePart;
  en: { hook: string; lines: string[] };
  zh: { hook: string; lines: string[] };
  ms: { hook: string; lines: string[] };
}

declare const require: {
  context(dir: string, deep: boolean, pattern: RegExp): { keys(): string[]; <T>(key: string): T };
};

const slug = (key: string) => key.replace(/^\.\//, '').replace(/\.json$/, '');

const caseCtx = require.context('./cases', false, /\.json$/);
export const CASES: Record<string, CaseEpisode> = Object.fromEntries(
  caseCtx.keys().map((k) => [slug(k), caseCtx<CaseEpisode>(k)]),
);

const marketCtx = require.context('./market', false, /\.json$/);
export const MARKET: Record<string, MarketMonth> = Object.fromEntries(
  marketCtx.keys().map((k) => [slug(k), validateMarket(slug(k), marketCtx<MarketMonth>(k))]),
);
