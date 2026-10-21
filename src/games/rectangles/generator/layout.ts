import { Rect, Size } from '../geometry';

/** Marks a cell not yet covered by any rectangle. */
export const EMPTY = -1;
/** Marks a cell that no rectangle can cover (a 1×1 "singleton"). */
export const SINGLETON = -2;

/**
 * A grid being divided into rectangles while a puzzle is generated. Each
 * covered cell holds the cell index (y * w + x) of the top-left corner of
 * its rectangle, so cells with equal values belong to the same rectangle.
 */
export interface Layout extends Size {
  cells: Int32Array;
}

export function emptyLayout(size: Size): Layout {
  return { w: size.w, h: size.h, cells: new Int32Array(size.w * size.h).fill(EMPTY) };
}

export function cellAt(layout: Layout, x: number, y: number): number {
  return layout.cells[y * layout.w + x];
}

export function placeRect(layout: Layout, r: Rect): void {
  const id = r.y * layout.w + r.x;
  for (let x = r.x; x < r.x + r.w; x++) {
    for (let y = r.y; y < r.y + r.h; y++) layout.cells[y * layout.w + x] = id;
  }
}

/** Returns the rectangle covering (x, y); an uncovered cell counts as 1×1. */
export function findRect(layout: Layout, x: number, y: number): Rect {
  const id = cellAt(layout, x, y);
  if (id < 0) return { x, y, w: 1, h: 1 };

  const top = Math.floor(id / layout.w);
  const left = id % layout.w;
  let w = 1;
  while (left + w < layout.w && cellAt(layout, left + w, top) === id) w++;
  let h = 1;
  while (top + h < layout.h && cellAt(layout, left, top + h) === id) h++;
  return { x: left, y: top, w, h };
}

/**
 * Lists every rectangle that could be placed covering the empty cell
 * (sx, sy) without overlapping anything already placed, in the same order
 * as the original's enum_rects() so random choices match.
 *
 * Rectangles are limited to 1/6 of the grid area (minimum 2), are never
 * 1×1, and avoid spanning the full width or height of the grid.
 */
export function candidateRects(layout: Layout, sx: number, sy: number): Rect[] {
  const { w, h } = layout;
  const maxArea = Math.max(Math.floor((w * h) / 6), 2);

  // For each column, find how far up (top) and down (bottom) a rectangle
  // containing (sx, sy) could extend while staying on empty cells.
  const top = new Int32Array(w);
  const bottom = new Int32Array(w);
  for (let dy = -1; dy <= 1; dy += 2) {
    const limit = dy === -1 ? top : bottom;
    for (let dx = -1; dx <= 1; dx += 2) {
      for (let x = sx; x >= 0 && x < w; x += dx) {
        limit[x] = -2 * h * dy;
        for (let y = sy; y >= 0 && y < h; y += dy) {
          if (cellAt(layout, x, y) === EMPTY && (x === sx || dy * y <= dy * limit[x - dx])) {
            limit[x] = y;
          } else {
            break;
          }
        }
      }
    }
  }

  // The largest rectangle that fits in that region caps the search below.
  let realMaxArea = 0;
  for (let x = 0; x < w; x++) {
    const rh = bottom[x] - top[x] + 1;
    if (rh <= 0) continue;
    const dx = x > sx ? -1 : 1;
    let x2 = x;
    while (x2 >= 0 && x2 < w && bottom[x2] >= bottom[x] && top[x2] <= top[x]) x2 += dx;
    realMaxArea = Math.max(realMaxArea, Math.abs(x2 - x) * rh);
  }
  realMaxArea = Math.min(realMaxArea, maxArea);

  // Full-width/height rectangles are boring, except on tiny grids.
  const maxW = w - 1 < 3 ? w : w - 1;
  const maxH = h - 1 < 3 ? h : h - 1;

  const found: Rect[] = [];
  for (let rw = 1; rw <= maxW; rw++) {
    for (let rh = 1; rh <= maxH; rh++) {
      if (rw * rh > realMaxArea || rw * rh === 1) continue;
      for (let x = Math.max(sx - rw + 1, 0); x <= Math.min(sx, w - rw); x++) {
        for (let y = Math.max(sy - rh + 1, 0); y <= Math.min(sy, h - rh); y++) {
          const fits =
            top[x] <= y &&
            top[x + rw - 1] <= y &&
            bottom[x] >= y + rh - 1 &&
            bottom[x + rw - 1] >= y + rh - 1;
          if (fits) found.push({ x, y, w: rw, h: rh });
        }
      }
    }
  }
  return found;
}
