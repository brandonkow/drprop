import {
  HalfFloatType, LinearFilter, Mesh, OrthographicCamera, PlaneGeometry,
  Scene, ShaderMaterial, Vector2, Vector3, WebGLRenderTarget,
  type WebGLRenderer, type Texture,
} from 'three';
import * as shaders from './vendor/pavel-shaders.ts';

// Solver and simulation shaders adapted from Pavel Dobryakov's MIT project.
// Attribution, pinned revision and integration changes: docs/effects.md.
export const simulation = { resolution: 64, desktopDye: 512, mobileDye: 256, densityDissipation: 4.5, radius: 0.0006, pressureIterations: 16 };
const vertexShader = `
varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
uniform vec2 texelSize;
void main() {
  vUv = uv;
  vL = uv - vec2(texelSize.x, 0.0); vR = uv + vec2(texelSize.x, 0.0);
  vT = uv + vec2(0.0, texelSize.y); vB = uv - vec2(0.0, texelSize.y);
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

export function createFluid(renderer: WebGLRenderer, width: number, height: number, mobile: boolean) {
  let aspect = width / height;
  const targets: WebGLRenderTarget[] = [];
  const materials: ShaderMaterial[] = [];
  function target(resolution: number) {
    const w = Math.round(resolution * Math.max(1, Math.min(aspect, 3)));
    const h = Math.round(resolution * Math.max(1, Math.min(1 / aspect, 3)));
    const result = new WebGLRenderTarget(w, h, { type: HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false, stencilBuffer: false });
    targets.push(result);
    renderer.setRenderTarget(result);
    renderer.clear();
    const gl = renderer.getContext();
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      targets.forEach(t => t.dispose());
      renderer.setRenderTarget(null);
      throw new Error('Half-float framebuffer unavailable');
    }
    return result;
  }
  function pair(resolution: number) {
    return { read: target(resolution), write: target(resolution), swap() { [this.read, this.write] = [this.write, this.read]; } };
  }
  const velocity = pair(simulation.resolution);
  const dye = pair(mobile ? simulation.mobileDye : simulation.desktopDye);
  const pressure = pair(simulation.resolution);
  const divergence = target(simulation.resolution);
  const curlTarget = target(simulation.resolution);
  const texelSize = new Vector2(1 / velocity.read.width, 1 / velocity.read.height);
  const uniforms = {
    texelSize: { value: texelSize }, dyeTexelSize: { value: new Vector2(1 / dye.read.width, 1 / dye.read.height) },
    uTarget: { value: null as Texture | null }, uVelocity: { value: velocity.read.texture },
    uSource: { value: velocity.read.texture }, uPressure: { value: pressure.read.texture },
    uDivergence: { value: divergence.texture }, uCurl: { value: curlTarget.texture },
    point: { value: new Vector2() }, color: { value: new Vector3() }, aspectRatio: { value: aspect },
    radius: { value: simulation.radius }, dt: { value: 1 / 60 }, dissipation: { value: simulation.densityDissipation }, curl: { value: 12 },
  };
  function material(fragmentShader: string) {
    const result = new ShaderMaterial({ vertexShader, fragmentShader, uniforms, depthTest: false, depthWrite: false });
    materials.push(result);
    return result;
  }
  const programs = {
    splat: material(shaders.splatShader), advect: material(shaders.advectionShader),
    divergence: material(shaders.divergenceShader), curl: material(shaders.curlShader),
    vorticity: material(shaders.vorticityShader), pressure: material(shaders.pressureShader),
    gradient: material(shaders.gradientSubtractShader),
  };
  const geometry = new PlaneGeometry(2, 2);
  const quad = new Mesh(geometry, programs.splat);
  const scene = new Scene(); scene.add(quad);
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  function run(program: ShaderMaterial, destination: WebGLRenderTarget) {
    quad.material = program;
    renderer.setRenderTarget(destination);
    renderer.render(scene, camera);
  }
  function clear() {
    for (const item of targets) { renderer.setRenderTarget(item); renderer.clear(); }
    renderer.setRenderTarget(null);
  }
  return {
    get texture() { return dye.read.texture; },
    clear,
    async prepare() {
      // KHR_parallel_shader_compile lets the driver compile without one large
      // synchronous first-draw stall. Every shader is warmed before interaction.
      renderer.setRenderTarget(velocity.write);
      for (const program of Object.values(programs)) {
        quad.material = program;
        await renderer.compileAsync(scene, camera);
      }
      renderer.setRenderTarget(null);
    },
    resize(width: number, height: number, mobile: boolean) {
      aspect = width / height;
      for (const item of targets) {
        const resolution = item === dye.read || item === dye.write
          ? mobile ? simulation.mobileDye : simulation.desktopDye : simulation.resolution;
        item.setSize(Math.round(resolution * Math.max(1, Math.min(aspect, 3))), Math.round(resolution * Math.max(1, Math.min(1 / aspect, 3))));
      }
      uniforms.aspectRatio.value = aspect;
      uniforms.texelSize.value.set(1 / velocity.read.width, 1 / velocity.read.height);
      uniforms.dyeTexelSize.value.set(1 / dye.read.width, 1 / dye.read.height);
      clear();
    },
    splat(x: number, y: number, dx: number, dy: number, pigment: Vector3) {
      uniforms.point.value.set(x, y);
      uniforms.uTarget.value = velocity.read.texture;
      uniforms.color.value.set(dx * 1600, dy * 1600, 0);
      run(programs.splat, velocity.write); velocity.swap();
      uniforms.uTarget.value = dye.read.texture;
      uniforms.color.value.copy(pigment);
      run(programs.splat, dye.write); dye.swap();
    },
    step(dt: number) {
      uniforms.dt.value = Math.min(dt, 1 / 30);
      uniforms.uVelocity.value = velocity.read.texture;
      run(programs.curl, curlTarget);
      run(programs.vorticity, velocity.write); velocity.swap();
      uniforms.uVelocity.value = velocity.read.texture;
      run(programs.divergence, divergence);
      renderer.setRenderTarget(pressure.read); renderer.clear();
      for (let i = 0; i < simulation.pressureIterations; i++) {
        uniforms.uPressure.value = pressure.read.texture;
        run(programs.pressure, pressure.write); pressure.swap();
      }
      uniforms.uPressure.value = pressure.read.texture;
      run(programs.gradient, velocity.write); velocity.swap();
      uniforms.uVelocity.value = uniforms.uSource.value = velocity.read.texture;
      uniforms.dissipation.value = 0.8;
      run(programs.advect, velocity.write); velocity.swap();
      uniforms.uVelocity.value = velocity.read.texture;
      uniforms.uSource.value = dye.read.texture;
      uniforms.dissipation.value = simulation.densityDissipation;
      run(programs.advect, dye.write); dye.swap();
    },
    dispose() { targets.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); geometry.dispose(); },
  };
}
