import { effectPolicy } from './policy.ts';
import './effects.css';

/** Load decorative code only after text/fonts have had an opportunity to paint. */
export function mountEffects() {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; addEventListener?: Function } };
  let generation = 0;
  let destroyScene: (() => void) | undefined;
  let idle: number | undefined;
  let lost = false;
  const root = document.documentElement;

  function stop(reason: string) {
    generation++;
    if (idle !== undefined) {
      if ('cancelIdleCallback' in window) cancelIdleCallback(idle);
      else clearTimeout(idle);
    }
    destroyScene?.();
    destroyScene = undefined;
    delete root.dataset.effects;
    root.dataset.effectsState = reason;
  }

  async function start() {
    stop('pending');
    const version = generation;
    const policy = effectPolicy(motion.matches, device.deviceMemory, device.connection?.saveData);
    if (!policy.enabled || lost) {
      root.dataset.effectsState = motion.matches ? 'reduced-motion' : lost ? 'context-lost' : 'save-data';
      return;
    }
    await document.fonts.ready;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    if (version !== generation || document.hidden) return;
    const initialize = async () => {
      if (version !== generation || document.hidden) return;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl2', { alpha: false, antialias: true, powerPreference: 'low-power' });
      if (!context) { root.dataset.effectsState = 'no-webgl'; return; }
      canvas.id = 'effects-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      const onLost = (event: Event) => {
        event.preventDefault();
        lost = true;
        stop('context-lost');
      };
      canvas.addEventListener('webglcontextlost', onLost);
      try {
        const { createScene } = await import('./scene.ts');
        if (version !== generation || document.hidden) {
          canvas.removeEventListener('webglcontextlost', onLost);
          context.getExtension('WEBGL_lose_context')?.loseContext();
          return;
        }
        const dispose = await createScene(canvas, context, policy.fluid);
        if (version !== generation) {
          canvas.removeEventListener('webglcontextlost', onLost);
          dispose();
          return;
        }
        document.body.prepend(canvas);
        destroyScene = () => {
          canvas.removeEventListener('webglcontextlost', onLost);
          dispose();
          canvas.remove();
        };
        root.dataset.effects = 'active';
        root.dataset.effectsState = 'ready';
      } catch {
        canvas.removeEventListener('webglcontextlost', onLost);
        context.getExtension('WEBGL_lose_context')?.loseContext();
        canvas.remove();
        if (version === generation) root.dataset.effectsState = 'unavailable';
      }
    };
    idle = 'requestIdleCallback' in window
      ? requestIdleCallback(() => void initialize(), { timeout: 1200 })
      : setTimeout(() => void initialize(), 100);
  }
  motion.addEventListener('change', () => void start());
  device.connection?.addEventListener?.('change', () => void start());
  addEventListener('pagehide', () => stop('page-hidden'));
  addEventListener('pageshow', event => { if (event.persisted) { lost = false; void start(); } });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !destroyScene && !lost) void start();
  });
  void start();
}
