/**
 * Brand 3D set (brief §9.1, §9.3). Procedural builders shared by the website,
 * the Remotion reels (R3F: <primitive object={build…()} />) and the glTF export
 * (npm run brand:3d → brand/3d/*.glb).
 */
export { buildApothecary, APOTHECARY_LABELS } from './apothecary.ts';
export { buildClayHouse, HOUSE_HEIGHT, type HousePart, type HouseType } from './clay-house.ts';
export { materials } from './materials.ts';
export { buildMemberCard, MEMBER_CARD_SIZE } from './member-card.ts';
export { buildPulseRoofSculpture } from './pulse-roof.ts';
export { pathToShapes, strokeShape } from './shapes.ts';
