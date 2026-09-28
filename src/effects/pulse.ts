import { Color } from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { tokens } from '../../brand/tokens.ts';

const shapeShader = `
uniform float uProgress; uniform float uTime; uniform float uResponse;
float triangle(float x, float centre, float width) { return max(0.0, 1.0 - abs(x - centre) / width); }
float beat(float x, float centre) {
  return -0.16 * triangle(x, centre - 0.027, 0.012)
    + triangle(x, centre, 0.016) - 0.28 * triangle(x, centre + 0.021, 0.009)
    + 0.16 * triangle(x, centre + 0.055, 0.026);
}
float skyline(float x) {
  float houses = 0.36 * triangle(x, 0.20, 0.045) + 0.36 * triangle(x, 0.29, 0.045);
  float apartment = step(0.43, x) * (1.0 - step(0.485, x)) * 0.8;
  float tower = step(0.50, x) * (1.0 - step(0.57, x)) * 1.0;
  float detached = 0.48 * triangle(x, 0.76, 0.07);
  return houses + apartment + tower + detached;
}
vec3 morph(vec3 point) {
  float x = point.x;
  float rhythm = 0.72 + 0.28 * exp(-pow((fract(uTime / 1.2) - 0.3) * 7.0, 2.0));
  float heart = (beat(x, 0.30) + beat(x, 0.52) + beat(x, 0.74)) * rhythm;
  float roof = triangle(x, 0.4, 0.065);
  float y;
  if (uProgress < 0.25) y = mix(0.0, heart, smoothstep(0.0, 0.25, uProgress));
  else if (uProgress < 0.5) y = mix(heart, roof, smoothstep(0.25, 0.5, uProgress));
  else y = mix(roof, skyline(x), smoothstep(0.5, 1.0, uProgress));
  return vec3(x, y * (1.0 + uResponse), point.z);
}`;

export function createPulse() {
  const geometry = new LineGeometry();
  geometry.setPositions(Array.from({ length: 512 }, (_, i) => [i / 511, 0, 0]).flat());
  const material = new LineMaterial({ color: new Color(tokens.ink), linewidth: 1.5, worldUnits: false, depthTest: false, depthWrite: false });
  const uniforms = { uProgress: { value: 0 }, uTime: { value: 0 }, uResponse: { value: 0 } };
  // Morph both endpoints before LineMaterial expands the line in screen space.
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shapeShader + shader.vertexShader
      .replace('vec4( instanceStart, 1.0 )', 'vec4( morph(instanceStart), 1.0 )')
      .replace('vec4( instanceEnd, 1.0 )', 'vec4( morph(instanceEnd), 1.0 )');
  };
  material.customProgramCacheKey = () => 'dr-prop-pulse-v1';
  const line = new Line2(geometry, material);
  line.frustumCulled = false;
  return { line, material, uniforms, dispose() { geometry.dispose(); material.dispose(); } };
}
