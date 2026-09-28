/**
 * Layer A — Ink Fluid, and Layer C — Grain (brief §7.3).
 *
 * The simulation core is ported from PavelDoGreat/WebGL-Fluid-Simulation
 * (MIT, see ./LICENSE). Changes for Dr Prop:
 *   - palette locked to low-saturation stone, bronze and travertine inks that
 *     darken bone paper (subtractive), instead of glowing rainbow dye
 *   - higher density dissipation, smaller splats, no bloom, no sunrays
 *   - ink only while the pointer or finger moves; 3s after the last movement the
 *     paper is clean and the loop stops drawing
 *   - SIM_RESOLUTION 64, DYE_RESOLUTION 512 (256 on phones)
 *   - film grain in the display pass
 * With `simulate: false` only the grain is drawn, once (low-memory devices).
 */
import { color } from '@drprop/brand/tokens';
import {
  advectionFragment,
  baseVertex,
  clearFragment,
  curlFragment,
  displayFragment,
  divergenceFragment,
  gradientSubtractFragment,
  pressureFragment,
  splatFragment,
  vorticityFragment,
} from './shaders.ts';

export const FLUID_CONFIG = {
  SIM_RESOLUTION: 64,
  DYE_RESOLUTION: 512,
  DYE_RESOLUTION_MOBILE: 256,
  DENSITY_DISSIPATION: 1.4,
  VELOCITY_DISSIPATION: 0.4,
  PRESSURE: 0.8,
  PRESSURE_ITERATIONS: 16,
  CURL: 18,
  SPLAT_RADIUS: 0.07,
  SPLAT_FORCE: 3200,
  /** Absorbance added per splat; low so ink builds up slowly. */
  INK_STRENGTH: 0.11,
  /** Seconds after the last movement until the paper counts as clean. */
  IDLE_CLEAN: 3,
  /** Grain amplitude, ±. 0.04 ≈ 4% (brief: 3–5%). */
  GRAIN: 0.04,
} as const;

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] as const;
};

/** Absorbance of a pigment: how much of each channel it takes out of white paper. */
const absorbance = (hex: string, strength: number) =>
  hexToRgb(hex).map((c) => -Math.log(Math.max(c, 0.02)) * strength) as unknown as [number, number, number];

/** Brand inks, low saturation (§5.2: travertine, stone, bronze). Travertine is deepened to read on bone. */
const INKS = [
  absorbance(color.stone, 1),
  absorbance(color.bronze, 0.9),
  absorbance('#A89A84', 1.2), // travertine, one step darker
];

interface FBO {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  attach(id: number): number;
}

interface DoubleFBO {
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  read: FBO;
  write: FBO;
  swap(): void;
}

interface Format {
  internalFormat: number;
  format: number;
}

type GL = WebGLRenderingContext | WebGL2RenderingContext;

export interface FluidOptions {
  simulate: boolean;
  mobile: boolean;
  pixelRatio: number;
}

export class InkPaper {
  readonly canvas: HTMLCanvasElement;
  private gl: GL;
  private ext: { rgba: Format; rg: Format; r: Format; halfFloat: number; linear: boolean };
  private programs!: Record<string, { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null> }>;
  private dye!: DoubleFBO;
  private velocity!: DoubleFBO;
  private divergence!: FBO;
  private curl!: FBO;
  private pressure!: DoubleFBO;
  private blit!: (target: FBO | null) => void;
  private lastMove = -Infinity;
  private inkIndex = 0;
  private pointer = { x: 0, y: 0, px: 0, py: 0, has: false, moved: false };
  private frame = 0;
  private cleanDrawn = false;

  constructor(private readonly options: FluidOptions) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'scene scene--paper';
    this.canvas.setAttribute('aria-hidden', 'true');

