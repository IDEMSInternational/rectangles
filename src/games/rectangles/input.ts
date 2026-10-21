import { Point, Rect, Size } from './geometry';
import { RectanglesMove } from './moves';

/** The cell under a position given in cells (e.g. 2.4, 0.9), clamped to the board. */
export function cellAt(size: Size, cellX: number, cellY: number): Point {
  return {
    x: Math.min(Math.max(Math.floor(cellX), 0), size.w - 1),
    y: Math.min(Math.max(Math.floor(cellY), 0), size.h - 1),
  };
}

/**
 * One touch on the board. Dragging from cell to cell draws the rectangle
 * spanning them; a tap (no movement) removes the rectangle under it.
 */
export class RectanglesDrag {
  private readonly start: Point;
  private end: Point;
  private moved = false;

  constructor(start: Point) {
    this.start = start;
    this.end = start;
  }

  moveTo(cell: Point): void {
    if (cell.x === this.end.x && cell.y === this.end.y) return;
    this.end = cell;
    this.moved = true;
  }

  /** The rectangle covering the start and end cells. */
  get rect(): Rect {
    const x = Math.min(this.start.x, this.end.x);
    const y = Math.min(this.start.y, this.end.y);
    return {
      x,
      y,
      w: Math.max(this.start.x, this.end.x) - x + 1,
      h: Math.max(this.start.y, this.end.y) - y + 1,
    };
  }

  /** Whether the touch has left its starting cell, making it a drag. */
  get isRectangle(): boolean {
    return this.moved;
  }

  /** The move this touch makes when released. */
  finish(): RectanglesMove {
    return this.moved ? { kind: 'draw', rect: this.rect } : { kind: 'erase', rect: this.rect };
  }
}
