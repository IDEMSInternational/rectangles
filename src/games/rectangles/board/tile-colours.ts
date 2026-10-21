import { Rect } from '../geometry';

/**
 * Chooses a palette colour for each drawn rectangle. A rectangle keeps its
 * colour for as long as it exists (including through undo and redo), and a
 * new rectangle gets a colour that none of the rectangles touching it have
 * (when the palette allows), cycling through the palette for variety.
 */
export class TileColours {
  private readonly paletteSize: number;
  private readonly assigned = new Map<string, number>();
  private next = 0;

  constructor(paletteSize: number) {
    this.paletteSize = paletteSize;
  }

  /** Forgets all assignments, e.g. when a new puzzle starts. */
  reset(): void {
    this.assigned.clear();
    this.next = 0;
  }

  /** Returns the colour index of each rectangle, in order. */
  coloursFor(rects: readonly Rect[]): number[] {
    return rects.map((r) => {
      const key = `${r.x},${r.y},${r.w},${r.h}`;
      let colour = this.assigned.get(key);
      if (colour === undefined) {
        colour = this.pick(rects.filter((other) => other !== r && touches(r, other)));
        this.assigned.set(key, colour);
      }
      return colour;
    });
  }

  private pick(neighbours: readonly Rect[]): number {
    const used = new Set(neighbours.map((n) => this.assigned.get(`${n.x},${n.y},${n.w},${n.h}`)));
    for (let i = 0; i < this.paletteSize; i++) {
      const colour = (this.next + i) % this.paletteSize;
      if (!used.has(colour)) {
        this.next = (colour + 1) % this.paletteSize;
        return colour;
      }
    }
    const colour = this.next;
    this.next = (colour + 1) % this.paletteSize;
    return colour;
  }
}

/** True if the rectangles share an edge or a corner. */
function touches(a: Rect, b: Rect): boolean {
  return a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
}
