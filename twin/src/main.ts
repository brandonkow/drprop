import favicon from '@drprop/brand/logo/favicon.svg?url';
import './styles/twin.css';
import { App } from './app.ts';

const link = document.createElement('link');
link.rel = 'icon';
link.href = favicon;
document.head.append(link);

new App().start().catch((error: unknown) => {
  console.error(error);
  const el = document.querySelector('.loading .label');
  if (el) el.textContent = 'The 3D store could not start in this browser.';
});
