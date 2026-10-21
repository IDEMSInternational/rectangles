import { Rect } from './geometry';
import { RectanglesState, isSolved, rectsOverlap } from './state';

export type RectanglesMove =
  /** Add a rectangle, removing any drawn rectangles it overlaps. */
  | { kind: 'draw'; rect: Rect }
  /** Remove every drawn rectangle that overlaps this area. */
  | { kind: 'erase'; rect: Rect }
  /** Replace the drawn rectangles with the solution (marks the game as cheated). */
  | { kind: 'solve'; rects: readonly Rect[] };

/** Applies a move, returning a new state, or null if the move is invalid or changes nothing. */
export function applyMove(state: RectanglesState, move: RectanglesMove): RectanglesState | null {
  let rects: readonly Rect[];
  switch (move.kind) {
    case 'draw': {
      const r = move.rect;
      if (!insideBoard(state, r) || state.rects.some((d) => sameRect(d, r))) return null;
      rects = [...state.rects.filter((d) => !rectsOverlap(d, r)), r];
      break;
    }
    case 'erase':
      rects = state.rects.filter((d) => !rectsOverlap(d, move.rect));
      if (rects.length === state.rects.length) return null;
      break;
    case 'solve':
      rects = move.rects;
      break;
  }

  return {
    ...state,
    rects,
    completed: state.completed || isSolved({ ...state, rects }),
    cheated: state.cheated || move.kind === 'solve',
  };
}

function insideBoard(state: RectanglesState, r: Rect): boolean {
  return r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0 && r.x + r.w <= state.w && r.y + r.h <= state.h;
}

function sameRect(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}
