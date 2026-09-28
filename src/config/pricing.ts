/** Brief §3.2: proposed standard consultation fees, not approved retail prices. */
export const priceBands = [
  { ceiling: 300_000, fee: 199 },
  { ceiling: 600_000, fee: 399 },
  { ceiling: 1_000_000, fee: 699 },
  { ceiling: 2_000_000, fee: 1199 },
  { ceiling: Infinity, fee: 1999 },
] as const;
