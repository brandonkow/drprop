export type Ratio = '9x16' | '4x5' | '16x9';
export const formats: Record<Ratio, { width: number; height: number }> = {
  '9x16': { width: 1080, height: 1920 }, '4x5': { width: 1080, height: 1350 }, '16x9': { width: 1920, height: 1080 },
};
export function safeZone(width: number, height: number) {
  const vertical = height / width > 1.6;
  const left = vertical ? 65 : Math.round(width * .07);
  const right = vertical ? 230 : Math.round(width * .1);
  const top = vertical ? Math.ceil(height * .14) : Math.round(height * .1);
  const bottom = vertical ? Math.ceil(height * .35) : Math.round(height * .13);
  return { left, top, width: width - left - right, height: height - top - bottom, right, bottom };
}
export const reelDefinitions = [
  { id: 'BrandPulse', seconds: 15, educational: false },
  { id: 'CaseOfWeek', seconds: 36, educational: true },
  { id: 'BeforeYouSign', seconds: 25, educational: true },
  { id: 'FeeReveal', seconds: 15, educational: true },
  { id: 'MarketPulse', seconds: 25, educational: true },
  { id: 'LoungeMoment', seconds: 12, educational: false },
  { id: 'StoreReveal', seconds: 20, educational: false },
  { id: 'MemberCardReveal', seconds: 9, educational: false },
] as const;
