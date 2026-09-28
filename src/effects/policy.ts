export function effectPolicy(reducedMotion: boolean, memory?: number, saveData = false) {
  return {
    enabled: !reducedMotion && !saveData,
    fluid: !reducedMotion && !saveData && (memory === undefined || memory >= 4),
    pixelRatio: 1.5,
  };
}
