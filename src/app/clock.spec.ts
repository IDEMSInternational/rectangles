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

  /** Opens Beat the clock's sheet, from the Challenges page. */
  async function openSheet(): Promise<void> {
    screens.openChallenges();
    await fixture.whenStable();
    (element.querySelectorAll('puzzle-home .card button.primary')[0] as HTMLButtonElement).click();
    await fixture.whenStable();
  }
  const buttonTexts = (selector: string) =>
    Array.from(element.querySelectorAll(selector), (b) => b.textContent!.trim());

  it('is chosen in Challenges, with a difficulty and a time limit', async () => {
    (element.querySelectorAll('puzzle-home .card button.primary')[2] as HTMLButtonElement).click(); // Challenges
    await fixture.whenStable();
    (element.querySelectorAll('puzzle-home .card button.primary')[0] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(buttonTexts('.chooser .times button')).toEqual(['1 min', '2 min', '5 min', '10 min']);
    expect(buttonTexts('.chooser .difficulty button')).toEqual(['Easy', 'Medium', 'Hard']);
    expect(text('.chooser .chosen')).toBe('Medium'); // to start with
    expect(text('.chooser .custom-toggle')).toBe('Custom size ›');

    // Hard, for 3 minutes (Other).
    (element.querySelectorAll('.chooser .difficulty button')[2] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(text('.chooser .chosen')).toBe('Hard');
    (element.querySelector('.chooser .custom input') as HTMLInputElement).value = '3';
    element.querySelector('.chooser form.custom')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(text('h1')).toBe('Beat the clock');
    expect(text('.mode-bar .clock')).toBe('⏱ 3:00');
    expect(text('.mode-bar span')).toMatch(/^(9×9|10×10) · Solved: 0$/); // the Hard daily puzzles' sizes
    expect(buttonTexts('.action-bar button')).toEqual(['Undo', 'Redo', 'Restart']); // no Solve, no skipping

    // The sheet remembers the difficulty.
    await goHome();
    (element.querySelectorAll('puzzle-home .card button.primary')[0] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(text('.chooser .chosen')).toBe('Hard');
  });

  it('plays a custom size, every puzzle that size', async () => {
    await openSheet();
    (element.querySelector('.chooser .custom-toggle') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(text('.chooser .chosen')).toBe('Custom size ›');
    const [width, height] = Array.from(element.querySelectorAll<HTMLInputElement>('.chooser .custom-size input'));
    expect([width.value, height.value]).toEqual(['6', '6']); // from Medium's sizes

    width.value = '0';
    (element.querySelectorAll('.chooser .times button')[1] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(text('.chooser .error')).toBe('Width must be a whole number from 4 to 25');
    expect(screens.screen().name).toBe('challenges');

    width.value = '7';
    height.value = '9';
    (element.querySelectorAll('.chooser .times button')[1] as HTMLButtonElement).click(); // 2 min
    await fixture.whenStable();
    expect(clock().choiceLabel).toBe('7×9');
    expect(text('.mode-bar .clock')).toBe('⏱ 2:00');
    for (let i = 0; i < 3; i++) {
      expect(clock().label()).toBe('7×9');
      clock().playAgain();
    }

    // Opening the sheet again: the custom size, as last played.
    await goHome();
    (element.querySelectorAll('puzzle-home .card button.primary')[0] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(text('.chooser .chosen')).toBe('Custom size ›');
    const inputs = Array.from(element.querySelectorAll<HTMLInputElement>('.chooser .custom-size input'));
    expect(inputs.map((input) => input.value)).toEqual(['7', '9']);
  });

  it('counts down from the first touch, and stops between puzzles', async () => {
    screens.openClock(5, 'medium', true);
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
    screens.openClock(5, 'medium', true);
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

  it("picks puzzles at random from the difficulty's daily puzzle sizes", async () => {
    const sizes = async (choice: string) => {
      screens.openClock(5, choice, true);
      await fixture.whenStable();
      const seen = new Set<string>();
      for (let i = 0; i < 30; i++) {
        seen.add(clock().label());
        clock().playAgain();
      }
      await goHome();
      return [...seen].sort();
    };
    expect(await sizes('low')).toEqual(['5×5', '6×6', '7×7']);
    expect(await sizes('medium')).toEqual(['6×6', '7×7', '8×8']);
    expect(await sizes('high')).toEqual(['10×10', '9×9']);
  });

  it('keeps the record for each difficulty and time limit when the time is up', async () => {
    screens.openClock(5, 'medium', true);
    await fixture.whenStable();
    clock().touch();
    solve();
    await wait(NEXT_PUZZLE_MS + 100);
    later(301);
    await wait(400);
    await fixture.whenStable();

    expect(clock().finished()).toBe(true);
    expect(text('.mode-bar .clock')).toBe("Time's up! Solved: 1");
    expect(text('.mode-bar .shared')).toBe('A new record for Medium, 5 minutes!');
    expect(clock().canUndo()).toBe(false);

    // No share panel in the test browser: the text is copied instead.
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    (element.querySelector('.mode-bar .row button') as HTMLButtonElement).click(); // Share
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText).toHaveBeenCalledWith(
      'Rectangles, Beat the clock (Medium): 1 puzzle solved in 5 minutes, a new record!',
    );

    (element.querySelector('.mode-bar button') as HTMLButtonElement).click(); // Play again
    await fixture.whenStable();
    expect(clock().solved()).toBe(0);
    expect(clock().remaining()).toBe(300_000);
    expect(clock().record).toBe(1);

    await goHome();
    screens.openChallenges();
    await fixture.whenStable();
    expect(text('puzzle-home .card:nth-of-type(1) .status')).toBe('Your record for Medium, 5 min: 1 puzzle');
    await goHome();

    // Hard has its own records.
    screens.openClock(5, 'high', true);
    await fixture.whenStable();
    expect(clock().record).toBe(0);
    await goHome();

    // Not a new record: nothing to share.
    screens.openClock(5, 'medium', true);
    await fixture.whenStable();
    clock().touch();
    later(301);
    await wait(400);
    await fixture.whenStable();
    expect(text('.mode-bar .shared')).toBe('Your record for Medium, 5 minutes: 1');
    expect(element.querySelectorAll('.mode-bar button').length).toBe(1); // Play again
  });

  it('shows one record at a time, the next each time Challenges opens', async () => {
    // A record from before difficulties (by minutes alone) counts as Medium.
    localStorage.setItem(
      'rectangles.clock.records',
      JSON.stringify({ 5: 3, 'low/10': 7, 'custom:7x9/2': 12 }),
    );
    const shown: string[] = [];
    for (let i = 0; i < 4; i++) {
      screens.openChallenges();
      await fixture.whenStable();
      shown.push(text('puzzle-home .card:nth-of-type(1) .status')!);
      await goHome();
    }
    expect(shown).toEqual([
      'Your record for Medium, 5 min: 3 puzzles',
      'Your record for 7×9, 2 min: 12 puzzles',
      'Your record for Easy, 10 min: 7 puzzles',
      'Your record for Medium, 5 min: 3 puzzles',
    ]);
    screens.openChallenges();
    await fixture.whenStable();
    expect(element.querySelectorAll('puzzle-home .card:nth-of-type(1) .status').length).toBe(1);
  });

  it('can be continued later, or started again', async () => {
    screens.openClock(10, 'medium', true);
    await fixture.whenStable();
    clock().touch();
    later(30);
    solve();
    await goHome(); // the clock stops
    later(600);

    // Closing the app, and opening it again.
    history.replaceState(null, '');
    await open();
    screens.openChallenges();
    await fixture.whenStable();
    (element.querySelectorAll('puzzle-home .card button.primary')[0] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(text('.chooser .level .size')).toBe('Medium · 10 min');
    expect(text('.chooser .level .state')).toBe('Solved: 1, 9:30 left');
    (element.querySelector('.chooser .level') as HTMLButtonElement).click(); // Continue
    await fixture.whenStable();
    expect(clock().minutes).toBe(10);
    expect(clock().solved()).toBe(1);
    expect(clock().remaining()).toBe(570_000);
    expect(clock().completed()).toBe(false); // a new puzzle after the solved one

    // Starting again forgets the unfinished run.
    await goHome();
    screens.openClock(10, 'medium', true);
    await fixture.whenStable();
    expect(clock().solved()).toBe(0);
    expect(clock().remaining()).toBe(600_000);
  });
});
