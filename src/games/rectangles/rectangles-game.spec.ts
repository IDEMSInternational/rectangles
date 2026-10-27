import { GameSession } from '@studio/engine/game-session';
import { RectanglesDrag, cellAt } from './input';
import { decodeParams } from './params';
import { rectanglesGame as game } from './rectangles-game';
import { encodeEdges, rectsToEdges } from './solution';
import reference from './testing/reference-puzzles.json';

const uniquePuzzles = reference.filter((ref) => !ref.params.endsWith('a'));

describe('Rectangles solver', () => {
  it('solves every unique reference puzzle without the stored solution', () => {
    for (const ref of uniquePuzzles) {
      const initial = game.newGame(decodeParams(ref.params), ref.description);
      const move = game.solve(initial);
      expect(move?.kind, ref.params + '#' + ref.seed).toBe('solve');
      if (move?.kind !== 'solve') continue;
      expect(encodeEdges(initial, rectsToEdges(initial, move.rects))).toBe(ref.solution);
    }
  });

  it('turns every stored solution into rectangles that solve the puzzle', () => {
    for (const ref of uniquePuzzles) {
      const initial = game.newGame(decodeParams(ref.params), ref.description);
      const solved = game.applyMove(initial, game.solve(initial, ref.solution)!)!;
      expect(game.isCompleted(solved), ref.params + '#' + ref.seed).toBe(true);
      expect(solved.cheated).toBe(true);
    }
  });
});

describe('Rectangles play', () => {
  const ref = reference.find((r) => r.params === '7x7')!;
  const initial = () => game.newGame(decodeParams(ref.params), ref.description);

  it('draws the rectangle spanning the cells a drag starts and ends on', () => {
    const state = initial();
    const drag = new RectanglesDrag(cellAt(state, 0.5, 0.5));
    drag.moveTo(cellAt(state, 2.9, 1.1));
    expect(drag.rect).toEqual({ x: 0, y: 0, w: 3, h: 2 });
    expect(game.applyMove(state, drag.finish(state)!)!.rects).toEqual([{ x: 0, y: 0, w: 3, h: 2 }]);
  });

  it('replaces overlapped rectangles', () => {
    let state = initial();
    state = game.applyMove(state, { kind: 'draw', rect: { x: 0, y: 0, w: 2, h: 2 } })!;
    state = game.applyMove(state, { kind: 'draw', rect: { x: 3, y: 0, w: 2, h: 1 } })!;
    state = game.applyMove(state, { kind: 'draw', rect: { x: 1, y: 1, w: 1, h: 3 } })!;
    expect(state.rects).toEqual([
      { x: 3, y: 0, w: 2, h: 1 },
      { x: 1, y: 1, w: 1, h: 3 },
    ]);
  });

  it('removes a rectangle when it is tapped, and ignores taps on empty cells', () => {
    let state = game.applyMove(initial(), { kind: 'draw', rect: { x: 3, y: 0, w: 2, h: 1 } })!;
    expect(game.applyMove(state, new RectanglesDrag(cellAt(state, 0.5, 0.5)).finish(state)!)).toBeNull();

    state = game.applyMove(state, new RectanglesDrag(cellAt(state, 4.5, 0.5)).finish(state)!)!;
    expect(state.rects).toEqual([]);
  });

  it('with Lock on, refuses rectangles drawn over existing ones, but still allows removing them', () => {
    let state = game.applyMove(initial(), { kind: 'draw', rect: { x: 0, y: 0, w: 2, h: 2 } })!;

    const over = new RectanglesDrag(cellAt(state, 1.5, 1.5));
    over.moveTo(cellAt(state, 3.5, 1.5));
    expect(over.isBlocked(state, true)).toBe(true);
    expect(over.finish(state, true)).toBeNull();
    expect(over.finish(state, false)).toEqual({ kind: 'draw', rect: { x: 1, y: 1, w: 3, h: 1 } });

    const beside = new RectanglesDrag(cellAt(state, 2.5, 0.5));
    beside.moveTo(cellAt(state, 3.5, 1.5));
    expect(beside.finish(state, true)).toEqual({ kind: 'draw', rect: { x: 2, y: 0, w: 2, h: 2 } });

    state = game.applyMove(state, new RectanglesDrag(cellAt(state, 0.5, 0.5)).finish(state, true)!)!;
    expect(state.rects).toEqual([]);
  });

  it('rejects moves that change nothing', () => {
    const state = game.applyMove(initial(), { kind: 'draw', rect: { x: 0, y: 0, w: 2, h: 2 } })!;
    expect(game.applyMove(state, { kind: 'draw', rect: { x: 0, y: 0, w: 2, h: 2 } })).toBeNull();
    expect(game.applyMove(state, { kind: 'erase', rect: { x: 5, y: 5, w: 1, h: 1 } })).toBeNull();
  });
});

describe('Rectangles sizes', () => {
  it('offers 4×4 to 10×10 in steps of one', () => {
    expect(game.presets().map((p) => p.name)).toEqual(['4×4', '5×5', '6×6', '7×7', '8×8', '9×9', '10×10']);
  });

  it('generates solvable puzzles for every preset and for custom sizes', () => {
    const sizes = [...game.presets().map((p) => p.params), game.customParams({ w: 4, h: 9 }), game.customParams({ w: 25, h: 25 })];
    for (const params of sizes) {
      for (const seed of ['1', '2', '3']) {
        const session = new GameSession(game, params);
        session.newGame(undefined, seed);
        expect(session.solve(), `${session.gameId}`).toBe(true);
        expect(session.isCompleted).toBe(true);
      }
    }
  });

  it('fills custom fields from the current size', () => {
    expect(game.customFields(decodeParams('6x9')).map((f) => [f.key, f.value])).toEqual([
      ['w', 6],
      ['h', 9],
    ]);
  });
});

describe('GameSession with Rectangles', () => {
  it('regenerates the same puzzle from a seed, and supports undo/redo', () => {
    const session = new GameSession(game, decodeParams('7x7'));
    session.newGame(undefined, '1');
    expect(session.description).toBe(reference.find((r) => r.params === '7x7' && r.seed === '1')!.description);
    expect(session.gameId).toBe('7x7#1');

    expect(session.move({ kind: 'draw', rect: { x: 0, y: 0, w: 2, h: 1 } })).toBe(true);
    session.undo();
    expect(session.state.rects).toEqual([]);
    session.redo();
    expect(session.state.rects.length).toBe(1);
  });
});
