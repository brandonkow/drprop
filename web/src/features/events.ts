/** Fired on every fee calculator input; the WebGL line listens (brief §7.3). */
export const FEE_INPUT_EVENT = 'drprop:fee-input';

export interface FeeInputDetail {
  value: number | null;
}
