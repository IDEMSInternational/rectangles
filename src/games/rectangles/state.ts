import { Rect, Size, rectContains } from './geometry';

/** A position in a game of Rectangles. Treated as immutable. */
export interface RectanglesState extends Size {
  /** Clue numbers, indexed y * w + x (0 = no clue). */
  readonly clues: Int32Array;
  /** Rectangles the player has drawn. They never overlap. */
  readonly rects: readonly Rect[];
  readonly completed: boolean;
  /** True once the player has used "Solve". */
  readonly cheated: boolean;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * True when the drawn rectangles cover the whole grid and each contains
 * exactly one number, equal to its area. Only the finished puzzle is
 * judged: individual rectangles are never marked right or wrong.
 */
export function isSolved(state: Size & { clues: Int32Array; rects: readonly Rect[] }): boolean {
  const covered = state.rects.reduce((sum, r) => sum + r.w * r.h, 0);
  if (covered !== state.w * state.h) return false;

  return state.rects.every((r) => {
    let clues = 0;
    let value = 0;
    state.clues.forEach((n, i) => {
      if (n && rectContains(r, i % state.w, Math.floor(i / state.w))) {
        clues++;
        value = n;
      }
    });
    return clues === 1 && value === r.w * r.h;
  });
}
