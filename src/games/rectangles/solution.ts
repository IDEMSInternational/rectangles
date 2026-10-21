import { Rect, Size } from './geometry';
import { Layout, cellAt } from './generator/layout';

/**
 * Solutions are stored as the lines between rectangles, in the same text
 * format as the original collection; these helpers convert to rectangles.
 */

/** The lines on a board. Both arrays are indexed y * w + x. */
export interface Edges {
  /** vertical[i] = 1: line on the left side of cell i (x from 1 to w-1). */
  vertical: Uint8Array;
  /** horizontal[i] = 1: line on the top side of cell i (y from 1 to h-1). */
  horizontal: Uint8Array;
}

export function noEdges(size: Size): Edges {
  return { vertical: new Uint8Array(size.w * size.h), horizontal: new Uint8Array(size.w * size.h) };
}

/** Edges between differing rectangles of a generated layout. */
export function layoutEdges(layout: Layout): Edges {
  const edges = noEdges(layout);
  for (let y = 0; y < layout.h; y++) {
    for (let x = 0; x < layout.w; x++) {
      const i = y * layout.w + x;
      if (x > 0) edges.vertical[i] = cellAt(layout, x, y) !== cellAt(layout, x - 1, y) ? 1 : 0;
      if (y > 0) edges.horizontal[i] = cellAt(layout, x, y) !== cellAt(layout, x, y - 1) ? 1 : 0;
    }
  }
  return edges;
}

/**
 * Text form of a solution, compatible with the original: "S", then a 0/1
 * for each inner vertical edge row by row, then each inner horizontal edge.
 */
export function encodeSolution(layout: Layout): string {
  return encodeEdges(layout, layoutEdges(layout));
}

export function encodeEdges(size: Size, edges: Edges): string {
  let text = 'S';
  for (let y = 0; y < size.h; y++) {
    for (let x = 1; x < size.w; x++) text += edges.vertical[y * size.w + x] ? '1' : '0';
  }
  for (let y = 1; y < size.h; y++) {
    for (let x = 0; x < size.w; x++) text += edges.horizontal[y * size.w + x] ? '1' : '0';
  }
  return text;
}

/** The lines around a set of rectangles. */
export function rectsToEdges(size: Size, rects: readonly Rect[]): Edges {
  const edges = noEdges(size);
  for (const r of rects) {
    for (let y = r.y; y < r.y + r.h; y++) {
      if (r.x > 0) edges.vertical[y * size.w + r.x] = 1;
      if (r.x + r.w < size.w) edges.vertical[y * size.w + r.x + r.w] = 1;
    }
    for (let x = r.x; x < r.x + r.w; x++) {
      if (r.y > 0) edges.horizontal[r.y * size.w + x] = 1;
      if (r.y + r.h < size.h) edges.horizontal[(r.y + r.h) * size.w + x] = 1;
    }
  }
  return edges;
}

/** The rectangles enclosed by a complete set of lines, such as a solution's. */
export function edgesToRects(size: Size, edges: Edges): Rect[] {
  const taken = new Uint8Array(size.w * size.h);
  const rects: Rect[] = [];
  for (let y = 0; y < size.h; y++) {
    for (let x = 0; x < size.w; x++) {
      if (taken[y * size.w + x]) continue;
      let w = 1;
      while (x + w < size.w && !edges.vertical[y * size.w + x + w]) w++;
      let h = 1;
      while (y + h < size.h && !edges.horizontal[(y + h) * size.w + x]) h++;
      for (let yy = y; yy < y + h; yy++) taken.fill(1, yy * size.w + x, yy * size.w + x + w);
      rects.push({ x, y, w, h });
    }
  }
  return rects;
}

/** Reads a solution string; returns null if it isn't one. */
export function decodeEdges(size: Size, text: string): Edges | null {
  const expected = 1 + (size.w - 1) * size.h + (size.h - 1) * size.w;
  if (text.length !== expected || !/^S[01]*$/.test(text)) return null;

  const edges = noEdges(size);
  let p = 1;
  for (let y = 0; y < size.h; y++) {
    for (let x = 1; x < size.w; x++) edges.vertical[y * size.w + x] = text[p++] === '1' ? 1 : 0;
  }
  for (let y = 1; y < size.h; y++) {
    for (let x = 0; x < size.w; x++) edges.horizontal[y * size.w + x] = text[p++] === '1' ? 1 : 0;
  }
  return edges;
}
