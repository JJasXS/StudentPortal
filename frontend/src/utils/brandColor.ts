const DEFAULT_BRAND = '#2563eb';

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('')}`;
}

function mix(
  rgb: { r: number; g: number; b: number },
  target: { r: number; g: number; b: number },
  amount: number
) {
  return {
    r: rgb.r + (target.r - rgb.r) * amount,
    g: rgb.g + (target.g - rgb.g) * amount,
    b: rgb.b + (target.b - rgb.b) * amount,
  };
}

export function applyBrandPalette(brandColor?: string) {
  const base = hexToRgb(brandColor ?? DEFAULT_BRAND) ?? hexToRgb(DEFAULT_BRAND)!;
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  const root = document.documentElement;

  const shades: Record<string, number> = {
    50: 0.92,
    100: 0.84,
    200: 0.68,
    300: 0.52,
    400: 0.28,
    500: 0.12,
    600: 0,
    700: 0.14,
    800: 0.28,
    900: 0.42,
  };

  for (const [shade, amount] of Object.entries(shades)) {
    const mixed =
      Number(shade) <= 500
        ? mix(base, white, amount)
        : mix(base, black, amount);
    root.style.setProperty(`--primary-${shade}`, rgbToHex(mixed.r, mixed.g, mixed.b));
  }
}

export function brandColorToRgb(hex?: string): [number, number, number] {
  const rgb = hexToRgb(hex ?? DEFAULT_BRAND) ?? hexToRgb(DEFAULT_BRAND)!;
  return [rgb.r, rgb.g, rgb.b];
}
