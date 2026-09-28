import { whatsappUrl } from '../config/site.ts';
import type { FeeChange } from './fee-calculator.ts';
import { formatRM } from './money.ts';

/**
 * The single CTA. When the visitor has priced their property, the pre-filled
 * WhatsApp message carries the value and fee so the advisor starts informed.
 */
export function initCta(link: HTMLAnchorElement): (change: FeeChange) => void {
  const plain = link.dataset.message ?? '';
  const withFee = link.dataset.messageFee ?? plain;
  return ({ value, band }) => {
    const message =
      value !== null && band
        ? withFee.replace('{value}', formatRM(value)).replace('{fee}', formatRM(band.fee))
        : plain;
    link.href = whatsappUrl(message);
  };
}
