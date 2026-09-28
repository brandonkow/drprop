/**
 * Debug overlay (showSafeZone): shades everything outside the safe area so
 * captions, logo and fees can be checked against platform UI (brief §9.5).
 * Never on in render-all.
 */
import { AbsoluteFill } from 'remotion';
import { ACTION_COLUMN, FRAME, safeRect, type Ratio } from '../layout';

export function SafeZoneOverlay({ ratio }: { ratio: Ratio }) {
  const f = FRAME[ratio];
  const s = safeRect(ratio);
  const shade = 'rgba(214, 40, 40, 0.28)';
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width={f.width} height={f.height}>
        <path
          fillRule="evenodd"
          fill={shade}
          d={`M0 0H${f.width}V${f.height}H0Z M${s.x} ${s.y}V${s.y + s.height}H${s.x + s.width}V${s.y}Z`}
        />
        <rect x={s.x} y={s.y} width={s.width} height={s.height} fill="none" stroke="rgb(214,40,40)" strokeWidth={3} />
        {ratio === '9x16' ? (
          <rect
            x={f.width - ACTION_COLUMN.width}
            y={ACTION_COLUMN.top}
            width={ACTION_COLUMN.width}
            height={ACTION_COLUMN.bottom - ACTION_COLUMN.top}
            fill={shade}
            stroke="rgb(214,40,40)"
            strokeDasharray="12 8"
          />
        ) : null}
        <text x={s.x + 12} y={s.y + 36} fill="rgb(214,40,40)" fontSize={28} fontFamily="monospace">
          SAFE {s.width}×{s.height}
        </text>
      </svg>
    </AbsoluteFill>
  );
}
