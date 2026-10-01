export const audioVersion: string;
export function synthesize(seconds: number): Buffer;
export function measureAudio(file: string): { integratedLufs: number; truePeakDbtp: number; rangeLu: number; threshold: number; offset: number };
export function parseLoudnessReport(stderr: string): ReturnType<typeof measureAudio>;
export function videoStreamHash(file: string): string;
export function masterVideo(file: string, seconds: number, options?: { silent?: boolean }): Promise<Record<string, unknown>>;