    const params: WebGLContextAttributes = {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false,
      powerPreference: 'low-power',
      failIfMajorPerformanceCaveat: true,
    };
    const gl2 = this.canvas.getContext('webgl2', params);
    const gl = gl2 ?? this.canvas.getContext('webgl', params);
    if (!gl) throw new Error('InkPaper: WebGL unavailable');
    this.gl = gl;
    this.ext = this.formats(gl, !!gl2);
    this.init();
  }

  /* ---------------------------------------------------------------- setup */

  private formats(gl: GL, isWebGL2: boolean) {
    let halfFloat: number;
    let linear: boolean;
    if (isWebGL2) {
      const g = gl as WebGL2RenderingContext;
      g.getExtension('EXT_color_buffer_float');
      linear = !!g.getExtension('OES_texture_float_linear');
      halfFloat = g.HALF_FLOAT;
    } else {
      const hf = gl.getExtension('OES_texture_half_float');
      linear = !!gl.getExtension('OES_texture_half_float_linear');
      if (!hf) throw new Error('InkPaper: half float textures unsupported');
      halfFloat = hf.HALF_FLOAT_OES;
    }
    const supported = (internalFormat: number, format: number): Format | null => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, halfFloat, null);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.deleteFramebuffer(fbo);
      gl.deleteTexture(tex);
      return ok ? { internalFormat, format } : null;
    };
    let rgba: Format | null;
    let rg: Format | null;
    let r: Format | null;
    if (isWebGL2) {
      const g = gl as WebGL2RenderingContext;
      rgba = supported(g.RGBA16F, g.RGBA);
      rg = supported(g.RG16F, g.RG) ?? rgba;
      r = supported(g.R16F, g.RED) ?? rg;
    } else {
      rgba = rg = r = supported(gl.RGBA, gl.RGBA);
    }
    if (!rgba || !rg || !r) throw new Error('InkPaper: no renderable float format');
    return { rgba, rg, r, halfFloat, linear };
  }

  private compile(type: number, source: string, keywords: string[] = []) {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, keywords.map((k) => `#define ${k}\n`).join('') + source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`InkPaper: shader compile failed: ${gl.getShaderInfoLog(shader)}`);
    }
    return shader;
  }

  private program(vertex: WebGLShader, fragmentSource: string, keywords?: string[]) {
    const gl = this.gl;
    const program = gl.createProgram()!;
    gl.attachShader(program, vertex);
    gl.attachShader(program, this.compile(gl.FRAGMENT_SHADER, fragmentSource, keywords));
    gl.bindAttribLocation(program, 0, 'aPosition');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`InkPaper: program link failed: ${gl.getProgramInfoLog(program)}`);
    }
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const name = gl.getActiveUniform(program, i)!.name;
      uniforms[name] = gl.getUniformLocation(program, name);
    }
    return { program, uniforms };
  }

  private init() {
    const gl = this.gl;
    const vertex = this.compile(gl.VERTEX_SHADER, baseVertex);
    this.programs = {
      display: this.program(vertex, displayFragment),
      ...(this.options.simulate && {
        clear: this.program(vertex, clearFragment),
        splat: this.program(vertex, splatFragment),
        advection: this.program(vertex, advectionFragment, this.ext.linear ? [] : ['MANUAL_FILTERING']),
        divergence: this.program(vertex, divergenceFragment),
        curl: this.program(vertex, curlFragment),
        vorticity: this.program(vertex, vorticityFragment),
        pressure: this.program(vertex, pressureFragment),
        gradientSubtract: this.program(vertex, gradientSubtractFragment),
      }),
    };

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    this.blit = (target) => {
      if (target === null) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      } else {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };
  }

  private createFBO(w: number, h: number, f: Format, param: number): FBO {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, f.internalFormat, w, h, 0, f.format, this.ext.halfFloat, null);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelSizeX: 1 / w,
      texelSizeY: 1 / h,
      attach(id: number) {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      },
    };
  }

  private createDoubleFBO(w: number, h: number, f: Format, param: number): DoubleFBO {
    let a = this.createFBO(w, h, f, param);
    let b = this.createFBO(w, h, f, param);
    return {
      width: w,
      height: h,
      texelSizeX: a.texelSizeX,
      texelSizeY: a.texelSizeY,
      get read() {
        return a;
      },
      get write() {
        return b;
      },
      swap() {
        [a, b] = [b, a];
      },
    };
  }

  private resolution(base: number) {
    const gl = this.gl;
    let aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (aspect < 1) aspect = 1 / aspect;
    const min = Math.round(base);
    const max = Math.round(base * aspect);
    return gl.drawingBufferWidth > gl.drawingBufferHeight ? { w: max, h: min } : { w: min, h: max };
  }

  /** (Re)allocate buffers for the current canvas size. Dye is cleared: a resize starts on clean paper. */
  private initFramebuffers() {
    const gl = this.gl;
    const dyeBase = this.options.mobile ? FLUID_CONFIG.DYE_RESOLUTION_MOBILE : FLUID_CONFIG.DYE_RESOLUTION;
    const dyeRes = this.resolution(this.options.simulate ? dyeBase : 4);
    const filtering = this.ext.linear ? gl.LINEAR : gl.NEAREST;
    gl.disable(gl.BLEND);
    this.dye = this.createDoubleFBO(dyeRes.w, dyeRes.h, this.ext.rgba, filtering);
    if (!this.options.simulate) return;
    const sim = this.resolution(FLUID_CONFIG.SIM_RESOLUTION);
    this.velocity = this.createDoubleFBO(sim.w, sim.h, this.ext.rg, filtering);
    this.divergence = this.createFBO(sim.w, sim.h, this.ext.r, gl.NEAREST);
    this.curl = this.createFBO(sim.w, sim.h, this.ext.r, gl.NEAREST);
    this.pressure = this.createDoubleFBO(sim.w, sim.h, this.ext.r, gl.NEAREST);
  }

  /* ---------------------------------------------------------------- public */

  resize(cssWidth: number, cssHeight: number) {
    const w = Math.floor(cssWidth * this.options.pixelRatio);
    const h = Math.floor(cssHeight * this.options.pixelRatio);
    if (this.canvas.width === w && this.canvas.height === h && this.dye) return;
    this.canvas.width = w;
    this.canvas.height = h;
    this.initFramebuffers();
    this.cleanDrawn = false;
  }

  /** Pointer position in CSS px relative to the viewport. */
  move(x: number, y: number) {
    if (!this.options.simulate) return;
    const p = this.pointer;
    const nx = x / this.canvas.clientWidth;
    const ny = 1 - y / this.canvas.clientHeight;
    if (!p.has) {
      p.x = p.px = nx;
      p.y = p.py = ny;
      p.has = true;
      return;
    }
    p.px = p.x;
    p.py = p.y;
    p.x = nx;
    p.y = ny;
    p.moved = true;
    this.lastMove = performance.now();
  }

  /** True while there is ink on the paper and frames need drawing. */
  get active() {
    return performance.now() - this.lastMove < FLUID_CONFIG.IDLE_CLEAN * 1000 || !this.cleanDrawn;
  }

  /** Advance and draw one frame. dt in seconds. */
  update(dt: number) {
    const idleFor = (performance.now() - this.lastMove) / 1000;
    if (this.options.simulate && idleFor < FLUID_CONFIG.IDLE_CLEAN) {
      if (this.pointer.moved) this.splatPointer();
      this.step(Math.min(dt, 1 / 60));
      this.render();
      return;
    }
    if (!this.cleanDrawn) {
      // Idle: wipe the paper so it is truly clean, draw once, then rest.
      if (this.options.simulate) this.clearDye();
      this.render();
      this.cleanDrawn = true;
    }
  }

  dispose() {
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  /* ---------------------------------------------------------------- sim */

  private bind(name: string) {
    const p = this.programs[name]!;
    this.gl.useProgram(p.program);
    return p.uniforms;
  }

  private splatPointer() {
    const p = this.pointer;
    p.moved = false;
    const aspect = this.canvas.width / this.canvas.height;
    let dx = p.x - p.px;
    let dy = p.y - p.py;
    if (aspect < 1) dx *= aspect;
    if (aspect > 1) dy /= aspect;
    if (dx === 0 && dy === 0) return;
    // Change ink every few strokes; stroke speed thins it out slightly.
    this.inkIndex = (this.inkIndex + (Math.random() < 0.02 ? 1 : 0)) % INKS.length;
    const ink = INKS[this.inkIndex]!;
    const k = FLUID_CONFIG.INK_STRENGTH;
    this.splat(p.x, p.y, dx * FLUID_CONFIG.SPLAT_FORCE, dy * FLUID_CONFIG.SPLAT_FORCE, [ink[0] * k, ink[1] * k, ink[2] * k]);
    this.cleanDrawn = false;
  }

  private splat(x: number, y: number, dx: number, dy: number, c: [number, number, number]) {
    const gl = this.gl;
    const u = this.bind('splat');
    const aspect = this.canvas.width / this.canvas.height;
    let radius = FLUID_CONFIG.SPLAT_RADIUS / 100;
    if (aspect > 1) radius *= aspect;
    gl.uniform1i(u.uTarget!, this.velocity.read.attach(0));
    gl.uniform1f(u.aspectRatio!, aspect);
    gl.uniform2f(u.point!, x, y);
    gl.uniform3f(u.color!, dx, dy, 0);
    gl.uniform1f(u.radius!, radius);
    this.blit(this.velocity.write);
    this.velocity.swap();

    gl.uniform1i(u.uTarget!, this.dye.read.attach(0));
    gl.uniform3f(u.color!, c[0], c[1], c[2]);
    this.blit(this.dye.write);
    this.dye.swap();
  }

  private clearDye() {
    const gl = this.gl;
    for (const target of [this.dye.read, this.dye.write, this.velocity.read, this.velocity.write]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  }

  private step(dt: number) {
    const gl = this.gl;
    const v = this.velocity;
    gl.disable(gl.BLEND);

    let u = this.bind('curl');
    gl.uniform2f(u.texelSize!, v.texelSizeX, v.texelSizeY);
    gl.uniform1i(u.uVelocity!, v.read.attach(0));
    this.blit(this.curl);

    u = this.bind('vorticity');
    gl.uniform2f(u.texelSize!, v.texelSizeX, v.texelSizeY);
    gl.uniform1i(u.uVelocity!, v.read.attach(0));
    gl.uniform1i(u.uCurl!, this.curl.attach(1));
    gl.uniform1f(u.curl!, FLUID_CONFIG.CURL);
    gl.uniform1f(u.dt!, dt);
    this.blit(v.write);
    v.swap();

    u = this.bind('divergence');
    gl.uniform2f(u.texelSize!, v.texelSizeX, v.texelSizeY);
    gl.uniform1i(u.uVelocity!, v.read.attach(0));
    this.blit(this.divergence);

    u = this.bind('clear');
    gl.uniform1i(u.uTexture!, this.pressure.read.attach(0));
    gl.uniform1f(u.value!, FLUID_CONFIG.PRESSURE);
    this.blit(this.pressure.write);
    this.pressure.swap();

    u = this.bind('pressure');
    gl.uniform2f(u.texelSize!, v.texelSizeX, v.texelSizeY);
    gl.uniform1i(u.uDivergence!, this.divergence.attach(0));
    for (let i = 0; i < FLUID_CONFIG.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(u.uPressure!, this.pressure.read.attach(1));
      this.blit(this.pressure.write);
      this.pressure.swap();
    }

    u = this.bind('gradientSubtract');
    gl.uniform2f(u.texelSize!, v.texelSizeX, v.texelSizeY);
    gl.uniform1i(u.uPressure!, this.pressure.read.attach(0));
    gl.uniform1i(u.uVelocity!, v.read.attach(1));
    this.blit(v.write);
    v.swap();

    u = this.bind('advection');
    gl.uniform2f(u.texelSize!, v.texelSizeX, v.texelSizeY);
    if (!this.ext.linear) gl.uniform2f(u.dyeTexelSize!, v.texelSizeX, v.texelSizeY);
    const vid = v.read.attach(0);
    gl.uniform1i(u.uVelocity!, vid);
    gl.uniform1i(u.uSource!, vid);
    gl.uniform1f(u.dt!, dt);
    gl.uniform1f(u.dissipation!, FLUID_CONFIG.VELOCITY_DISSIPATION);
    this.blit(v.write);
    v.swap();

    if (!this.ext.linear) gl.uniform2f(u.dyeTexelSize!, this.dye.texelSizeX, this.dye.texelSizeY);
    gl.uniform1i(u.uVelocity!, v.read.attach(0));
    gl.uniform1i(u.uSource!, this.dye.read.attach(1));
    gl.uniform1f(u.dissipation!, FLUID_CONFIG.DENSITY_DISSIPATION);
    this.blit(this.dye.write);
    this.dye.swap();
  }

  private render() {
    const gl = this.gl;
    const [r, g, b] = hexToRgb(color.bone);
    const u = this.bind('display');
    gl.disable(gl.BLEND);
    gl.uniform1i(u.uTexture!, this.dye.read.attach(0));
    gl.uniform3f(u.paper!, r, g, b);
    gl.uniform1f(u.grain!, FLUID_CONFIG.GRAIN);
    gl.uniform1f(u.seed!, (this.frame++ % 64) + 1);
    this.blit(null);
  }
}
