import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { placeLabel } from '@studio/container/board-label';
import { Rect } from '../geometry';
import { RectanglesDrag, cellAt } from '../input';
import { RectanglesMove } from '../moves';
import { RectanglesState } from '../state';
import { RectanglesHint } from '../tutorial';
import { TileColours } from './tile-colours';

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Gap (in cells) between a drawn rectangle and the cell lines around it. */
const INSET = 0.07;
/** Number of tile colours defined in the theme (--tile-0 ... --tile-5). */
const TILE_COLOURS = 6;

/** Board for Rectangles, drawn as SVG in cell units. Emits moves; never changes state itself. */
@Component({
  selector: 'rectangles-board',
  templateUrl: './rectangles-board.html',
  styleUrl: './rectangles-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RectanglesBoard {
  readonly state = input.required<RectanglesState>();
  /** Tutorial guidance: highlights a rectangle and animates the gesture. */
  readonly hint = input<RectanglesHint | null>(null);
  readonly move = output<RectanglesMove>();

  private readonly svg = viewChild.required<ElementRef<SVGSVGElement>>('svg');
  private drag: RectanglesDrag | null = null;
  /** The rectangle being drawn, while a drag is in progress. */
  protected readonly preview = signal<Rect | null>(null);

  protected readonly viewBox = computed(() => {
    const { w, h } = this.state();
    return `-0.1 -0.1 ${w + 0.2} ${h + 0.2}`;
  });

  protected readonly gridLines = computed(() => {
    const { w, h } = this.state();
    const lines: Segment[] = [];
    for (let x = 1; x < w; x++) lines.push({ x1: x, y1: 0, x2: x, y2: h });
    for (let y = 1; y < h; y++) lines.push({ x1: 0, y1: y, x2: w, y2: y });
    return lines;
  });

  private readonly colours = new TileColours(TILE_COLOURS);
  private coloursFor: Int32Array | null = null;

  protected readonly tiles = computed(() => {
    const { clues, rects } = this.state();
    if (clues !== this.coloursFor) {
      this.colours.reset(); // a new puzzle
      this.coloursFor = clues;
    }
    const colours = this.colours.coloursFor(rects);
    return rects.map((r, i) => ({ ...inset(r), colour: colours[i] }));
  });

  protected readonly clues = computed(() => {
    const { w, clues } = this.state();
    const list: { x: number; y: number; value: number }[] = [];
    clues.forEach((value, i) => {
      if (value) list.push({ x: (i % w) + 0.5, y: Math.floor(i / w) + 0.53, value });
    });
    return list;
  });

  /** Hint outline, plus the path of the animated finger (from its first cell to its last). */
  protected readonly hintView = computed(() => {
    const hint = this.hint();
    if (!hint) return null;
    const r = hint.rect;
    const start = { x: r.x + 0.5, y: r.y + 0.5 };
    const end = { x: r.x + r.w - 0.5, y: r.y + r.h - 0.5 };
    return {
      tile: inset(r),
      gesture: hint.gesture,
      centre: { x: r.x + r.w / 2, y: r.y + r.h / 2 },
      path: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
    };
  });

  protected readonly previewTile = computed(() => {
    const r = this.preview();
    return r && inset(r);
  });

  /** Label showing the size of the rectangle being drawn, e.g. "3 × 2". */
  protected readonly sizeLabel = computed(() => {
    const r = this.preview();
    return r && placeLabel(`${r.w} × ${r.h}`, r, this.state());
  });

  /** A tutorial note about the hinted rectangle, e.g. "4 cells, not 3". */
  protected readonly noteLabel = computed(() => {
    const hint = this.hint();
    if (!hint?.note || this.preview()) return null;
    return placeLabel(hint.note, hint.rect, this.state());
  });

  protected onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    this.svg().nativeElement.setPointerCapture(event.pointerId);
    this.drag = new RectanglesDrag(this.cellUnder(event));
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.drag) return;
    this.drag.moveTo(this.cellUnder(event));
    if (this.drag.isRectangle) this.preview.set(this.drag.rect);
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.drag) return;
    this.drag.moveTo(this.cellUnder(event));
    const move = this.drag.finish();
    this.cancelDrag();
    this.move.emit(move);
  }

  protected cancelDrag(): void {
    this.drag = null;
    this.preview.set(null);
  }

  private cellUnder(event: PointerEvent) {
    const matrix = this.svg().nativeElement.getScreenCTM()?.inverse();
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
    return cellAt(this.state(), p.x, p.y);
  }
}

function inset(r: Rect): Rect {
  return { x: r.x + INSET, y: r.y + INSET, w: r.w - 2 * INSET, h: r.h - 2 * INSET };
}
