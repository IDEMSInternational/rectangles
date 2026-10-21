import { RandomState } from '@studio/engine/random/random-state';
import { Point, Rect, Size, forEachCell, rectContains } from '../geometry';

/**
 * One clue number and the cells where it might be. When solving a real
 * puzzle each number has one known position; when generating, it starts
 * with every cell of its intended rectangle and the solver narrows them.
 * The solver removes entries from `points` as it rules them out.
 */
export interface NumberCandidates {
  area: number;
  points: Point[];
}

export type SolverResult = 'solved' | 'ambiguous' | 'inconsistent';

export interface SolverOutput {
  result: SolverResult;
  /** For each number, its rectangle if exactly one placement remains. */
  placements: (Rect | null)[];
}

/** Overlap marker: this cell is known to belong to a different rectangle. */
const KNOWN_OTHER = -1;
/** Overlap marker: this cell is known to belong to this rectangle. */
const KNOWN_MINE = -2;

/**
 * Solves a Rectangles puzzle by deduction, porting rect_solver() from the
 * original. Each number keeps a list of rectangle placements that are
 * still possible; deductions rule placements out until each number has one.
 *
 * If `random` is given, the solver is being used by the generator: when
 * deduction gets stuck, it narrows down where a number may go (rather than
 * giving up), so the generator learns where to put clues for a unique
 * solution. Without `random` it is a plain solver.
 */
export function solveRectangles(
  size: Size,
  numbers: NumberCandidates[],
  random?: RandomState,
): SolverOutput {
  return new SolverRun(size, numbers).run(random);
}

class SolverRun {
  private readonly w: number;
  private readonly h: number;
  private readonly numbers: NumberCandidates[];
  /** Possible placements for each number's rectangle. */
  private readonly positions: Rect[][];
  /**
   * overlaps[(n * h + y) * w + x]: how many of number n's placements cover
   * (x, y), or KNOWN_OTHER / KNOWN_MINE once the cell is decided.
   */
  private readonly overlaps: Int32Array;
  /** For each cell, the number that might be written there, or -1. */
  private readonly numberAt: Int32Array;

  constructor(size: Size, numbers: NumberCandidates[]) {
    this.w = size.w;
    this.h = size.h;
    this.numbers = numbers;
    this.positions = numbers.map((n) => this.initialPlacements(n));

    this.overlaps = new Int32Array(numbers.length * this.w * this.h);
    this.positions.forEach((placements, n) => {
      for (const r of placements) forEachCell(r, (x, y) => this.overlaps[this.ov(n, x, y)]++);
    });

    this.numberAt = new Int32Array(this.w * this.h).fill(-1);
    numbers.forEach((num, n) => {
      for (const p of num.points) this.numberAt[p.y * this.w + p.x] = n;
    });
  }

  run(random?: RandomState): SolverOutput {
    for (;;) {
      // Inconsistency stops the deduction; the result below then reports it.
      if (!this.markSoleNumberPositions() || !this.markIntersections()) break;

      let progress = this.ruleOutPlacements();
      progress = this.ruleOutBySquares() || progress;
      if (progress) continue;

      if (!random || !this.narrowNumberPositions(random)) break;
    }
    return this.result();
  }

  /** Every placement of the right area that covers a possible number position. */
  private initialPlacements(num: NumberCandidates): Rect[] {
    const { w, h } = this;
    const minX = Math.min(w, ...num.points.map((p) => p.x));
    const minY = Math.min(h, ...num.points.map((p) => p.y));
    const maxX = Math.max(-1, ...num.points.map((p) => p.x));
    const maxY = Math.max(-1, ...num.points.map((p) => p.y));

    const placements: Rect[] = [];
    for (let rw = 1; rw <= num.area && rw <= w; rw++) {
      if (num.area % rw) continue;
      const rh = num.area / rw;
      if (rh > h) continue;
      for (let y = Math.max(minY - rh + 1, 0); y <= maxY && y + rh <= h; y++) {
        for (let x = Math.max(minX - rw + 1, 0); x <= maxX && x + rw <= w; x++) {
          const r = { x, y, w: rw, h: rh };
          if (num.points.some((p) => rectContains(r, p.x, p.y))) placements.push(r);
        }
      }
    }
    return placements;
  }

  /** A number with only one possible position marks that cell as its own. */
  private markSoleNumberPositions(): boolean {
    for (let n = 0; n < this.numbers.length; n++) {
      if (this.numbers[n].points.length !== 1) continue;
      const { x, y } = this.numbers[n].points[0];
      if (this.overlaps[this.ov(n, x, y)] < KNOWN_OTHER) continue;
      if (this.overlaps[this.ov(n, x, y)] <= 0) return false;
      this.markKnown(n, x, y);
    }
    return true;
  }

