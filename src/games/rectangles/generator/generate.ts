import { GeneratedPuzzle } from '@studio/engine/puzzle-game';
import { RandomState } from '@studio/engine/random/random-state';
import { encodeDescription } from '../description';
import { RectanglesParams } from '../params';
import { encodeSolution } from '../solution';
import { placeClues } from './clues';
import { expandLayout } from './expand';
import { fillWithRandomRects } from './fill';
import { removeSingletons } from './singletons';

/**
 * Generates a Rectangles puzzle: build a random solution first, then
 * choose clues that lead to it. Ported from new_game_desc() in the
 * original; for the same seed it produces exactly the same puzzle.
 */
export function generateRectangles(params: RectanglesParams, random: RandomState): GeneratedPuzzle {
  for (;;) {
    const baseSize = {
      w: shrunkSize(params.w, params.expandFactor),
      h: shrunkSize(params.h, params.expandFactor),
    };

    const base = fillWithRandomRects(baseSize, random); // stage 1
    removeSingletons(base, random); // stage 2
    const layout = expandLayout(base, params, random); // stage 3
    const clues = placeClues(layout, params.unique, random); // stage 4

    if (clues) {
      return { description: encodeDescription(clues), solution: encodeSolution(layout) };
    }
  }
}

/** Size of the grid to generate before stretching (32-bit float maths, as in C). */
function shrunkSize(size: number, expandFactor: number): number {
  const divisor = Math.fround(1 + Math.fround(expandFactor));
  const shrunk = Math.trunc(Math.fround(size / divisor));
  return shrunk < 2 && size >= 2 ? 2 : shrunk;
}
