import { RandomState } from '@studio/engine/random/random-state';
import { Size } from '../geometry';
import { EMPTY, Layout, SINGLETON, candidateRects, emptyLayout, placeRect } from './layout';

/**
 * Stage 1: covers the grid with random rectangles. Repeatedly picks a
 * random uncovered cell and a random rectangle that fits over it. Cells
 * that no rectangle fits are left as singletons for stage 2 to fix.
 */
export function fillWithRandomRects(size: Size, random: RandomState): Layout {
  const layout = emptyLayout(size);
  let remaining = size.w * size.h;

  while (remaining > 0) {
    const [x, y] = nthEmptyCell(layout, random.upto(remaining));
    const candidates = candidateRects(layout, x, y);

    if (candidates.length === 0) {
      layout.cells[y * layout.w + x] = SINGLETON;
      remaining--;
    } else {
      const r = candidates[random.upto(candidates.length)];
      placeRect(layout, r);
      remaining -= r.w * r.h;
    }
  }
  return layout;
}

/** Returns the coordinates of the nth empty cell, counting row by row. */
function nthEmptyCell(layout: Layout, n: number): [number, number] {
  for (let y = 0; y < layout.h; y++) {
    for (let x = 0; x < layout.w; x++) {
      if (layout.cells[y * layout.w + x] === EMPTY && n-- === 0) return [x, y];
    }
  }
  throw new Error('fewer empty cells than expected');
}
