import { RandomState } from '@studio/engine/random/random-state';
import { Size } from '../geometry';
import { Layout, cellAt } from './layout';

/**
 * Stage 3: stretches a layout to the target size. The grid is stretched
 * vertically, transposed, stretched vertically again (which stretches the
 * original width) and transposed back.
 *
 * When the layout is already the target size this changes nothing, but it
 * still draws from the random sequence exactly as the original does, which
 * keeps seeds compatible.
 */
export function expandLayout(layout: Layout, target: Size, random: RandomState): Layout {
  let current = layout;
  let targetHeight = target.h;
  let targetWidth = target.w;

  for (let pass = 0; pass < 2; pass++) {
    const stretched = stretchVertically(current, targetHeight, random);
    current = transpose(stretched);
    [targetHeight, targetWidth] = [targetWidth, targetHeight];
  }
  return current;
}

function stretchVertically(grid: Layout, newHeight: number, random: RandomState): Layout {
  const { w, h } = grid;
  const out: Layout = { w, h: newHeight, cells: new Int32Array(w * newHeight) };
  const at = (x: number, y: number) => out.cells[y * w + x];
  const set = (x: number, y: number, value: number) => (out.cells[y * w + x] = value);

  // Decide how many new rows to insert after each existing row.
  const extraRows = new Int32Array(Math.max(h - 1, 0));
  for (let y = h; y < newHeight; y++) extraRows[random.upto(h - 1)]++;

  let y2 = 0;
  let rowStart = 0;
  for (let y = 0; y < h; y++) {
    // Copy row y. A rectangle starting on this row gets a new id unless it
    // already started in an inserted row above.
    for (let x = 0; x < w; x++) {
      const id = cellAt(grid, x, y);
      const startsHere = Math.floor(id / w) === y;
      if (startsHere && (y2 === 0 || Math.floor(at(x, y2 - 1) / w) < rowStart)) {
        set(x, y2, y2 * w + (id % w));
      } else {
        set(x, y2, at(x, y2 - 1));
      }
    }
    if (++y2 === newHeight) break;
    rowStart = y2;

    // Each horizontal edge below row y moves to a random one of the new
    // rows. Adjacent edge segments of the same pair of rectangles move
    // together.
    const edgeRow = new Int32Array(w);
    let chosen = -1;
    for (let x = 0; x < w; x++) {
      if (cellAt(grid, x, y) !== cellAt(grid, x, y + 1)) {
        const continuesEdge =
          x > 0 &&
          (cellAt(grid, x - 1, y) === cellAt(grid, x, y) ||
            cellAt(grid, x - 1, y + 1) === cellAt(grid, x, y + 1));
        if (!continuesEdge) chosen = random.upto(extraRows[y] + 1);
      } else {
        chosen = -1;
      }
      edgeRow[x] = chosen;
    }

    // Insert the new rows: each cell continues the rectangle above it,
    // unless the edge was moved here, in which case the rectangle below
    // starts here.
    for (let inserted = 0; inserted < extraRows[y]; inserted++) {
      for (let x = 0; x < w; x++) {
        if (inserted === edgeRow[x]) {
          set(x, y2, y2 * w + (cellAt(grid, x, y + 1) % w));
        } else {
          set(x, y2, at(x, y2 - 1));
        }
      }
      y2++;
    }
  }
  return out;
}

/** Swaps rows and columns, renumbering rectangle ids to match. */
function transpose(grid: Layout): Layout {
  const out: Layout = { w: grid.h, h: grid.w, cells: new Int32Array(grid.w * grid.h) };
  for (let x = 0; x < out.w; x++) {
    for (let y = 0; y < out.h; y++) {
      const id = cellAt(grid, y, x);
      out.cells[y * out.w + x] = (id % grid.w) * out.w + Math.floor(id / grid.w);
    }
  }
  return out;
}
