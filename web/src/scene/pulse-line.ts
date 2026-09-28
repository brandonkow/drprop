/**
 * Layer B — the Pulse Roof line (brief §7.3).
 *
 * A three.js Line2 whose vertex shader blends four forms by `uProgress`:
 * flat (0) → beat (0.25) → roof (0.5) → skyline (1). Each vertex carries its roof
 * position and its skyline position; the beat is computed in the shader.
 */
import { BEAT_PERIOD, ECG, pulseGeometry, type PulseGeometry } from '@drprop/brand/pulse/forms';
import { color } from '@drprop/brand/tokens';
import { InstancedInterleavedBuffer, InterleavedBufferAttribute, OrthographicCamera, Scene, WebGLRenderer } from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import type { PulseLayout } from '../config/pulse.ts';

/** ~512 vertices across the screen (§7.3). */
const VERTICES = 512;

const f = (n: number) => (Number.isInteger(n) ? `${n}.0` : String(n));

/** Mirrors ecgShape(), beatEnvelope() and pulseAt() in brand/pulse/forms.ts. */
const PULSE_GLSL = /* glsl */ `
uniform float uProgress;
uniform float uTime;
uniform float uAmp;
uniform float uWidth;
uniform float uHeight;
uniform float uBaseline;
uniform float uApex;

attribute vec2 instanceSkyStart;
attribute vec2 instanceSkyEnd;

float pulseGauss( float dx, float w ) {
  return exp( -( dx * dx ) / ( w * w ) );
}

float pulseEcg( float x ) {
  float dx = ( x - uApex ) * uWidth;
  return ${f(ECG.p.amp)} * pulseGauss( dx - ${f(ECG.p.offset)}, ${f(ECG.p.width)} )
       + ${f(ECG.q.amp)} * pulseGauss( dx - ${f(ECG.q.offset)}, ${f(ECG.q.width)} )
       + ${f(ECG.r.amp)} * max( 0.0, 1.0 - abs( dx ) / ${f(ECG.r.halfWidth)} )
       + ${f(ECG.s.amp)} * pulseGauss( dx - ${f(ECG.s.offset)}, ${f(ECG.s.width)} )
       + ${f(ECG.t.amp)} * pulseGauss( dx - ${f(ECG.t.offset)}, ${f(ECG.t.width)} );
}

float pulseEnvelope( float t ) {
  float tt = mod( t, ${f(BEAT_PERIOD)} );
  float beat = smoothstep( 0.0, ${f(ECG.rise)}, tt ) * exp( -max( tt - ${f(ECG.rise)}, 0.0 ) * ${f(ECG.decay)} );
  return ${f(ECG.rest)} + ${f(1 - ECG.rest)} * beat;
}

vec3 pulsePos( vec3 base, vec2 sky ) {
  float toBeat = smoothstep( 0.0, 0.25, uProgress );
  float toRoof = smoothstep( 0.25, 0.5, uProgress );
  float toSky = smoothstep( 0.5, 1.0, uProgress );
  float y = toBeat * pulseEcg( base.x ) * pulseEnvelope( uTime );
  y = mix( y, base.y, toRoof );
  vec2 p = mix( vec2( base.x, y ), sky, toSky );
  return vec3( p.x * uWidth, uBaseline + p.y * uHeight * uAmp, 0.0 );
}
`;

export interface PulseUniforms {
  uProgress: { value: number };
  uTime: { value: number };
  uAmp: { value: number };
  uWidth: { value: number };
  uHeight: { value: number };
  uBaseline: { value: number };
  uApex: { value: number };
}

/** Polyline points for LineGeometry, and skyline pairs laid out per segment. */
function buffers(g: PulseGeometry) {
  const points = new Float32Array(g.count * 3);
  for (let i = 0; i < g.count; i++) points.set([g.base[i * 2]!, g.base[i * 2 + 1]!, 0], i * 3);
  const n = g.count - 1;
  const sky = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) sky.set(g.sky.subarray(i * 2, i * 2 + 4), i * 4);
  return { points, sky };
}

export function createPulseLine(layout: PulseLayout) {
  const uniforms: PulseUniforms = {
    uProgress: { value: 0 },
    uTime: { value: 0 },
    uAmp: { value: 1 },
    uWidth: { value: 1 },
    uHeight: { value: layout.height },
    uBaseline: { value: 0 },
    uApex: { value: layout.roof.apex },
  };

  const geometry = new LineGeometry();
  const setLayout = (l: PulseLayout) => {
    const { points, sky } = buffers(pulseGeometry(VERTICES, l.roof, l.variant));
    geometry.setPositions(points);
    const skyBuffer = new InstancedInterleavedBuffer(sky, 4, 1);
    geometry.setAttribute('instanceSkyStart', new InterleavedBufferAttribute(skyBuffer, 2, 0));
    geometry.setAttribute('instanceSkyEnd', new InterleavedBufferAttribute(skyBuffer, 2, 2));
    uniforms.uApex.value = l.roof.apex;
  };
  setLayout(layout);

  const material = new LineMaterial({ color: color.ink, linewidth: 1.5, worldUnits: false, transparent: true });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    const src = shader.vertexShader;
    const patched = src
      .replace('void main() {', `${PULSE_GLSL}\nvoid main() {`)
      .replace('vec4( instanceStart, 1.0 )', 'vec4( pulsePos( instanceStart, instanceSkyStart ), 1.0 )')
      .replace('vec4( instanceEnd, 1.0 )', 'vec4( pulsePos( instanceEnd, instanceSkyEnd ), 1.0 )');
    if (patched.split('pulsePos(').length !== 4) {
      // three.js changed LineMaterial's shader; fail loudly so the page falls back to SVG.
      throw new Error('PulseLine: could not patch LineMaterial vertex shader');
    }
    shader.vertexShader = patched;
  };

  const line = new Line2(geometry, material);
  // Positions come from the shader, so the CPU bounding volume is meaningless.
  line.frustumCulled = false;

  return { line, material, uniforms, setLayout };
}

/** Renderer, scene and pixel-space camera for the line. Lives here so three.js loads as one chunk. */
export function createLineStage(canvas: HTMLCanvasElement, onShaderError: () => void) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
    // Software-only WebGL is too slow for a full-screen canvas: keep the SVG line.
    failIfMajorPerformanceCaveat: true,
  });
  renderer.debug.onShaderError = onShaderError;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  return { renderer, scene: new Scene(), camera: new OrthographicCamera(0, 1, 1, 0, -1, 1) };
}
