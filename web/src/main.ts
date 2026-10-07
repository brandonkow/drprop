import { initCta } from './features/cta.ts';
import { FEE_INPUT_EVENT, type FeeInputDetail } from './features/events.ts';
import { initFeeCalculator } from './features/fee-calculator.ts';

const root = document.documentElement;
const cta = document.querySelector<HTMLAnchorElement>('[data-cta]');
const calc = document.querySelector<HTMLElement>('#fee');

if (calc) {
  const updateCta = cta ? initCta(cta) : () => {};
  initFeeCalculator(calc, (change) => {
    updateCta(change);
    document.dispatchEvent(
      new CustomEvent<FeeInputDetail>(FEE_INPUT_EVENT, { detail: { value: change.value } }),
    );
  });
}

// The inline head script sets .motion unless the visitor prefers reduced motion.
// The WebGL scene loads after first paint; if it cannot start, the static SVG
// Pulse Roof comes back (brief §7.4). With the data saver on (common on prepaid
// Android plans) the scene's ~195 KB of script is skipped and the SVG line stays.
const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
if (root.classList.contains('motion') && calc && !saveData) {
  // Wait for an idle moment after load so the scene never competes with the text (LCP).
  const whenIdle = (fn: () => void) =>
    'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 300);
  const start = () =>
    whenIdle(() => {
      import('./scene/index.ts')
        .then(({ startScene }) => startScene())
        .catch((error: unknown) => {
          root.classList.remove('motion');
          if (import.meta.env.DEV) console.warn('[drprop] WebGL scene unavailable, using SVG line.', error);
        });
    });
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
} else {
  root.classList.remove('motion');
}
