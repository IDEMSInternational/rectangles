import { RandomState } from '@studio/engine/random/random-state';
import { forEachCell } from '../geometry';
import { NumberCandidates, solveRectangles } from '../solver/solver';
import { Layout, findRect } from './layout';

/**
 * Stage 4: writes each rectangle's area in one of its cells. Where the
 * number goes matters: some positions allow more than one solution. With
 * `unique`, the solver narrows each number down to positions that force a
 * unique solution. Returns the clue grid (0 = no clue), or null if no
 * unique placement exists and the generator should start again.
 */
export function placeClues(layout: Layout, unique: boolean, random: RandomState): Int32Array | null {
  const numbers: NumberCandidates[] = [];
  for (let y = 0; y < layout.h; y++) {
    for (let x = 0; x < layout.w; x++) {
      const id = y * layout.w + x;
      if (layout.cells[id] !== id) continue; // not a rectangle's top-left cell
      const r = findRect(layout, x, y);
      const points: { x: number; y: number }[] = [];
      forEachCell(r, (px, py) => points.push({ x: px, y: py }));
      numbers.push({ area: r.w * r.h, points });
    }
  }

  if (unique && solveRectangles(layout, numbers, random).result !== 'solved') return null;

  const clues = new Int32Array(layout.w * layout.h);
  for (const num of numbers) {
    const p = num.points[random.upto(num.points.length)];
    clues[p.y * layout.w + p.x] = num.area;
  }
  return clues;
}
