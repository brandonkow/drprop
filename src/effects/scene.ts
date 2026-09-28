import { Color, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, Vector3, WebGLRenderer, WebGLRenderTarget } from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { tokens } from '../../brand/tokens.ts';
import { calculateFee } from '../features/fee-calculator.ts';
import { createPulse } from './pulse.ts';
import { createFluid, simulation } from './fluid.ts';

const vertexShader = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;
const backgroundShader = `
varying vec2 vUv; uniform sampler2D uDye; uniform float uFluid;
uniform vec3 uBone; uniform vec3 uPaper; uniform vec2 uPaperBand; uniform float uHeight;
void main(){
  float y=(1.0-vUv.y)*uHeight;
  float isPaper=step(uPaperBand.x,y)*(1.0-step(uPaperBand.y,y));
  vec3 base=mix(uBone,uPaper,isPaper);
  vec3 pigment=texture2D(uDye,vUv).rgb*uFluid;
  gl_FragColor=vec4(base-min(pigment*0.35,vec3(0.09)),1.0);
}`;
const grainShader = `
varying vec2 vUv; uniform sampler2D uScene;
void main(){
  gl_FragColor=texture2D(uScene,vUv);
  #include <colorspace_fragment>
  float noise=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
  gl_FragColor.rgb=clamp(gl_FragColor.rgb+(noise-0.5)*0.04,0.0,1.0);
}`;

