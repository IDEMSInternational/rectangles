/** Basic shapes shared by the Rectangles modules. Coordinates are in cells. */

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Size {
  w: number;
  h: number;
}

export function rectContains(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

/** Calls `visit` for every cell in `r`, row by row. */
export function forEachCell(r: Rect, visit: (x: number, y: number) => void): void {
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) visit(x, y);
  }
}
