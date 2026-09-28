import React from 'react';
import { createRoot } from 'react-dom/client';
import { Player, type PlayerRef } from '@remotion/player';
import { Reel, type ReelKind } from './compositions/Reel';
import { defaults } from './Root';
import { formats, reelDefinitions, type Ratio } from './layout';
const params = new URLSearchParams(location.search); const kind = (params.get('kind') ?? 'BrandPulse') as ReelKind;
const size = formats[(params.get('ratio') ?? '9x16') as Ratio]; const duration = (reelDefinitions.find(item=>item.id===kind)?.seconds??15)*30;
// This entry exists only in the local QA page, never in the video bundle.
declare global { interface Window { reelQA: PlayerRef | null } }
createRoot(document.getElementById('root')!).render(<Player ref={player=>{window.reelQA=player;}} component={Reel} inputProps={{...defaults,kind,forceModelFallback:params.has('fallback')}} compositionWidth={size.width} compositionHeight={size.height} durationInFrames={duration} fps={30} initialFrame={Number(params.get('frame')??90)} style={{width:size.width,height:size.height}} />);
