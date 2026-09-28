import { motion } from '@drprop/brand/tokens';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

/**
 * Lenis smooth scrolling driven by the GSAP ticker, so ScrollTrigger, Lenis and
 * the WebGL frame all advance on the same tick (brief §7.1).
 * Touch keeps native scrolling (Lenis default): it is what mid-range Android
 * handles best.
 */
export function initSmoothScroll() {
  gsap.registerPlugin(ScrollTrigger, CustomEase);
  const [x1, y1, x2, y2] = motion.easeArray;
  CustomEase.create('brand', `M0,0 C${x1},${y1} ${x2},${y2} 1,1`);

  const lenis = new Lenis({ autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  return { gsap, ScrollTrigger, lenis };
}
