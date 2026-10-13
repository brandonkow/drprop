/** Expo native rotation uses radians. Its web module currently omits rotation. */
export function cardTilt(beta: number, gamma: number) {
  if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return { x: 0, y: 0 };
  const degrees = 180 / Math.PI;
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  return { x: clamp(gamma * degrees / 35), y: clamp((beta * degrees - 45) / 35) };
}
