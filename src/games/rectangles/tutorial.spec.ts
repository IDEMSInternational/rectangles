import { TutorialRun } from '@studio/engine/tutorial';
import { rectanglesGame as game } from './rectangles-game';
import { rectanglesTutorial as tutorial } from './tutorial';

describe('Rectangles tutorial', () => {
  it('uses a puzzle with exactly one solution', () => {
    const initial = game.newGame(tutorial.params, tutorial.description);
    const solve = game.solve(initial);
    expect(solve?.kind).toBe('solve');
    expect(game.applyMove(initial, solve!)!.completed).toBe(true);
  });

  it('can be played through from start to finish', () => {
    const run = new TutorialRun(game, tutorial);

    // 1: draw the bottom row. Other moves are ignored.
    expect(run.move({ kind: 'draw', rect: { x: 0, y: 2, w: 2, h: 2 } })).toBe('refused');
    expect(run.state.rects).toEqual([]);
    expect(run.move({ kind: 'draw', rect: { x: 0, y: 3, w: 4, h: 1 } })).toBe('step-done');
    expect(run.next()).toBe(true);

    // 2: draw the (wrong) 2×2 on the 3.
    expect(run.move({ kind: 'draw', rect: { x: 0, y: 0, w: 2, h: 2 } })).toBe('step-done');
    expect(run.next()).toBe(true);

    // 3: tap it to remove it; tapping elsewhere is ignored.
    expect(run.hint?.note).toBe('4 cells, not 3');
    expect(run.move({ kind: 'erase', rect: { x: 2, y: 3, w: 1, h: 1 } })).toBe('refused');
    expect(run.move({ kind: 'erase', rect: { x: 1, y: 1, w: 1, h: 1 } })).toBe('step-done');
    expect(run.next()).toBe(true);

    // 4: draw the 2×2 on the other 4.
    expect(run.move({ kind: 'draw', rect: { x: 0, y: 1, w: 2, h: 2 } })).toBe('step-done');
    expect(run.next()).toBe(true);

    // 5: finish freely.
    expect(run.hint).toBeUndefined();
    expect(run.move({ kind: 'draw', rect: { x: 0, y: 0, w: 3, h: 1 } })).toBe('applied');
    expect(run.move({ kind: 'draw', rect: { x: 2, y: 1, w: 1, h: 2 } })).toBe('applied');
    expect(run.move({ kind: 'draw', rect: { x: 3, y: 0, w: 1, h: 3 } })).toBe('step-done');
    expect(run.next()).toBe(false);
  });
});
