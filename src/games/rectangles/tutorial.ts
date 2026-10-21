import { Tutorial } from '@studio/engine/tutorial';
import { encodeDescription } from './description';
import { Rect } from './geometry';
import { RectanglesMove } from './moves';
import { RectanglesParams, defaultParams } from './params';
import { RectanglesState } from './state';

/** Guidance on the board: a rectangle to draw (drag) or remove (tap), with an optional note. */
export interface RectanglesHint {
  rect: Rect;
  gesture: 'drag' | 'tap';
  note?: string;
}

/**
 * The tutorial puzzle, with a unique solution:
 *
 *     3 · · 3      A A A C        A = 3 across the top
 *     · · · ·      B B D C        B = 2×2 square on the 4
 *     · 4 2 ·      B B D C        C = 3 down the right
 *     4 · · ·      E E E E        D = 2 down, E = bottom row
 */
// prettier-ignore
const CLUES = [
  3, 0, 0, 3,
  0, 0, 0, 0,
  0, 4, 2, 0,
  4, 0, 0, 0,
];

const BOTTOM_ROW: Rect = { x: 0, y: 3, w: 4, h: 1 };
/** A deliberate mistake: a 2×2 (4 cells) on the 3. */
const SQUARE_ON_THREE: Rect = { x: 0, y: 0, w: 2, h: 2 };
const SQUARE_ON_FOUR: Rect = { x: 0, y: 1, w: 2, h: 2 };

const drawing = (r: Rect) => (move: RectanglesMove) => move.kind === 'draw' && sameRect(move.rect, r);
const tapping = (r: Rect) => (move: RectanglesMove) => move.kind === 'erase' && contains(r, move.rect);
const has = (r: Rect) => (state: RectanglesState) => state.rects.some((d) => sameRect(d, r));

/**
 * Teaches by doing, one action per step, with no text to read beyond a
 * short note on the board: draw a rectangle, draw a wrong one, remove it,
 * draw another, then finish the puzzle alone.
 */
export const rectanglesTutorial: Tutorial<RectanglesParams, RectanglesState, RectanglesMove, RectanglesHint> = {
  params: { ...defaultParams(), w: 4, h: 4 },
  description: encodeDescription(CLUES),
  steps: [
    {
      text:
        'Cover every cell with rectangles. Each rectangle holds exactly one number, ' +
        'and covers that many cells. The only way to fit the bottom 4 is the bottom row. ' +
        'Drag along it.',
      hint: { rect: BOTTOM_ROW, gesture: 'drag' },
      expect: drawing(BOTTOM_ROW),
      done: has(BOTTOM_ROW),
    },
    {
      text: 'Now try drawing a 2 × 2 square on the 3.',
      hint: { rect: SQUARE_ON_THREE, gesture: 'drag' },
      expect: drawing(SQUARE_ON_THREE),
      done: has(SQUARE_ON_THREE),
    },
    {
      text: 'That square covers 4 cells, but its number is 3, so it doesn’t fit. Tap it to remove it.',
      hint: { rect: SQUARE_ON_THREE, gesture: 'tap', note: '4 cells, not 3' },
      expect: tapping(SQUARE_ON_THREE),
      done: (state) => !has(SQUARE_ON_THREE)(state),
    },
    {
      text:
        'The other 4 needs 4 cells too. A column would cut into the bottom row, ' +
        'and a row would also cover the 2. So it must be this 2 × 2. Draw it.',
      hint: { rect: SQUARE_ON_FOUR, gesture: 'drag' },
      expect: drawing(SQUARE_ON_FOUR),
      done: has(SQUARE_ON_FOUR),
    },
    {
      text: 'Now finish the puzzle yourself.',
      done: (state) => state.completed,
    },
  ],
};

function sameRect(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

function contains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}
