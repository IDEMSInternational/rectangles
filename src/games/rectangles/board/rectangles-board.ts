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
import { BoardFinger } from '@studio/container/board-finger';
import { placeLabel } from '@studio/container/board-label';
import { BoardLabelView } from '@studio/container/board-label-view';
import { BoardPointer } from '@studio/container/board-pointer';
import { squareAt } from '@studio/engine/geometry';
import { Rect } from '../geometry';
import { RectanglesDrag } from '../input';
import { RectanglesMove } from '../moves';
import { RectanglesState, breaksRules } from '../state';
import { RectanglesHint } from '../tutorial';

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Gap (in cells) between a drawn rectangle and the cell lines around it. */
const INSET = 0.07;

/** Board for Rectangles, drawn as SVG in cell units. Emits moves; never changes state itself. */
@Component({
  selector: 'rectangles-board',
  imports: [BoardFinger, BoardLabelView],
  templateUrl: './rectangles-board.html',
  styleUrl: './rectangles-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RectanglesBoard {
  readonly state = input.required<RectanglesState>();
  /** Tutorial guidance: highlights a rectangle and animates the gesture. */
  readonly hint = input<RectanglesHint | null>(null);
  /** Lock: new rectangles may not be drawn over existing ones. */
  readonly locked = input(false);
  /** Show mistakes: rule-breaking rectangles are drawn in red. */
  readonly showMistakes = input(false);
  readonly move = output<RectanglesMove>();

  private readonly svg = viewChild.required<ElementRef<SVGSVGElement>>('svg');
  /** The finger on the board, given as the cell under it. */
  private readonly pointer = new BoardPointer<RectanglesDrag>(
    () => this.svg().nativeElement,
    (at) => squareAt(this.state(), at.x, at.y),
  );
  /** The rectangle being drawn, while a drag is in progress, and whether Lock blocks it. */
  protected readonly preview = signal<{ rect: Rect; blocked: boolean } | null>(null);

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

  protected readonly tiles = computed(() => {
    const state = this.state();
    const showMistakes = this.showMistakes();
    return state.rects.map((r) => ({ ...inset(r), wrong: showMistakes && breaksRules(state, r) }));
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
      // The finger draws the rectangle corner to corner, or taps its middle.
      along: hint.gesture === 'drag' ? [start, end] : null,
      tap: hint.gesture === 'drag' ? null : { x: r.x + r.w / 2, y: r.y + r.h / 2 },
    };
  });

  protected readonly previewTile = computed(() => {
    const p = this.preview();
    return p && { ...inset(p.rect), blocked: p.blocked };
  });

  /** Label showing the size of the rectangle being drawn, e.g. "3 × 2", or that Lock blocks it. */
  protected readonly sizeLabel = computed(() => {
    const p = this.preview();
    if (!p) return null;
    const text = p.blocked ? 'Locked' : `${p.rect.w} × ${p.rect.h}`;
    return { ...placeLabel(text, p.rect, this.state()), blocked: p.blocked };
  });

  /** A tutorial note about the hinted rectangle, e.g. "4 cells, not 3". */
  protected readonly noteLabel = computed(() => {
    const hint = this.hint();
    if (!hint?.note || this.preview()) return null;
    return placeLabel(hint.note, hint.rect, this.state());
  });

  protected onPointerDown(event: PointerEvent): void {
    this.pointer.down(event, (cell) => new RectanglesDrag(cell));
  }

  protected onPointerMove(event: PointerEvent): void {
    const drag = this.pointer.move(event);
    if (drag?.isRectangle) {
      this.preview.set({ rect: drag.rect, blocked: drag.isBlocked(this.state(), this.locked()) });
    }
  }

  protected onPointerUp(event: PointerEvent): void {
    const move = this.pointer.up(event)?.finish(this.state(), this.locked());
    this.cancelDrag();
    if (move) this.move.emit(move);
  }

  protected cancelDrag(): void {
    this.pointer.cancel();
    this.preview.set(null);
  }
}

function inset(r: Rect): Rect {
  return { x: r.x + INSET, y: r.y + INSET, w: r.w - 2 * INSET, h: r.h - 2 * INSET };
}
