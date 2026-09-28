import { bandFor, type Band } from '@drprop/brand/pricing';
import { motion } from '@drprop/brand/tokens';
import { groupDigits, reformat } from './money.ts';

export interface FeeChange {
  value: number | null;
  band: Band | null;
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * §3 fee calculator — the only interactive tool on the site.
 * Formats the value as it is typed, shows the band's fee and marks its row.
 */
export function initFeeCalculator(root: HTMLElement, onChange: (change: FeeChange) => void): void {
  const input = root.querySelector<HTMLInputElement>('.calc__input');
  const output = root.querySelector<HTMLElement>('[data-fee]');
  const rows = root.querySelectorAll<HTMLTableRowElement>('tr[data-band]');
  if (!input || !output) return;

  let shownBand: Band['id'] | null = null;

  const update = () => {
    const { value, caret, digits } = reformat(input.value, input.selectionStart ?? input.value.length);
    if (input.value !== value) {
      input.value = value;
      if (document.activeElement === input) input.setSelectionRange(caret, caret);
    }
    const amount = digits ? Number(digits) : null;
    const band = amount === null ? null : bandFor(amount);

    if ((band?.id ?? null) !== shownBand) {
      shownBand = band?.id ?? null;
      output.textContent = band ? groupDigits(band.fee) : '—';
      rows.forEach((row) => row.toggleAttribute('data-active', row.dataset.band === shownBand));
      if (!reducedMotion()) {
        output.animate([{ opacity: 0.2 }, { opacity: 1 }], {
          duration: motion.durationShortMs,
          easing: motion.ease,
        });
      }
    }
    onChange({ value: amount, band });
  };

  input.addEventListener('input', update);
  // Browsers may restore a typed value on back/forward navigation.
  if (input.value) update();
}
