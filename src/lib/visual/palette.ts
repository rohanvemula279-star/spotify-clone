import { rgbaToHct, hctToRgba, scoreColorVibrancy, generateTonalPalette, adjustTone, ensureContrast, rgbToHex, type HctColor } from "./hct";

export interface ColorPalette {
  primary: HctColor;
  secondary: HctColor;
  tertiary: HctColor;
  background: HctColor;
  surface: HctColor;
  text: HctColor;
  textSecondary: HctColor;
  accent: HctColor;
  vibrant: HctColor[];
  muted: HctColor[];
  raw: HctColor[];
}

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

export function extractPalette(
  imageData: ImageData,
  maxColors: number = 8
): ColorPalette {
  const pixels = imageData.data;
  const colorMap = new Map<string, { count: number; r: number; g: number; b: number; a: number }>();

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];

    if (a < 128) continue;

    const quantized = quantizeColor(r, g, b);
    const key = `${quantized[0]},${quantized[1]},${quantized[2]}`;

    const existing = colorMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      colorMap.set(key, { count: 1, r, g, b, a });
    }
  }

  const sorted = Array.from(colorMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, maxColors * 4);

  const hctColors = sorted
    .map(([, { r, g, b, a }]) => rgbaToHct(r, g, b, a / 255))
    .filter((c) => c.chroma > 0.5);

  const vibrancyScored = hctColors
    .map((c) => ({ color: c, score: scoreColorVibrancy(c) }))
    .sort((a, b) => b.score - a.score);

  const vibrant = vibrancyScored
    .filter((v) => v.score > 0.3)
    .slice(0, 3)
    .map((v) => v.color);

  const primary = vibrant[0] || hctColors[0] || rgbaToHct(30, 30, 30);
  const secondary = vibrant[1] || (hctColors.length > 1 ? hctColors[1] : adjustTone(primary, 0.6));
  const tertiary = vibrant[2] || (hctColors.length > 2 ? hctColors[2] : adjustTone(primary, 0.3));

  const background = adjustTone(primary, 0.05);
  const surface = adjustTone(primary, 0.12);
  const text = ensureContrast(rgbaToHct(255, 255, 255), background, 4.5);
  const textSecondary = ensureContrast(rgbaToHct(200, 200, 200), background, 3.0);
  const accent = ensureContrast(primary, background, 4.5);

  const muted = hctColors.slice(vibrant.length, vibrant.length + 3);
  const tonalPalette = generateTonalPalette(primary.hue, primary.chroma);

  return {
    primary,
    secondary,
    tertiary,
    background,
    surface,
    text,
    textSecondary,
    accent,
    vibrant,
    muted,
    raw: hctColors,
  };
}

function quantizeColor(
  r: number,
  g: number,
  b: number,
  steps: number = 4
): [number, number, number] {
  const step = 256 / steps;
  return [
    Math.floor(r / step) * step + Math.floor(step / 2),
    Math.floor(g / step) * step + Math.floor(step / 2),
    Math.floor(b / step) * step + Math.floor(step / 2),
  ];
}

export async function extractPaletteFromUrl(
  imageUrl: string
): Promise<ColorPalette> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 64;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      const imageData = ctx.getImageData(0, 0, size, size);
      resolve(extractPalette(imageData));
    };
    img.onerror = () => {
      resolve(createDefaultPalette());
    };
    img.src = imageUrl;
  });
}

export function createDefaultPalette(): ColorPalette {
  const bg = rgbaToHct(12, 12, 12);
  const text = rgbaToHct(255, 255, 255);
  const accent = rgbaToHct(212, 168, 87);
  return {
    primary: accent,
    secondary: rgbaToHct(100, 100, 100),
    tertiary: rgbaToHct(60, 60, 60),
    background: bg,
    surface: rgbaToHct(24, 24, 24),
    text,
    textSecondary: rgbaToHct(180, 180, 180),
    accent,
    vibrant: [accent],
    muted: [rgbaToHct(60, 60, 60)],
    raw: [],
  };
}

export interface GradientColors {
  start: string;
  end: string;
  overlay: string;
}

export function paletteToGradient(palette: ColorPalette): GradientColors {
  const p = palette.primary;
  const s = palette.secondary;
  return {
    start: p.hex,
    end: s.hex,
    overlay: palette.accent.hex,
  };
}

export function generateCSSVariables(palette: ColorPalette): Record<string, string> {
  return {
    "--hue": `${Math.round(palette.primary.hue)}`,
    "--chroma": `${palette.primary.chroma.toFixed(2)}`,
    "--bg-color": palette.background.hex,
    "--surface-color": palette.surface.hex,
    "--primary-color": palette.primary.hex,
    "--secondary-color": palette.secondary.hex,
    "--tertiary-color": palette.tertiary.hex,
    "--text-color": palette.text.hex,
    "--text-secondary": palette.textSecondary.hex,
    "--accent-color": palette.accent.hex,
  };
}
