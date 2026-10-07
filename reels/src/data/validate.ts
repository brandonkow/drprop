/** R5 market data: its shape, and the check that observed numbers say where they come from. */
import type { Lang } from '../copy';

export interface MarketMonth {
  /** True for placeholder numbers: the reel carries a "not for publication" watermark. */
  sample: boolean;
  source: string;
  date: string;
  unit: string;
  label: Record<Lang, string>;
  series: { label: string; value: number }[];
  /** How the last value is printed, e.g. "RM {v} mil". Default: one decimal. */
  valueFormat?: Record<Lang, string>;
  /** Required when sample is false: where anyone can check the numbers (brief §9.7). */
  provenance?: { document: string; url: string; page: string; retrieved: string; sha256: string };
}

/** Throws unless a market file can be published as is: observed data must say where it is from. */
export function validateMarket(id: string, m: MarketMonth): MarketMonth {
  const fail = (why: string) => {
    throw new Error(`data/market/${id}.json: ${why}`);
  };
  if (m.series.length < 4 || m.series.length > 12) fail('needs 4–12 points');
  if (m.series.some((p) => !Number.isFinite(p.value) || p.value < 0)) fail('values must be finite and not negative');
  if (new Set(m.series.map((p) => p.label)).size !== m.series.length) fail('period labels must be unique');
  if (!m.sample) {
    const pv = m.provenance;
    if (!pv) fail('observed data needs provenance (document, url, page, retrieved, sha256)');
    else {
      if (!/^https:\/\//.test(pv.url)) fail('provenance.url must be a direct https link');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(pv.retrieved)) fail('provenance.retrieved must be YYYY-MM-DD');
      if (!/^[0-9a-f]{64}$/.test(pv.sha256)) fail('provenance.sha256 must be the SHA-256 of the source file');
      if (!pv.document.trim() || !pv.page.trim()) fail('provenance needs the document and page');
    }
  }
  return m;
}
