/** DR. PROP from the brand's outlined logo paths (identical to logo.svg). */
import { LOGO } from '@drprop/brand/logo/paths';

export function Wordmark({ width, color, withLine = false }: { width: number; color: string; withLine?: boolean }) {
  const x0 = withLine ? 0 : LOGO.wordmarkX - 2;
  const vbW = LOGO.width - x0;
  return (
    <svg width={width} height={(width * LOGO.height) / vbW} viewBox={`${x0} 0 ${vbW} ${LOGO.height}`}>
      {withLine ? <path d={LOGO.line} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="miter" /> : null}
      <path d={LOGO.wordmark} fill={color} />
    </svg>
  );
}
