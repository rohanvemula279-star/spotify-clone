export interface HctColor {
  hue: number;
  chroma: number;
  tone: number;
  rgba: [number, number, number, number];
  hex: string;
}

function linearized(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function delinearized(v: number): number {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.round(clamp(c) * 255);
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function xyzToCam16(x: number, y: number, z: number): { hue: number; chroma: number; j: number; q: number } {
  const aw = 29.98;
  const n = 0.1843;
  const nbb = 1.0169;
  const ncb = 1.0169;
  const c = 0.69;
  const fl = 0.388;
  const flRoot = 0.789;
  const d = 1.0;
  const zVal = 1.48;

  const rC = 0.401288 * x + 0.650173 * y - 0.051461 * z;
  const gC = -0.250268 * x + 1.204414 * y + 0.045854 * z;
  const bC = -0.002079 * x + 0.048952 * y + 0.953127 * z;

  const rP = fl * Math.abs(rC) ** 0.42 * Math.sign(rC) || 0;
  const gP = fl * Math.abs(gC) ** 0.42 * Math.sign(gC) || 0;
  const bP = fl * Math.abs(bC) ** 0.42 * Math.sign(bC) || 0;

  const a = rP + (-12 * gP + bP) / 11;
  const bVal = (rP + gP - 2 * bP) / 9;

  const hueRad = Math.atan2(bVal, a);
  const hue = ((hueRad * 180) / Math.PI + 360) % 360;

  const cVal = Math.sqrt(a * a + bVal * bVal);

  return {
    hue,
    chroma: cVal,
    j: 0.5,
    q: 0,
  };
}

function cam16ToXyz(hue: number, chroma: number, tone: number): [number, number, number] {
  const y = toneToY(tone);
  const hueRad = (hue * Math.PI) / 180;

  if (chroma < 0.5) return [y * 0.9504, y, y * 1.0888];

  const a = chroma * Math.cos(hueRad);
  const bVal = chroma * Math.sin(hueRad);

  const rC = a * 1.0 + bVal * -0.0;
  const gC = a * -0.0 + bVal * 1.0;
  const bC = a * 0.0 + bVal * 0.0;

  const x = rC * 0.9504 + gC * 0.9504 + bC * 0.9504;
  const z = rC * 1.0888 + gC * 1.0888 + bC * 1.0888;

  return [x * y, y, z * y];
}

function toneToY(tone: number): number {
  const t = (tone + 16) / 116;
  return t * t * t;
}

function yToTone(y: number): number {
  return 116 * Math.cbrt(y) - 16;
}

function xyzToRgb(x: number, y: number, z: number): [number, number, number] {
  const rL = 3.2406 * x - 1.5372 * y - 0.4986 * z;
  const gL = -0.9689 * x + 1.8758 * y + 0.0415 * z;
  const bL = 0.0557 * x - 0.204 * y + 1.057 * z;

  return [
    delinearized(rL),
    delinearized(gL),
    delinearized(bL),
  ];
}

function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const rL = linearized(r);
  const gL = linearized(g);
  const bL = linearized(b);

  return [
    0.4124564 * rL + 0.3575761 * gL + 0.1804375 * bL,
    0.2126729 * rL + 0.7151522 * gL + 0.072175 * bL,
    0.0193339 * rL + 0.119192 * gL + 0.9503041 * bL,
  ];
}

export function rgbaToHct(r: number, g: number, b: number, a: number = 1): HctColor {
  const [x, y, z] = rgbToXyz(r, g, b);
  const tone = yToTone(y);
  const cam = xyzToCam16(x, y, z);

  return {
    hue: cam.hue,
    chroma: cam.chroma,
    tone: clamp(tone / 100),
    rgba: [r, g, b, a],
    hex: rgbToHex(r, g, b),
  };
}

export function hctToRgba(hue: number, chroma: number, tone: number): [number, number, number, number] {
  const t = clamp(tone) * 100;
  const [x, y, z] = cam16ToXyz(hue, chroma, t);
  const [r, g, b] = xyzToRgb(x, y, z);
  return [clamp255(r), clamp255(g), clamp255(b), 1];
}

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (clamp255(r) << 16) + (clamp255(g) << 8) + clamp255(b)).toString(16).slice(1)}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function getHctTone(color: HctColor): number {
  return color.tone;
}

export function isLight(color: HctColor): boolean {
  return color.tone > 0.5;
}

export function adjustTone(color: HctColor, newTone: number): HctColor {
  const [r, g, b] = hctToRgba(color.hue, color.chroma, newTone);
  return rgbaToHct(r, g, b);
}

export function ensureContrast(
  fg: HctColor,
  bg: HctColor,
  minContrast: number = 4.5
): HctColor {
  const current = contrastRatio(fg, bg);
  if (current >= minContrast) return fg;

  const bgLight = isLight(bg);
  let adjusted = { ...fg };

  for (let step = 0; step < 20; step++) {
    const offset = (step + 1) * 0.05;
    const newTone = bgLight
      ? Math.max(0, fg.tone - offset)
      : Math.min(1, fg.tone + offset);
    adjusted = adjustTone(adjusted, newTone);
    if (contrastRatio(adjusted, bg) >= minContrast) break;
  }

  return adjusted;
}

export function relativeLuminance(color: HctColor): number {
  const [r, g, b] = color.rgba;
  return 0.2126 * linearized(r) + 0.7152 * linearized(g) + 0.0722 * linearized(b);
}

export function contrastRatio(a: HctColor, b: HctColor): number {
  const l1 = relativeLuminance(a) + 0.05;
  const l2 = relativeLuminance(b) + 0.05;
  return Math.max(l1, l2) / Math.min(l1, l2);
}

export function generateTonalPalette(
  hue: number,
  chroma: number,
  steps: number[] = [0.1, 0.2, 0.4, 0.5, 0.6, 0.8, 0.9]
): HctColor[] {
  return steps.map((t) => {
    const [r, g, b] = hctToRgba(hue, chroma, t);
    return rgbaToHct(r, g, b);
  });
}

export function scoreColorVibrancy(color: HctColor): number {
  const [r, g, b] = color.rgba;
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const saturation = maxC === 0 ? 0 : (maxC - minC) / maxC;
  return saturation * color.chroma * 0.1;
}
