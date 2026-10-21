import { RandomState } from '@studio/engine/random/random-state';
import { Rect } from '../geometry';
import { Layout, cellAt, findRect, placeRect } from './layout';

const RIGHT = 1;
const UP = 2;
const LEFT = 4;
const DOWN = 8;

/**
 * Stage 2: removes the 1×1 singletons left by stage 1 (they would make
 * dull "1" clues) by merging each into a neighbouring rectangle.
 *
 *     +-----+-----+    Usually a neighbouring rectangle can be shaved:
 *     |     |     |    the singleton grows a 1×n strip in that
 *     +--+--+-----+    direction, taking one row/column from the
 *     |  |  |     |    neighbour (or the whole neighbour, if 1 wide).
 *     |  +--+     |
 *     |  |  |     |    If every neighbour is a 2×1 lying the wrong way,
 *     +--+--+-----+    the whole 3×3 block around it becomes one rectangle.
 */
export function removeSingletons(layout: Layout, random: RandomState): void {
  // Column by column, as in the original, so random choices match.
  for (let x = 0; x < layout.w; x++) {
    for (let y = 0; y < layout.h; y++) {
      if (cellAt(layout, x, y) >= 0) continue;

      const directions = possibleDirections(layout, x, y);
      if (directions.length > 0) {
        const direction = directions[random.upto(directions.length)];
        extendSingleton(layout, x, y, direction);
      } else {
        placeRect(layout, { x: x - 1, y: y - 1, w: 3, h: 3 });
      }
    }
  }
}

/**
 * A singleton can take over part of a neighbour if it sits at one end of
 * the edge it shares with that neighbour (and the neighbour isn't a 2×1
 * lying the wrong way), or if the neighbour is only one cell thick.
 */
function possibleDirections(layout: Layout, x: number, y: number): number[] {
  const directions: number[] = [];
  if (x < layout.w - 1) {
    const r = findRect(layout, x + 1, y);
    if ((r.w * r.h > 2 && (r.y === y || r.y + r.h - 1 === y)) || r.h === 1) directions.push(RIGHT);
  }
  if (y > 0) {
    const r = findRect(layout, x, y - 1);
    if ((r.w * r.h > 2 && (r.x === x || r.x + r.w - 1 === x)) || r.w === 1) directions.push(UP);
  }
  if (x > 0) {
    const r = findRect(layout, x - 1, y);
    if ((r.w * r.h > 2 && (r.y === y || r.y + r.h - 1 === y)) || r.h === 1) directions.push(LEFT);
  }
  if (y < layout.h - 1) {
    const r = findRect(layout, x, y + 1);
    if ((r.w * r.h > 2 && (r.x === x || r.x + r.w - 1 === x)) || r.w === 1) directions.push(DOWN);
  }
  return directions;
}

/** Grows the singleton into a strip across the neighbour, shaving the neighbour. */
function extendSingleton(layout: Layout, x: number, y: number, direction: number): void {
  let neighbour: Rect;
  let strip: Rect;

  if (direction === RIGHT || direction === LEFT) {
    neighbour = findRect(layout, direction === RIGHT ? x + 1 : x - 1, y);
    strip = { x: direction === RIGHT ? x : neighbour.x, y, w: neighbour.w + 1, h: 1 };
    if (neighbour.y === y) neighbour.y++;
    neighbour.h--;
  } else {
    neighbour = findRect(layout, x, direction === UP ? y - 1 : y + 1);
    strip = { x, y: direction === UP ? neighbour.y : y, w: 1, h: neighbour.h + 1 };
    if (neighbour.x === x) neighbour.x++;
    neighbour.w--;
  }

  if (neighbour.w > 0 && neighbour.h > 0) placeRect(layout, neighbour);
  placeRect(layout, strip);
}
