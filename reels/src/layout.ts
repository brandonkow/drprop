/**
 * Output formats and safe zones (brief §9.5).
 * 9:16 follows Meta's conservative Reels guidance: nothing in the top 14%
 * (270 px) or bottom 35% (670 px), 65 px each side — a ~950 × 980 centre. The
 * like/share column (~230 px, lower right) sits outside it.
 */
export type Ratio = '9x16' | '4x5' | '16x9';
export const RATIOS: Ratio[] = ['9x16', '4x5', '16x9'];

export const FRAME: Record<Ratio, { width: number; height: number }> = {
  '9x16': { width: 1080, height: 1920 },
  '4x5': { width: 1080, height: 1350 },
  '16x9': { width: 1920, height: 1080 },
};

export interface Safe {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export const SAFE: Record<Ratio, Safe> = {
  '9x16': { top: 270, bottom: 670, left: 65, right: 65 },
  // Feed posts: light overlays only (profile row on top, actions below).
  '4x5': { top: 70, bottom: 110, left: 65, right: 65 },
  // Store screen / YouTube: 5% title-safe.
  '16x9': { top: 54, bottom: 54, left: 96, right: 96 },
};

/** The like/share column on 9:16, drawn by the safe-zone overlay for reference. */
export const ACTION_COLUMN = { width: 230, top: 1920 - 670 - 380, bottom: 1920 - 140 };

/**
 * Widest left-aligned text on 9:16: it stops where the like/share column starts, so a
 * caption low in the safe area is never under the buttons (785 px).
 */
export const TEXT_MAX_9x16 = 1080 - ACTION_COLUMN.width - SAFE['9x16'].left;

export const FPS = 30;

/** Type sizes per format: one display size, one body, one small (brief §5.3, §9.6). */
export const TYPE: Record<Ratio, { display: number; body: number; small: number }> = {
  '9x16': { display: 92, body: 44, small: 28 },
  '4x5': { display: 84, body: 40, small: 26 },
  '16x9': { display: 88, body: 40, small: 26 },
};

export const safeRect = (r: Ratio) => {
  const f = FRAME[r];
  const s = SAFE[r];
  return { x: s.left, y: s.top, width: f.width - s.left - s.right, height: f.height - s.top - s.bottom };
};

/** Vertical centre of the safe area as a fraction of the frame height. */
export const safeCenterY = (r: Ratio) => {
  const s = safeRect(r);
  return (s.y + s.height / 2) / FRAME[r].height;
};
