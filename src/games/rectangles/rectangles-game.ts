import { PuzzleGame } from '@studio/engine/puzzle-game';
import { decodeDescription, validateDescription } from './description';
import { Rect } from './geometry';
import { generateRectangles } from './generator/generate';
import { RectanglesMove, applyMove } from './moves';
import {
  RectanglesParams,
  customFields,
  customParams,
  daily,
  decodeParams,
  defaultParams,
  encodeParams,
  presets,
  validateParams,
} from './params';
import { decodeEdges, edgesToRects } from './solution';
import { solveRectangles } from './solver/solver';
import { RectanglesState } from './state';

/**
 * Rectangles (also known as Shikaku): divide the grid into rectangles so
 * that each contains exactly one number, equal to its area.
 */
export const rectanglesGame: PuzzleGame<RectanglesParams, RectanglesState, RectanglesMove> = {
  id: 'rectangles',
  name: 'Rectangles',

  defaultParams,
  presets,
  encodeParams,
  decodeParams,
  validateParams,
  customFields,
  customParams,

  generate: generateRectangles,
  validateDescription: (params, description) => validateDescription(params.w * params.h, description),

  newGame(params, description) {
    return {
      w: params.w,
      h: params.h,
      clues: decodeDescription(params.w * params.h, description),
      rects: [],
      completed: false,
      cheated: false,
    };
  },

  applyMove,
  isCompleted: (state) => state.completed,
  canShowMistakes: true,
  daily,

  solve(initial, solution) {
    if (solution) {
      const edges = decodeEdges(initial, solution);
      return edges ? { kind: 'solve', rects: edgesToRects(initial, edges) } : null;
    }

    // No stored solution (e.g. a puzzle typed in by hand): use the solver.
    const numbers: { area: number; points: { x: number; y: number }[] }[] = [];
    initial.clues.forEach((area, i) => {
      if (area) numbers.push({ area, points: [{ x: i % initial.w, y: Math.floor(i / initial.w) }] });
    });
    const { result, placements } = solveRectangles(initial, numbers);
    if (result !== 'solved') return null;
    return { kind: 'solve', rects: placements.filter((r): r is Rect => r !== null) };
  },
};
