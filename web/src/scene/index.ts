/**
 * The WebGL background (brief §7.3). Step 3 draws Layer B, the Pulse Roof line.
 *
 * Where the line lives as the page scrolls:
 *   hero     at the static SVG's position; flat → heartbeat on arrival. It
 *            scrolls with the hero, the beat folds into the roof, then it fades
 *   middle   fades in at the bottom of the viewport, a quiet monitor strip that
 *            never strikes through body text; reacts to the fee input
 *   end      the footer lifts it; the roof unfolds into the skyline and stands
 *            on the footer's rule
 *
 * Loaded only when motion is allowed. Any failure rejects, and the caller keeps
 * the static SVG line.
 */
import { FORM } from '@drprop/brand/pulse/forms';
import { OrthographicCamera, Scene, WebGLRenderer } from 'three';
import { PULSE_BREAKPOINT, PULSE_LAYOUT, type PulseLayout } from '../config/pulse.ts';
import { FEE_INPUT_EVENT, type FeeInputDetail } from '../features/events.ts';
import { createPulseLine } from './pulse-line.ts';
import { initSmoothScroll } from './smooth-scroll.ts';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Distance of the resting strip's baseline from the viewport bottom. */
const STRIP = { narrow: 20, wide: 28 };
/** Line height as a fraction of the hero apex height, per phase. */
const HEIGHT = { hero: 1, strip: 0.4, skyline: 0.9 };

