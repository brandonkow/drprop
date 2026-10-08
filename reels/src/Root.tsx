/**
 * All reels. Each composition takes { lang, ratio } as props, so one
 * composition renders every language × format (brief §9.5); render-all walks
 * the matrix. Durations include the brand end card where there is one.
 */
import { Composition, type CalculateMetadataFunction } from 'remotion';
import type { ReelProps } from './components/ReelFrame';
import { END_CARD_FRAMES } from './components/ReelFrame';
import { BeforeYouSign, beforeYouSignFrames } from './compositions/BeforeYouSign';
import { BrandPulse, type BrandPulseProps } from './compositions/BrandPulse';
import { CaseOfWeek, caseBodyFrames, type CaseOfWeekProps } from './compositions/CaseOfWeek';
import { FeeReveal, feeRevealFrames } from './compositions/FeeReveal';
import { HeroPromo, heroPromoFrames } from './compositions/HeroPromo';
import { ProductFilm, productFilmFrames } from './compositions/ProductFilm';
import { LoungeMoment, loungeMomentFrames } from './compositions/LoungeMoment';
import { MarketPulse, marketPulseFrames, type MarketPulseProps } from './compositions/MarketPulse';
import { MemberCardReveal, memberCardFrames, type MemberCardRevealProps } from './compositions/MemberCardReveal';
import { StoreReveal, storeRevealFrames } from './compositions/StoreReveal';
import { Visit, visitFrames } from './compositions/Visit';
import { CASES, MARKET } from './data';
import { FPS, FRAME } from './layout';

const base: ReelProps = { lang: 'zh', ratio: '9x16', showSafeZone: false };

/** Size from the ratio prop, duration from the content. */
const meta =
  <P extends ReelProps>(frames: (p: P) => number): CalculateMetadataFunction<P> =>
  ({ props }) => ({ ...FRAME[props.ratio], durationInFrames: frames(props) });

const firstCase = Object.keys(CASES).sort()[0]!;
const firstMonth = Object.keys(MARKET).sort().at(-1)!;

export function Root() {
  const common = { fps: FPS, width: FRAME['9x16'].width, height: FRAME['9x16'].height, durationInFrames: 1 };
  return (
    <>
      <Composition
        id="BrandPulse"
        component={BrandPulse}
        {...common}
        defaultProps={{ ...base, length: 7 } as BrandPulseProps}
        calculateMetadata={meta<BrandPulseProps>((p) => p.length * FPS)}
      />
      <Composition
        id="CaseOfWeek"
        component={CaseOfWeek}
        {...common}
        defaultProps={{ ...base, caseId: firstCase } as CaseOfWeekProps}
        calculateMetadata={meta<CaseOfWeekProps>((p) => caseBodyFrames(p.caseId) + END_CARD_FRAMES)}
      />
      <Composition
        id="BeforeYouSign"
        component={BeforeYouSign}
        {...common}
        defaultProps={base}
        calculateMetadata={meta<ReelProps>(() => beforeYouSignFrames + END_CARD_FRAMES)}
      />
      <Composition
        id="FeeReveal"
        component={FeeReveal}
        {...common}
        defaultProps={base}
        calculateMetadata={meta<ReelProps>(() => feeRevealFrames + END_CARD_FRAMES)}
      />
      <Composition
        id="MarketPulse"
        component={MarketPulse}
        {...common}
        defaultProps={{ ...base, monthId: firstMonth } as MarketPulseProps}
        calculateMetadata={meta<MarketPulseProps>(() => marketPulseFrames + END_CARD_FRAMES)}
      />
      <Composition
        id="LoungeMoment"
        component={LoungeMoment}
        {...common}
        defaultProps={base}
        calculateMetadata={meta<ReelProps>(() => loungeMomentFrames + END_CARD_FRAMES)}
      />
      <Composition
        id="StoreReveal"
        component={StoreReveal}
        {...common}
        defaultProps={base}
        calculateMetadata={meta<ReelProps>((p) => storeRevealFrames + (p.stageOnly ? 0 : END_CARD_FRAMES))}
      />
      <Composition
        id="MemberCardReveal"
        component={MemberCardReveal}
        {...common}
        defaultProps={{ ...base, memberNo: 'PJ-0001' } as MemberCardRevealProps}
        calculateMetadata={meta<MemberCardRevealProps>(() => memberCardFrames + END_CARD_FRAMES)}
      />
      <Composition
        id="Visit"
        component={Visit}
        {...common}
        defaultProps={{ ...base, lang: 'en' } as ReelProps}
        calculateMetadata={meta<ReelProps>(() => visitFrames + END_CARD_FRAMES)}
      />
      <Composition
        id="HeroPromo"
        component={HeroPromo}
        {...common}
        defaultProps={{ ...base, lang: 'en', ratio: '16x9' } as ReelProps}
        calculateMetadata={meta<ReelProps>(() => heroPromoFrames + END_CARD_FRAMES)}
      />
      <Composition
        id="ProductFilm"
        component={ProductFilm}
        {...common}
        defaultProps={{ ...base, lang: 'en', ratio: '16x9' } as ReelProps}
        calculateMetadata={meta<ReelProps>(() => productFilmFrames)}
      />
    </>
  );
}
