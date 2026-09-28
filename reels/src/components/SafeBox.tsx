import type { CSSProperties, ReactNode } from 'react';
import { safeRect, type Ratio } from '../layout';

/** Lays content out inside the platform safe area (brief §9.5). */
export function SafeBox({ ratio, children, style }: { ratio: Ratio; children: ReactNode; style?: CSSProperties }) {
  const s = safeRect(ratio);
  return (
    <div
      style={{
        position: 'absolute',
        left: s.x,
        top: s.y,
        width: s.width,
        height: s.height,
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Camera distance that fits an object of `w × h` metres in frame at `fov`. */
export function fitDistance(w: number, h: number, aspect: number, fov = 30, margin = 1.25) {
  const t = Math.tan(((fov / 2) * Math.PI) / 180);
  return Math.max(w / (2 * t * aspect), h / (2 * t)) * margin;
}
