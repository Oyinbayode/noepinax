const COOL_RAMP = [
  "#0a1628", "#0d2847", "#0f3b6e", "#1a5276", "#1abc9c",
  "#48c9b0", "#76d7c4", "#a3e4d7", "#d0ece7", "#e8f6f3",
] as const;

const WARM_RAMP = [
  "#1a0a00", "#4a1a00", "#7b2d00", "#b34700", "#e65100",
  "#ff6d00", "#ff8f00", "#ffab00", "#ffd54f", "#fff8e1",
] as const;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function sampleRamp(ramp: readonly string[], t: number): string {
  const idx = t * (ramp.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, ramp.length - 1);
  const frac = idx - lo;

  const [r1, g1, b1] = hexToRgb(ramp[lo]);
  const [r2, g2, b2] = hexToRgb(ramp[hi]);

  return rgbToHex(
    Math.round(lerp(r1, r2, frac)),
    Math.round(lerp(g1, g2, frac)),
    Math.round(lerp(b1, b2, frac)),
  );
}

export function gradientPair(warmth: number): [string, string] {
  const ramp = warmth > 0.5 ? WARM_RAMP : COOL_RAMP;
  const t = warmth > 0.5 ? (warmth - 0.5) * 2 : warmth * 2;

  return [sampleRamp(ramp, t * 0.6), sampleRamp(ramp, 0.4 + t * 0.6)];
}

export function accentColor(warmth: number): string {
  const opposite = 1 - warmth;
  const ramp = opposite > 0.5 ? WARM_RAMP : COOL_RAMP;
  return sampleRamp(ramp, 0.6);
}

export function shapeColor(warmth: number, index: number, total: number): string {
  const spread = index / Math.max(total - 1, 1);
  const ramp = warmth > 0.5 ? WARM_RAMP : COOL_RAMP;
  return sampleRamp(ramp, 0.2 + spread * 0.6);
}