  /** Cells covered by every remaining placement of a number are its own. */
  private markIntersections(): boolean {
    for (let n = 0; n < this.numbers.length; n++) {
      let minX = 0;
      let minY = 0;
      let maxX = this.w;
      let maxY = this.h;
      for (const r of this.positions[n]) {
        minX = Math.max(minX, r.x);
        minY = Math.max(minY, r.y);
        maxX = Math.min(maxX, r.x + r.w);
        maxY = Math.min(maxY, r.y + r.h);
      }
      for (let y = minY; y < maxY; y++) {
        for (let x = minX; x < maxX; x++) {
          if (this.overlaps[this.ov(n, x, y)] < KNOWN_OTHER) continue;
          if (this.overlaps[this.ov(n, x, y)] <= 0) return false;
          this.markKnown(n, x, y);
        }
      }
    }
    return true;
  }

  /**
   * Rules out a placement if it covers a cell known to be another
   * rectangle's, covers every possible position of another number, or no
   * longer covers any possible position of its own number.
   */
  private ruleOutPlacements(): boolean {
    let progress = false;
    const covered = new Int32Array(this.numbers.length);

    for (let n = 0; n < this.numbers.length; n++) {
      for (let j = 0; j < this.positions[n].length; j++) {
        covered.fill(0);
        let impossible = false;
        forEachCell(this.positions[n][j], (x, y) => {
          if (this.overlaps[this.ov(n, x, y)] === KNOWN_OTHER) impossible = true;
          const other = this.numberAt[y * this.w + x];
          if (other !== -1) covered[other]++;
        });

        if (!impossible) {
          impossible = this.numbers.some(
            (num, k) => k !== n && covered[k] === num.points.length,
          );
        }
        if (!impossible && covered[n] === 0) impossible = true;

        if (impossible) {
          this.removePlacement(n, j);
          j--;
          progress = true;
        }
      }
    }
    return progress;
  }

  /** A cell that only one number can still reach must be in that number's rectangle. */
  private ruleOutBySquares(): boolean {
    let progress = false;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        // Known cells are negative for every number, so checking 0 suffices.
        if (this.overlaps[this.ov(0, x, y)] < 0) continue;

        let count = 0;
        let only = -1;
        for (let n = 0; n < this.numbers.length; n++) {
          if (this.overlaps[this.ov(n, x, y)] > 0) {
            count++;
            only = n;
          }
        }
        if (count !== 1) continue;

        const placements = this.positions[only];
        for (let j = 0; j < placements.length; j++) {
          if (rectContains(placements[j], x, y)) continue;
          this.removePlacement(only, j);
          j--;
          progress = true;
        }
      }
    }
    return progress;
  }

  /**
   * Generator only: picks a random placement that overlaps a possible
   * position of another number, and confines that number to inside it,
   * which rules the placement out on the next pass.
   */
  private narrowNumberPositions(random: RandomState): boolean {
    const choices: { placement: Rect; other: number }[] = [];
    this.positions.forEach((placements, n) => {
      for (const placement of placements) {
        forEachCell(placement, (x, y) => {
          const other = this.numberAt[y * this.w + x];
          if (other >= 0 && other !== n) choices.push({ placement, other });
        });
      }
    });
    if (choices.length === 0) return false;

    const { placement, other } = choices[random.upto(choices.length)];
    const points = this.numbers[other].points;
    let progress = false;
    for (let m = 0; m < points.length; m++) {
      if (rectContains(placement, points[m].x, points[m].y)) continue;
      this.removeNumberPosition(other, m);
      m--;
      progress = true;
    }
    return progress;
  }

  private result(): SolverOutput {
    // As in the original, the last number examined decides the result.
    let result: SolverResult = 'solved';
    const placements = this.positions.map((p) => {
      if (p.length <= 0) result = 'inconsistent';
      else if (p.length > 1) result = 'ambiguous';
      return p.length === 1 ? p[0] : null;
    });
    return { result, placements };
  }

  private markKnown(n: number, x: number, y: number): void {
    for (let k = 0; k < this.numbers.length; k++) this.overlaps[this.ov(k, x, y)] = KNOWN_OTHER;
    this.overlaps[this.ov(n, x, y)] = KNOWN_MINE;
  }

  private removePlacement(n: number, index: number): void {
    forEachCell(this.positions[n][index], (x, y) => {
      if (this.overlaps[this.ov(n, x, y)] > 0) this.overlaps[this.ov(n, x, y)]--;
    });
    swapRemove(this.positions[n], index);
  }

  private removeNumberPosition(n: number, index: number): void {
    const p = this.numbers[n].points[index];
    this.numberAt[p.y * this.w + p.x] = -1;
    swapRemove(this.numbers[n].points, index);
  }

  private ov(n: number, x: number, y: number): number {
    return (n * this.h + y) * this.w + x;
  }

}

/** Removes list[index] by moving the last item into its place (order matters for seeds). */
function swapRemove<T>(list: T[], index: number): void {
  const last = list.length - 1;
  [list[index], list[last]] = [list[last], list[index]];
  list.pop();
}
