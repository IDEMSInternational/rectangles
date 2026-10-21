import { CustomField, Preset } from '@studio/engine/puzzle-game';

/** Smallest and largest grid sides offered to players. */
const MIN_SIDE = 4;
const MAX_SIDE = 25;

export interface RectanglesParams {
  w: number;
  h: number;
  /**
   * Generate on a grid this much smaller, then stretch it to full size,
   * which makes long thin rectangles more common. 0 = no stretching.
   * Kept as a 32-bit float, as in the original, so seeds stay compatible.
   */
  expandFactor: number;
  /** Place clues so the puzzle has exactly one solution. */
  unique: boolean;
}

export function defaultParams(): RectanglesParams {
  return { w: 7, h: 7, expandFactor: 0, unique: true };
}

export function presets(): Preset<RectanglesParams>[] {
  return [4, 5, 6, 7, 8, 9, 10].map((n) => ({
    name: `${n}×${n}`,
    params: { w: n, h: n, expandFactor: 0, unique: true },
  }));
}

export function customFields(params: RectanglesParams): CustomField[] {
  return [
    { key: 'w', label: 'Width', min: MIN_SIDE, max: MAX_SIDE, value: params.w },
    { key: 'h', label: 'Height', min: MIN_SIDE, max: MAX_SIDE, value: params.h },
  ];
}

export function customParams(values: Readonly<Record<string, number>>): RectanglesParams {
  return { ...defaultParams(), w: values['w'], h: values['h'] };
}

/** Text form, compatible with the original: "7x7", "10x10e0.5", "9x9a". */
export function encodeParams(params: RectanglesParams): string {
  let text = `${params.w}x${params.h}`;
  if (params.expandFactor) text += `e${formatFloat(params.expandFactor)}`;
  if (!params.unique) text += 'a';
  return text;
}

export function decodeParams(text: string): RectanglesParams {
  const params = defaultParams();
  const match = /^(\d*)(?:x(\d*))?(?:e([\d.]*))?(a)?/.exec(text);
  if (!match) return params;
  const [, w, h, expand, ambiguous] = match;
  params.w = params.h = parseInt(w, 10) || 0;
  if (h !== undefined) params.h = parseInt(h, 10) || 0;
  if (expand !== undefined) params.expandFactor = Math.fround(parseFloat(expand) || 0);
  if (ambiguous) params.unique = false;
  return params;
}

export function validateParams(params: RectanglesParams): string | null {
  if (params.w <= 0 || params.h <= 0) return 'Width and height must both be greater than zero';
  if (params.w * params.h > 10000) return 'Width times height must not be unreasonably large';
  if (params.w * params.h < 2) return 'Grid area must be greater than one';
  if (params.expandFactor < 0) return 'Expansion factor may not be negative';
  return null;
}

/** Shortest decimal that reads back as the same 32-bit float, like C's %g. */
function formatFloat(value: number): string {
  for (let digits = 1; digits <= 9; digits++) {
    const text = String(Number(value.toPrecision(digits)));
    if (Math.fround(Number(text)) === Math.fround(value)) return text;
  }
  return String(value);
}