export async function createScene(canvas: HTMLCanvasElement, context: WebGL2RenderingContext, allowFluid: boolean) {
  const renderer = new WebGLRenderer({ canvas, context, antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setClearColor(0, 0);
  renderer.autoClear = false;
  // Surface shader failures to the loader so a broken canvas never replaces SVG.
  let shaderFailed = false;
  renderer.debug.onShaderError = () => { shaderFailed = true; };
  const source = new WebGLRenderTarget(1, 1, { depthBuffer: false, stencilBuffer: false, samples: 2 });
  const screen = new Scene();
  const passCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const lineCamera = new OrthographicCamera(0, 1, 1, 0, -1, 1);
  const geometry = new PlaneGeometry(2, 2);
  const bgUniforms = {
    uDye: { value: null as ReturnType<typeof createFluid>['texture'] | null }, uFluid: { value: 0 },
    uBone: { value: new Color(tokens.bone) }, uPaper: { value: new Color(tokens.paper) },
    uPaperBand: { value: new Vector2() }, uHeight: { value: innerHeight },
  };
  const background = new ShaderMaterial({ vertexShader, fragmentShader: backgroundShader, uniforms: bgUniforms, depthTest: false, depthWrite: false });
  const grain = new ShaderMaterial({ vertexShader, fragmentShader: grainShader, uniforms: { uScene: { value: source.texture } }, depthTest: false, depthWrite: false });
  const quad = new Mesh(geometry, background); screen.add(quad);
  const pulses = new Scene();
  const pulse = createPulse(); pulses.add(pulse.line);
  const elements = Array.from(document.querySelectorAll<HTMLElement>('.pulse, .effect-track'));
  const fees = document.querySelector<HTMLElement>('.fees')!;
  const price = document.querySelector<HTMLInputElement>('#property-price')!;
  const bounds: { left: number; top: number; width: number; height: number }[] = [];
  let feeTop = 0, feeBottom = 0, width = 0, height = 0, disposed = false;
  let roofStart = 1, roofEnd = 2, skylineEnd = 3, lastPaint = 0, lastScroll = -1;
  let fluid: ReturnType<typeof createFluid> | undefined;
  let lastPointer = -Infinity, previousX = 0, previousY = 0, pointerKnown = false;
  let pending: { x: number; y: number; dx: number; dy: number } | undefined;
  let fluidDirty = false, needsLayout = true;
  let lastFrame = 0, elapsed = 0, frames = 0, slowFrames = 0;
  let pendingResponse = 0, responseStrength = 0, responseElapsed = 0.8;
  let fluidPermitted = allowFluid && !!context.getExtension('EXT_color_buffer_float');
  const pigment = new Vector3();
  const palette = [tokens.travertine, tokens.stone, tokens.bronze].map(hex => {
    const color = new Color(hex);
    return new Vector3(bgUniforms.uBone.value.r - color.r, bgUniforms.uBone.value.g - color.g, bgUniforms.uBone.value.b - color.b).multiplyScalar(0.3);
  });
  let pigmentIndex = 0;
  const abort = new AbortController();
  const options = { passive: true, signal: abort.signal };

  function measure() {
    width = innerWidth; height = innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    source.setSize(Math.round(width * renderer.getPixelRatio()), Math.round(height * renderer.getPixelRatio()));
    lineCamera.right = width; lineCamera.top = height; lineCamera.updateProjectionMatrix();
    pulse.material.resolution.set(width, height);
    pulse.line.onBeforeRender = () => pulse.material.resolution.set(width, height);
    bounds.length = 0;
    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      bounds.push({ left: rect.left, top: rect.top + scrollY, width: rect.width, height: rect.height });
    }
    const fee = fees.getBoundingClientRect(); feeTop = fee.top + scrollY; feeBottom = feeTop + fee.height;
    roofStart = Math.max(1, feeTop - height * 0.25);
    roofEnd = Math.max(roofStart + 1, feeBottom - height * 0.75);
    skylineEnd = Math.max(roofEnd + 1, bounds[bounds.length - 1].top - height * 0.65);
    bgUniforms.uHeight.value = height;
    if (fluid) fluid.resize(width, height, matchMedia('(pointer: coarse)').matches || width <= 720);
    else if (fluidPermitted) {
      try { fluid = createFluid(renderer, width, height, matchMedia('(pointer: coarse)').matches || width <= 720); }
      catch { fluidPermitted = false; }
    }
    canvas.dataset.fluid = fluid ? 'enabled' : allowFluid ? 'unsupported' : 'low-memory';
    canvas.dataset.dyeResolution = String(width <= 720 ? simulation.mobileDye : simulation.desktopDye);
    canvas.dataset.pixelRatio = String(renderer.getPixelRatio());
    bgUniforms.uDye.value = fluid?.texture ?? null;
    bgUniforms.uFluid.value = 0;
    fluidDirty = false; pending = undefined; pointerKnown = false; needsLayout = false; lastScroll = -1;
  }

  function pointer(event: PointerEvent) {
    if (!fluid || document.hidden || (event.pointerType === 'touch' && !event.isPrimary)) return;
    const x = event.clientX / width, y = 1 - event.clientY / height;
    if (pointerKnown) {
      const dx = Math.max(-0.08, Math.min(0.08, x - previousX));
      const dy = Math.max(-0.08, Math.min(0.08, y - previousY));
      if (Math.abs(dx) + Math.abs(dy) > 0.0001) {
        pending = { x, y, dx, dy }; lastPointer = performance.now();
      }
    }
    previousX = x; previousY = y; pointerKnown = true;
  }
  addEventListener('pointermove', pointer, options);
  addEventListener('pointerup', () => { pointerKnown = false; pigmentIndex = (pigmentIndex + 1) % palette.length; }, options);
  addEventListener('pointercancel', () => { pointerKnown = false; pending = undefined; }, options);
  document.addEventListener('pointerleave', () => { pointerKnown = false; }, options);
  addEventListener('resize', () => { needsLayout = true; }, options);
  const resizeObserver = new ResizeObserver(() => { needsLayout = true; });
  resizeObserver.observe(document.body);
  price.addEventListener('input', () => {
    if (calculateFee(price.value).state !== 'valid') return;
    const amount = Number(price.value.replaceAll(',', ''));
    const strength = Math.min(0.2, Math.log10(amount + 1) / 40);
    pendingResponse = strength;
    // Preserve input across a visibility transition and wake an idle ticker.
    // The render callback itself still refuses to draw while hidden.
    if (!document.hidden) gsap.ticker.wake();
  }, { signal: abort.signal });

  gsap.registerPlugin(ScrollTrigger);
  const lenis = new Lenis({ autoRaf: false, duration: 0.9, smoothWheel: true, syncTouch: false, anchors: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.lagSmoothing(0);
  const progress = { value: 0 };
  const trigger = ScrollTrigger.create({ start: 0, end: () => ScrollTrigger.maxScroll(window), onUpdate: self => { progress.value = self.progress; } });
  progress.value = trigger.progress;
  const intro = { value: 0 };
  let entrance: gsap.core.Tween | undefined;

  function draw(time: number) {
    if (disposed || document.hidden) return;
    const now = performance.now();
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 1 / 60;
    lastFrame = now; elapsed += dt;
    if (pendingResponse > 0) {
      responseStrength = pendingResponse; pendingResponse = 0; responseElapsed = 0;
    }
    pulse.uniforms.uResponse.value = responseStrength * Math.pow(1 - Math.min(1, responseElapsed / 0.8), 3);
    responseElapsed += dt;
    lenis.raf(time * 1000);
    if (needsLayout) { measure(); lenis.resize(); ScrollTrigger.refresh(); }
    let inkCleared = false;
    if (fluid) {
      if (pending) {
        pigment.copy(palette[pigmentIndex]);
        fluid.splat(pending.x, pending.y, pending.dx, pending.dy, pigment);
        pending = undefined; fluidDirty = true;
      }
      if (fluidDirty && now - lastPointer < 3000) fluid.step(dt);
      else if (fluidDirty) { fluid.clear(); fluidDirty = false; inkCleared = true; }
      bgUniforms.uDye.value = fluid.texture;
      bgUniforms.uFluid.value = fluidDirty ? 1 : 0;
    }
    canvas.dataset.ink = fluidDirty ? 'active' : 'idle';
    const pageScroll = trigger.start + progress.value * (trigger.end - trigger.start);
    const target = pageScroll <= roofStart ? 0.25 + 0.25 * Math.max(0, pageScroll / roofStart)
      : pageScroll <= roofEnd ? 0.5 : 0.5 + 0.5 * Math.min(1, (pageScroll - roofEnd) / (skylineEnd - roofEnd));
    const changing = Math.abs(target * intro.value - pulse.uniforms.uProgress.value) > 0.0001;
    pulse.uniforms.uProgress.value += (target * intro.value - pulse.uniforms.uProgress.value) * (1 - Math.exp(-dt * 8));
    pulse.uniforms.uTime.value = elapsed;
    const lineVisible = bounds.some(bound => bound.top - scrollY + bound.height >= 0 && bound.top - scrollY < height);
    const breathing = lineVisible && pulse.uniforms.uProgress.value < 0.4999;
    const response = pulse.uniforms.uResponse.value > 0.0001;
    // Grain is static. Do not redraw unchanged offscreen/roof/skyline frames.
    if ((now - lastPaint < 15 && !inkCleared) || (!breathing && !response && !changing && !fluidDirty && !inkCleared && lastScroll === scrollY)) return;
    lastPaint = now; lastScroll = scrollY;
    bgUniforms.uPaperBand.value.set(feeTop - scrollY, feeBottom - scrollY);
    renderer.setRenderTarget(source);
    quad.material = background; renderer.render(screen, passCamera);
    for (const bound of bounds) {
      const top = bound.top - scrollY;
      if (top + bound.height < 0 || top > height) continue;
      pulse.line.position.set(bound.left, height - top - bound.height * 0.76, 0);
      pulse.line.scale.set(bound.width, Math.min(48, bound.height * 0.48), 1);
      renderer.render(pulses, lineCamera);
    }
    renderer.setRenderTarget(null);
    quad.material = grain; renderer.render(screen, passCamera);
    canvas.dataset.progress = pulse.uniforms.uProgress.value.toFixed(3);
    canvas.dataset.response = pulse.uniforms.uResponse.value.toFixed(3);
    canvas.dataset.responsePeak = Math.max(Number(canvas.dataset.responsePeak || 0), pulse.uniforms.uResponse.value).toFixed(3);
    canvas.dataset.frames = String(++frames);
    if (dt > 0.04 && fluidDirty) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 90 && fluid) {
      fluid.dispose(); fluid = undefined; fluidPermitted = false;
      bgUniforms.uFluid.value = 0; bgUniforms.uDye.value = null;
      fluidDirty = false; lastScroll = -1; canvas.dataset.ink = 'idle';
      canvas.dataset.fluid = 'performance';
    }
  }
  function visibility() {
    if (document.hidden) {
      lenis.stop(); gsap.ticker.remove(draw); gsap.ticker.sleep();
      canvas.dataset.paused = 'true';
    } else {
      lastFrame = 0; lastPointer = -Infinity; pending = undefined; pointerKnown = false;
      lenis.start(); gsap.ticker.add(draw); gsap.ticker.wake();
      canvas.dataset.paused = 'false';
    }
  }
  document.addEventListener('visibilitychange', visibility, { signal: abort.signal });
  measure();
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    abort.abort(); resizeObserver.disconnect();
    gsap.ticker.remove(draw); entrance?.kill();
    trigger.kill(); lenis.destroy(); fluid?.dispose();
    pulse.dispose(); geometry.dispose(); background.dispose(); grain.dispose(); source.dispose();
    renderer.dispose(); renderer.forceContextLoss();
  };
  try {
    renderer.setRenderTarget(source);
    quad.material = background; await renderer.compileAsync(screen, passCamera);
    await renderer.compileAsync(pulses, lineCamera);
    renderer.setRenderTarget(null);
    quad.material = grain; await renderer.compileAsync(screen, passCamera);
    await fluid?.prepare();
    if (shaderFailed) throw new Error('Effect shader unavailable');
    entrance = gsap.to(intro, { value: 1, duration: 0.9, ease: 'power2.out' });
    draw(0);
    if (shaderFailed || context.isContextLost()) throw new Error('Effect shader unavailable');
  } catch (error) { dispose(); throw error; }
  gsap.ticker.add(draw);
  if (document.hidden) visibility();
  return dispose;
}
