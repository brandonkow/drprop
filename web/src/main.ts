import { initCta } from './features/cta.ts';
import { initFeeCalculator } from './features/fee-calculator.ts';

const cta = document.querySelector<HTMLAnchorElement>('[data-cta]');
const calc = document.querySelector<HTMLElement>('#fee');

if (calc) {
  const updateCta = cta ? initCta(cta) : () => {};
  initFeeCalculator(calc, updateCta);
}