export async function startScene(): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.className = 'scene';
  canvas.setAttribute('aria-hidden', 'true');

  let shaderFailed = false;
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
    // Software-only WebGL is too slow for a full-screen canvas: keep the SVG line.
    failIfMajorPerformanceCaveat: true,
  });
  renderer.debug.onShaderError = () => {
    shaderFailed = true;
  };
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  const scene = new Scene();
  const camera = new OrthographicCamera(0, 1, 1, 0, -1, 1);

  const variantFor = () => (window.innerWidth < PULSE_BREAKPOINT ? 'narrow' : 'wide');
  let layout: PulseLayout = PULSE_LAYOUT[variantFor()];
  const pulse = createPulseLine(layout);
  scene.add(pulse.line);

  /* ---- layout measurements (document coordinates) ---- */
  const m = { vw: 1, vh: 1, heroH: 1, headerH: 0, apexPx: layout.height, heroBaseline: 0, footerTop: 0, maxScroll: 1 };

  const measure = () => {
    const variant = variantFor();
    if (variant !== layout.variant) {
      layout = PULSE_LAYOUT[variant];
      pulse.setLayout(layout);
    }
    m.vw = document.documentElement.clientWidth;
    m.vh = window.innerHeight;
    renderer.setSize(m.vw, m.vh, false);
    camera.right = m.vw;
    camera.top = m.vh;
    camera.updateProjectionMatrix();
    pulse.material.resolution.set(m.vw, m.vh);

    const y = window.scrollY;
    const svg = document.querySelector<SVGElement>(`[data-pulse-svg="${layout.variant}"]`);
    const hero = document.querySelector<HTMLElement>('.hero');
    const footer = document.querySelector<HTMLElement>('.site-footer');
    if (svg) {
      const r = svg.getBoundingClientRect();
      const scale = r.height / layout.viewBox[1];
      m.heroBaseline = r.top + y + layout.baseline * scale;
      m.apexPx = layout.height * scale;
    }
    m.heroH = hero?.offsetHeight ?? m.vh;
    m.headerH = document.querySelector<HTMLElement>('.site-header')?.offsetHeight ?? 0;
    m.footerTop = footer ? footer.getBoundingClientRect().top + y : document.documentElement.scrollHeight;
    m.maxScroll = Math.max(1, document.documentElement.scrollHeight - m.vh);
    dirty = true;
  };

  /* ---- state ---- */
  const state = { scroll: window.scrollY, intro: 0, amp: 1, ampTarget: 1 };
  let dirty = true;
  let lastInput = -Infinity;

  document.addEventListener(FEE_INPUT_EVENT, (e) => {
    const value = (e as CustomEvent<FeeInputDetail>).detail.value;
    // Slightly taller with every order of magnitude above RM 100k, capped.
    state.ampTarget = value ? 1 + Math.min(0.45, Math.max(0, (Math.log10(value) - 5) * 0.12) + 0.08) : 1;
    lastInput = performance.now();
  });

  const { gsap, ScrollTrigger } = initSmoothScroll();

  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      state.scroll = self.scroll();
      dirty = true;
    },
  });
  ScrollTrigger.addEventListener('refresh', measure);
  measure();

  /* ---- frame ---- */
  const frame = (time: number, deltaMs: number) => {
    const now = performance.now();
    if (now - lastInput > 700) state.ampTarget = 1;
    const ampStep = 1 - Math.exp(-(deltaMs / 1000) * 6);
    const ampMoving = Math.abs(state.ampTarget - state.amp) > 0.001;
    state.amp = ampMoving ? mix(state.amp, state.ampTarget, ampStep) : state.ampTarget;

    const s = state.scroll;
    const H = m.heroH;
    // Hero: the line scrolls with the hero (never across its text), the beat folds
    // into the roof, then it fades out before reaching the header.
    const roofT = easeInOut(clamp01(s / (H * 0.3)));
    const heroY = m.heroBaseline - s;
    // Fade out before the roof slides under the sticky header.
    const fadeEnd = m.headerH + m.apexPx * 0.5;
    const fadeStart = Math.min(fadeEnd + 140, m.heroBaseline);
    const heroOut = fadeStart > fadeEnd ? clamp01((fadeStart - heroY) / (fadeStart - fadeEnd)) : 1;
    // Strip: fades in at the bottom once the hero line has gone.
    const goneAt = m.heroBaseline - fadeEnd;
    const stripIn = clamp01((s - goneAt) / (H * 0.25));
    const endStart = m.maxScroll - m.vh * 0.6;
    const endT = s > endStart ? easeInOut(clamp01((s - endStart) / (m.vh * 0.6))) : 0;

    // Progress: beat in the hero, roof once it scrolls away, skyline at the end.
    let progress = endT > 0 ? mix(FORM.roof, FORM.skyline, endT) : mix(FORM.beat, FORM.roof, roofT);
    progress *= state.intro;

    // Baseline (viewport px from top): hero position → bottom strip → footer rule.
    const inHero = heroOut < 1;
    const stripY = m.vh - STRIP[layout.variant];
    const baseline = inHero ? heroY : Math.min(stripY, m.footerTop - s);
    const height = inHero ? HEIGHT.hero : mix(HEIGHT.strip, HEIGHT.skyline, endT);
    const opacity = inHero ? 1 - heroOut : Math.max(stripIn, endT);

    const beating = progress > 0 && progress < FORM.roof;
    if (!dirty && !beating && !ampMoving && state.intro === 1) return;

    const u = pulse.uniforms;
    u.uProgress.value = progress;
    u.uTime.value = time;
    u.uAmp.value = state.amp;
    u.uWidth.value = m.vw;
    u.uHeight.value = m.apexPx * height;
    u.uBaseline.value = m.vh - baseline;
    pulse.material.opacity = opacity;
    renderer.render(scene, camera);
    dirty = false;
  };

  // First frame now, so shader problems surface here and the caller falls back.
  measure();
  frame(0, 16);
  if (shaderFailed) {
    renderer.dispose();
    throw new Error('PulseLine: shader failed to compile');
  }

  document.body.prepend(canvas);
  gsap.ticker.add(frame);
  document.addEventListener('visibilitychange', () => (document.hidden ? gsap.ticker.sleep() : gsap.ticker.wake()));
  void document.fonts?.ready.then(() => ScrollTrigger.refresh());

  // Fade in, then the signature: the flat line starts to beat.
  requestAnimationFrame(() => canvas.classList.add('is-ready'));
  gsap.to(state, { intro: 1, duration: 1.2, delay: 0.4, ease: 'brand', onUpdate: () => (dirty = true) });
}
