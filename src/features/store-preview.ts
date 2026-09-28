export function mountStorePreview(url: string) {
  const container = document.querySelector<HTMLElement>('#lounge-media');
  const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (!container || matchMedia('(prefers-reduced-motion: reduce)').matches || device.connection?.saveData || (device.deviceMemory !== undefined && device.deviceMemory < 4)) return;
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting) || document.hidden) return;
    observer.disconnect();
    void import('./store-model.ts').then(module => module.renderStoreModel(container, url)).catch(() => { container.dataset.model = 'poster'; });
  }, { rootMargin: '0px' });
  observer.observe(container);
  addEventListener('pagehide', () => observer.disconnect(), { once: true });
}
