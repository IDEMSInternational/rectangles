import { dailyPuzzle } from '@studio/engine/daily';
import { GameSession } from '@studio/engine/game-session';
import { rectanglesGame } from './rectangles-game';

describe('Rectangles daily puzzles', () => {
  // A promise to players: everyone gets the same puzzle on the same day,
  // whatever the version. If this fails, the generator, the schedule or
  // the date rule has changed the daily puzzles.
  it.each([
    ['2026-10-26', '8x8:f2b3_6_4a2f3d4e6d3b6e3b7b5a2b2a2d4'], // Monday
    ['2026-10-28', '9x9:4a8l4a2d2f6a2_2i3f12b6_6a4a2a4_2h4c2_3_3e'], // Wednesday
    ['2026-10-30', '9x9:a6c5e2a3n2c8a10_6c10j2c3a3e5d4_3b2c7e'], // Friday
    ['2026-11-01', '10x10:c3g3b6b3a6_7_8d2h8c2a2b2j2a3d6a10e3a3f5d10b4h2c'], // Sunday
  ])('%s is always %s', (date, expected) => {
    const puzzle = dailyPuzzle('rectangles', rectanglesGame.daily!, date)!;
    const session = new GameSession(rectanglesGame, puzzle.params, puzzle.seed);
    expect(`${rectanglesGame.encodeParams(session.params)}:${session.description}`).toBe(expected);
  });

  it('numbers the puzzles from launch day, Saturday 24 October 2026', () => {
    expect(dailyPuzzle('rectangles', rectanglesGame.daily!, '2026-10-24')?.number).toBe(1);
  });
});
