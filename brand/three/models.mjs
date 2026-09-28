/** Original procedural brand models. Units are metres; no real development is depicted. */
import * as T from 'three';

const palette = { bone: '#F4F1EA', stone: '#8A857C', bronze: '#8C6A43', walnut: '#594334', linen: '#DDD4C5', night: '#141412', paper: '#FBFAF7' };
const material = (color, metalness = 0, roughness = 0.7) => new T.MeshStandardMaterial({ color, metalness, roughness });
function box(parent, name, size, position, color, metalness = 0) {
  const mesh = new T.Mesh(new T.BoxGeometry(...size), material(color, metalness));
  mesh.name = name; mesh.position.set(...position); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function cylinder(parent, name, radius, height, position, color, metalness = 0) {
  const mesh = new T.Mesh(new T.CylinderGeometry(radius, radius, height, 32), material(color, metalness)); mesh.name = name; mesh.position.set(...position); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export function pulseSculpture() {
  const group = new T.Group(); group.name = 'Pulse Roof sculpture';
  const points = [[-2, 0, 0], [-0.9, 0, 0], [-0.45, 0.45, 0], [0, 0, 0], [0.32, 0, 0], [0.55, 0.8, 0], [0.78, 0, 0], [2, 0, 0]];
  const curve = new T.CurvePath(); for (let i = 1; i < points.length; i++) curve.add(new T.LineCurve3(new T.Vector3(...points[i-1]), new T.Vector3(...points[i])));
  const pulse = new T.Mesh(new T.TubeGeometry(curve, 192, 0.018, 8, false), material(palette.bronze, 0.8, 0.32)); pulse.name = 'Single bronze pulse'; pulse.position.y = 0.25; pulse.castShadow = true; group.add(pulse);
  box(group, 'Travertine plinth', [4.8, 0.16, 1.6], [0, 0.08, 0], '#D9CFBF'); return group;
}
function roof(parent, width, depth, height, y) {
  const shape = new T.Shape(); shape.moveTo(-width / 2, 0); shape.lineTo(0, height); shape.lineTo(width / 2, 0); shape.closePath();
  const mesh = new T.Mesh(new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), material(palette.bone)); mesh.position.set(0, y, -depth / 2); mesh.name = 'Anonymous pitched roof'; mesh.castShadow = true; parent.add(mesh); return mesh;
}
export function clayHouse(type = 'terrace', highlight = 'none') {
  const group = new T.Group(); group.name = `Anonymous ${type}`;
  const floors = type === 'condo' ? 6 : 2; const width = type === 'bungalow' ? 2.5 : type === 'condo' ? 2.2 : 1.6; const height = floors * 0.55;
  box(group, 'Clay walls', [width, height, 1.5], [0, height / 2, 0], highlight === 'facade' ? palette.bronze : palette.bone);
  if (type !== 'condo') { const mesh = roof(group, width + 0.2, 1.75, 0.55, height); if (highlight === 'roof') mesh.material = material(palette.bronze); }
  else box(group, 'Flat roof', [width + 0.1, 0.12, 1.65], [0, height, 0], highlight === 'roof' ? palette.bronze : palette.stone);
  for (let row = 0; row < floors; row++) for (let col = 0; col < 3; col++) box(group, `Window ${row}-${col}`, [0.24, 0.27, 0.035], [(col - 1) * width * 0.28, 0.3 + row * 0.55, 0.77], '#9C9589');
  box(group, 'Entry', [0.3, 0.45, 0.04], [0, 0.225, 0.8], palette.walnut);
  box(group, 'Site boundary', [width + 0.7, 0.06, 2.2], [0, -0.03, 0], highlight === 'title' ? palette.bronze : '#D9CFBF'); return group;
}
export function apothecary() {
  const group = new T.Group(); group.name = 'Walnut apothecary';
  box(group, 'Walnut cabinet', [3.0, 1.65, 0.55], [0, 0.825, 0], palette.walnut);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 6; col++) {
    const x = (col - 2.5) * 0.48, y = 0.23 + row * 0.38;
    box(group, `Drawer ${row}-${col}`, [0.455, 0.35, 0.045], [x, y, 0.295], row % 2 ? '#614B3A' : '#6A503B');
    box(group, 'Paper label', [0.18, 0.07, 0.01], [x, y + 0.065, 0.324], palette.paper);
    const handle = cylinder(group, 'Brass handle', 0.022, 0.13, [x, y - 0.055, 0.345], palette.bronze, 0.75); handle.rotation.z = Math.PI / 2;
  }
  box(group, 'Counter', [3.14, 0.1, 0.7], [0, 1.72, 0.03], palette.walnut);
  return group;
}
export function memberCard() {
  const group = new T.Group(); group.name = 'Demo membership card';
  box(group, 'Brushed metal', [1.7, 2.7, 0.025], [0, 1.35, 0], palette.night, 0.65);
  const pulse = pulseSculpture().children[0].clone(); pulse.scale.setScalar(0.3); pulse.position.set(0, 1.5, 0.035); group.add(pulse);
  // Lettering is composed accessibly in app/reels rather than baking a fictitious member identity.
  return group;
}
export function conceptStore({ width = 8, depth = 12, height = 3.1 } = {}) {
  if (![width, depth, height].every(Number.isFinite) || width < 6 || depth < 8 || height < 2.4) throw new Error('Store dimensions are too small for this concept.');
  const group = new T.Group(); group.name = 'UNCONFIRMED CONCEPT STORE'; group.userData = { status: 'concept', width, depth, height, area: width * depth, note: 'Not a surveyed plan or construction drawing.' };
  box(group, 'Travertine floor', [width, 0.14, depth], [0, -0.07, 0], '#D9CFBF');
  box(group, 'Limewash rear wall', [width, height, 0.12], [0, height / 2, -depth / 2], palette.bone);
  box(group, 'Limewash side wall', [0.12, height, depth], [-width / 2, height / 2, 0], palette.bone);
  // Cutaway right wall/front preserve the architectural sightline in the preview.
  box(group, 'Reception tabletop', [2.4, 0.1, 0.85], [-1.8, 0.8, depth / 2 - 2], palette.walnut);
  for (const x of [-2.8, -0.8]) for (const z of [depth / 2 - 2.3, depth / 2 - 1.7]) box(group, 'Table leg', [0.09, 0.75, 0.09], [x, 0.375, z], palette.walnut);
  const cabinet = apothecary(); cabinet.position.set(-width / 2 + 0.5, 0, -0.4); cabinet.rotation.y = Math.PI / 2; group.add(cabinet);
  for (const x of [0.8, 2.7]) { box(group, 'Linen lounge seat', [1.35, 0.42, 0.8], [x, 0.45, 1.7], palette.linen); box(group, 'Linen back', [1.35, 0.65, 0.17], [x, 0.8, 2.05], palette.linen); }
  cylinder(group, 'Coffee table', 0.6, 0.1, [1.7, 0.48, 0.1], palette.walnut);
  cylinder(group, 'Table base', 0.18, 0.43, [1.7, 0.215, 0.1], palette.walnut);
  for (const x of [-width / 4, width / 4]) {
    box(group, 'Consultation privacy partition', [width / 2 - 0.35, 2.35, 0.08], [x, 1.175, -depth / 2 + 3.5], '#CFCBC1');
    cylinder(group, 'Round consultation table', 0.65, 0.08, [x, 0.78, -depth / 2 + 1.8], palette.walnut);
    for (const dx of [-0.85, 0.85]) box(group, 'Consultation chair', [0.5, 0.5, 0.5], [x + dx, 0.4, -depth / 2 + 1.8], palette.linen);
    box(group, 'Analysis screen', [0.95, 0.6, 0.05], [x, 1.5, -depth / 2 + 0.1], palette.night);
  }
  box(group, 'Consultation divider', [0.1, 2.4, 3.3], [0, 1.2, -depth / 2 + 1.65], palette.bone);
  box(group, 'Urgent call booth back', [1.1, 2.3, 0.1], [width / 2 - 0.7, 1.15, depth / 2 - 1], palette.walnut);
  box(group, 'Urgent call booth side', [0.1, 2.3, 1.1], [width / 2 - 1.25, 1.15, depth / 2 - 0.5], palette.walnut);
  return group;
}
export const modelFactories = {
  'pulse-roof': pulseSculpture,
  'clay-terrace': () => clayHouse('terrace'), 'clay-condo': () => clayHouse('condo'), 'clay-bungalow': () => clayHouse('bungalow'),
  apothecary, 'member-card': memberCard, 'store-concept': conceptStore,
};
