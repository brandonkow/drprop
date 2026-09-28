import React from 'react';
import { Composition } from 'remotion';
import { Reel } from './compositions/Reel';
import { formats, reelDefinitions } from './layout';
import caseData from './data/cases/sample.json';
import marketData from './data/market/selangor-2025.json';
import type { ReelProps } from './types';
export const defaults: ReelProps = { language: 'en', showSafeZone: false, forceModelFallback: false, caseData: caseData as ReelProps['caseData'], marketData: marketData as ReelProps['marketData'], storeStatus: 'concept' };
export function Root() {
  return <>{Object.entries(formats).flatMap(([ratio, size]) => reelDefinitions.map(definition => <Composition key={`${definition.id}-${ratio}`} id={`${definition.id}-en-${ratio}`} component={Reel} {...size} fps={30} durationInFrames={definition.seconds*30} defaultProps={{ ...defaults, kind: definition.id }} />))}
    {Object.entries(formats).map(([ratio,size])=><Composition key={`short-${ratio}`} id={`BrandPulseShort-en-${ratio}`} component={Reel} {...size} fps={30} durationInFrames={210} defaultProps={{ ...defaults, kind: 'BrandPulse' as const }} />)}
    <Composition id="StoreLoop-en-16x9" component={Reel} {...formats['16x9']} fps={30} durationInFrames={1200} defaultProps={{ ...defaults, kind: 'StoreLoop' as const }} />
  </>;
}
