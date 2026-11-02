import { dailyPuzzle } from '@studio/engine/daily';
import { GameSession } from '@studio/engine/game-session';
import { rectanglesGame } from './rectangles-game';

describe('Rectangles daily puzzles', () => {
  // A promise to players: everyone gets the same puzzle on the same day,
  // whatever the version. If this fails, the generator, the schedule or
  // the date rule has changed the daily puzzles.
  it.each([
    ['2026-11-02', 0, '5x5:2_2a3d2d2a3a3a3a3_2b'], // Monday, Easy
    ['2026-11-02', 1, '6x6:e3b6_4b2b4d5f4_2_2b4c'], // Monday, Medium
    ['2026-11-02', 2, '9x9:a4f2_2g2j9a6c6f10d2b6_4a2_2b3_2f4a2a5e3b5c'], // Monday, Hard
    ['2026-11-08', 0, '7x7:a3e2b3e6_2_4a3e4_2_2a5f3b2_2e6a'], // Sunday, Easy
    ['2026-11-08', 1, '8x8:5e2a4a3_8e5e3f4_2f5c2e3c3e6b9b'], // Sunday, Medium
    ['2026-11-08', 2, '10x10:b9_2b12d4i4a2l3_5c12a4d14x12k5b2_3b7g'], // Sunday, Hard
  ])('%s at level %i is always %s', (date, level, expected) => {
    const puzzle = dailyPuzzle('rectangles', rectanglesGame.daily!, date, level)!;
    const session = new GameSession(rectanglesGame, puzzle.params, puzzle.seed);
    expect(`${rectanglesGame.encodeParams(session.params)}:${session.description}`).toBe(expected);
  });

  it('numbers the puzzles from launch day, Saturday 24 October 2026', () => {
    expect(dailyPuzzle('rectangles', rectanglesGame.daily!, '2026-10-24', 0)?.number).toBe(1);
  });
});
