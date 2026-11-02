import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEXT_PUZZLE_MS } from '@studio/container/clock-store';
import { PuzzleScreens } from '@studio/container/puzzle-screens';
import { RectanglesMove } from '../games/rectangles/moves';
import { RectanglesParams } from '../games/rectangles/params';
import { rectanglesGame } from '../games/rectangles/rectangles-game';
import { RectanglesState } from '../games/rectangles/state';
import { App } from './app';

type Screens = PuzzleScreens<RectanglesParams, RectanglesState, RectanglesMove, unknown>;

/** Beat the clock, through Rectangles (the code is shared by every game). */
describe('Beat the clock', () => {
  let fixture: ComponentFixture<App>;
  let screens: Screens;
  let element: HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 2, 10, 0) });
    localStorage.clear();
    localStorage.setItem('rectangles.noticeSeen', '2026-10-28');
    localStorage.setItem('rectangles.tutorialSeen', '1');
    history.replaceState(null, '');
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
    await open();
  });

  afterEach(() => vi.useRealTimers());

  async function open(): Promise<void> {
    fixture?.destroy();
    fixture = TestBed.createComponent(App);
    screens = (fixture.componentInstance as unknown as { screens: Screens }).screens;
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  }

  const text = (selector: string) => element.querySelector(selector)?.textContent?.trim();
  const later = (seconds: number) => vi.setSystemTime(Date.now() + seconds * 1000);
  /** Real time passing (only Date is faked): the clock's display, the next puzzle. */
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const clock = () => screens.clock()!;
  /** Solves the puzzle on screen, as a player's move. */
  function solve(): void {
    clock().move(rectanglesGame.solve(clock().state(), undefined)!);
  }
  async function goHome(): Promise<void> {
    const popped = new Promise((resolve) =>
      window.addEventListener('popstate', resolve, { once: true }),
    );
    screens.goHome();
    await popped;
    await fixture.whenStable();
  }

  it('is chosen on the home page, with a time limit', async () => {
    const cards = Array.from(element.querySelectorAll('puzzle-home h2'), (h) => h.textContent);
    expect(cards).toEqual(['Daily puzzles', 'Beat the clock', 'Timed play']);

    (element.querySelectorAll('puzzle-home .card button.primary')[1] as HTMLButtonElement).click();
    await fixture.whenStable();
    const times = Array.from(element.querySelectorAll('.chooser .times button'), (b) =>
      b.textContent!.trim(),
    );
    expect(times).toEqual(['5 min', '10 min', '15 min', '20 min']);

    // Other: 3 minutes.
    (element.querySelector('.chooser input') as HTMLInputElement).value = '3';
    element.querySelector('.chooser form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(text('h1')).toBe('Beat the clock');
    expect(text('.mode-bar .clock')).toBe('⏱ 3:00');
    expect(text('.mode-bar span')).toMatch(/^[678]×[678] · Solved: 0$/);
    const buttons = Array.from(element.querySelectorAll('.action-bar button'), (b) =>
      b.textContent!.trim(),
    );
    expect(buttons).toEqual(['Undo', 'Redo', 'Restart']); // no Solve, no skipping
  });

  it('counts down from the first touch, and stops between puzzles', async () => {
    screens.openClock(5, true);
    await fixture.whenStable();
    later(30); // not touched yet
    expect(clock().remaining()).toBe(300_000);

    clock().touch();
    later(60);
    await wait(300);
    expect(clock().remaining()).toBe(240_000);

    solve();
    expect(clock().solved()).toBe(1);
    expect(clock().celebrate()).toBe(true);
    later(100); // while the solved puzzle shows: not counted
    await wait(NEXT_PUZZLE_MS + 100);
    expect(clock().completed()).toBe(false); // the next puzzle
    later(10);
    await wait(300);
    expect(clock().remaining()).toBe(230_000);
  });

  it('deals the puzzles in fair sets: each size once per set, in random order', async () => {
    screens.openClock(5, true);
    await fixture.whenStable();
    clock().touch();
    const sizes = [clock().label()];
    for (let i = 0; i < 5; i++) {
      solve();
      await wait(NEXT_PUZZLE_MS + 50);
      sizes.push(clock().label());
    }
    expect(sizes.slice(0, 3).sort()).toEqual(['6×6', '7×7', '8×8']);
    expect(sizes.slice(3, 6).sort()).toEqual(['6×6', '7×7', '8×8']);

    // Continued later, the set carries on where it was.
    await goHome();
    const left = JSON.parse(localStorage.getItem('rectangles.clock.run')!).bag as number[];
    expect(left.length).toBe(0); // the second set is used up
  }, 15_000); // five real pauses between puzzles

  it('picks medium puzzles at random', async () => {
    screens.openClock(5, true);
    await fixture.whenStable();
    const sizes = new Set<string>();
    for (let i = 0; i < 30; i++) {
      sizes.add(clock().label());
      clock().playAgain();
    }
    expect([...sizes].sort()).toEqual(['6×6', '7×7', '8×8']);
  });

  it('keeps the record for each time limit when the time is up', async () => {
    screens.openClock(5, true);
    await fixture.whenStable();
    clock().touch();
    solve();
    await wait(NEXT_PUZZLE_MS + 100);
    later(301);
    await wait(400);
    await fixture.whenStable();

    expect(clock().finished()).toBe(true);
    expect(text('.mode-bar .clock')).toBe("Time's up! Solved: 1");
    expect(text('.mode-bar .shared')).toBe('A new record for 5 minutes!');
    expect(clock().canUndo()).toBe(false);

    // No share panel in the test browser: the text is copied instead.
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    (element.querySelector('.mode-bar .row button') as HTMLButtonElement).click(); // Share
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText).toHaveBeenCalledWith(
      'Rectangles, Beat the clock: 1 puzzle solved in 5 minutes, a new record!',
    );

    (element.querySelector('.mode-bar button') as HTMLButtonElement).click(); // Play again
    await fixture.whenStable();
    expect(clock().solved()).toBe(0);
    expect(clock().remaining()).toBe(300_000);
    expect(clock().record).toBe(1);

    await goHome();
    expect(text('puzzle-home .card:nth-of-type(2) .status')).toBe('Your record for 5 min: 1 puzzle');

    // Not a new record: nothing to share.
    screens.openClock(5, true);
    await fixture.whenStable();
    clock().touch();
    later(301);
    await wait(400);
    await fixture.whenStable();
    expect(text('.mode-bar .shared')).toBe('Your record for 5 minutes: 1');
    expect(element.querySelectorAll('.mode-bar button').length).toBe(1); // Play again
  });

  it('shows one record at a time, the next each time the home page opens', async () => {
    localStorage.setItem('rectangles.clock.records', JSON.stringify({ 5: 3, 10: 7, 25: 12 }));
    const shown: string[] = [];
    for (let i = 0; i < 4; i++) {
      screens.openTimed();
      await goHome();
      shown.push(text('puzzle-home .card:nth-of-type(2) .status')!);
    }
    expect(shown).toEqual([
      'Your record for 25 min: 12 puzzles',
      'Your record for 5 min: 3 puzzles',
      'Your record for 10 min: 7 puzzles',
      'Your record for 25 min: 12 puzzles',
    ]);
    expect(element.querySelectorAll('puzzle-home .card:nth-of-type(2) .status').length).toBe(1);
  });

  it('can be continued later, or started again', async () => {
    screens.openClock(10, true);
    await fixture.whenStable();
    clock().touch();
    later(30);
    solve();
    await goHome(); // the clock stops
    later(600);

    // Closing the app, and opening it again.
    history.replaceState(null, '');
    await open();
    (element.querySelectorAll('puzzle-home .card button.primary')[1] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(text('.chooser .level .state')).toBe('Solved: 1, 9:30 left');
    (element.querySelector('.chooser .level') as HTMLButtonElement).click(); // Continue
    await fixture.whenStable();
    expect(clock().minutes).toBe(10);
    expect(clock().solved()).toBe(1);
    expect(clock().remaining()).toBe(570_000);
    expect(clock().completed()).toBe(false); // a new puzzle after the solved one

    // Starting again forgets the unfinished run.
    await goHome();
    screens.openClock(10, true);
    await fixture.whenStable();
    expect(clock().solved()).toBe(0);
    expect(clock().remaining()).toBe(600_000);
  });
});
