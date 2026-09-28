import '../brand/fonts.css';
import '../brand/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import { calculateFee } from './features/fee-calculator.ts';
import { whatsappUrl } from './features/whatsapp.ts';
import { site } from './config/site.ts';
import { mountEffects } from './effects/index.ts';

const price = document.querySelector<HTMLInputElement>('#property-price')!;
price.disabled = false;
document.querySelector<HTMLElement>('#calculator-availability')!.hidden = true;
const value = document.querySelector<HTMLElement>('#fee-value')!;
const error = document.querySelector<HTMLElement>('#price-error')!;
function updateFee() {
  const result = calculateFee(price.value);
  price.setAttribute('aria-invalid', String(result.state === 'invalid'));
  value.textContent = result.state === 'valid' ? result.fee.toLocaleString('en-MY') : '—';
  error.textContent = result.state === 'invalid' ? 'Enter a positive amount, such as 500,000 or 500000.50.' : '';
}
price.addEventListener('input', updateFee);
window.addEventListener('pageshow', updateFee);
updateFee();
const booking = document.querySelector<HTMLAnchorElement>('#booking-link')!;
const url = whatsappUrl(site.whatsappNumber, 'Hello Dr Prop. I would like to book a property consultation.');
if (url) {
  booking.href = url;
  booking.removeAttribute('aria-disabled');
  booking.target = '_blank';
  booking.rel = 'noopener noreferrer';
  document.querySelector('#booking-status')!.textContent = 'Continue on WhatsApp';
  document.querySelector('.visit-note')!.textContent = 'Please contact us on WhatsApp to arrange a consultation.';
}
if (site.address) document.querySelector('#store-address')!.textContent = site.address;
if (site.hours) document.querySelector('#store-hours')!.textContent = site.hours;
if (site.ssmNumber) document.querySelector('#ssm-number')!.textContent = `SSM registration: ${site.ssmNumber}`;
if (site.mapsUrl && site.address) {
  const maps = document.querySelector<HTMLAnchorElement>('#maps-link')!;
  try {
    const parsed = new URL(site.mapsUrl);
    if (parsed.protocol === 'https:') {
      maps.href = parsed.href;
      maps.target = '_blank';
      maps.rel = 'noopener noreferrer';
      maps.hidden = false;
    }
  } catch { /* Keep directions hidden until a valid URL is supplied. */ }
}
if (site.loungeImage) {
  const image = new Image();
  image.alt = site.loungeImage.alt;
  image.loading = 'lazy';
  image.decoding = 'async';
  image.addEventListener('load', () => document.querySelector('#lounge-media')!.replaceChildren(image));
  image.src = site.loungeImage.src;
}
document.querySelector('.member-cap')!.textContent = site.memberCapProposal.toLocaleString('en-MY');
document.querySelector('#year')!.textContent = String(new Date().getFullYear());
mountEffects();
