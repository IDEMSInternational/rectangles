import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LEGAL_VERSION } from '@studio/container/legal';
import { PuzzleScreens } from '@studio/container/puzzle-screens';
import { RectanglesMove } from '../games/rectangles/moves';
import { RectanglesParams } from '../games/rectangles/params';
import { rectanglesGame } from '../games/rectangles/rectangles-game';
import { RectanglesState } from '../games/rectangles/state';
import { App } from './app';

type Screens = PuzzleScreens<RectanglesParams, RectanglesState, RectanglesMove, unknown>;

/** Timed play, through Rectangles (the code is shared by every game). */
describe('Timed play', () => {
  let fixture: ComponentFixture<App>;
  let screens: Screens;
  let element: HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 2, 10, 0) });
    localStorage.clear();
    localStorage.setItem('rectangles.noticeSeen', LEGAL_VERSION);
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
  /** Real time passing (only Date is faked), for the clock's display. */
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const timed = () => screens.timed;
  /** Solves the puzzle on screen after `seconds`, as a player's move. */
  async function solveIn(seconds: number): Promise<void> {
    timed().touch();
    later(seconds);
    timed().move(rectanglesGame.solve(timed().state(), undefined)!);
    await fixture.whenStable();
  }
  async function goHome(): Promise<void> {
    const popped = new Promise((resolve) =>
      window.addEventListener('popstate', resolve, { once: true }),
    );
    screens.goHome();
    await popped;
    await fixture.whenStable();
  }

  it('is in Challenges, with the size menu and no Solve', async () => {
    (element.querySelectorAll('puzzle-home .card button.primary')[2] as HTMLButtonElement).click(); // Challenges
    await fixture.whenStable();
    (element.querySelectorAll('puzzle-home .card button.primary')[1] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(text('h1')).toBe('Timed play');
    expect(element.querySelector('puzzle-shell select')).toBeTruthy();
    expect(text('.mode-bar span')).toBe('No best time yet');
    expect(text('.mode-bar .clock')).toBe('⏱ 0:00');
    const buttons = Array.from(element.querySelectorAll('.action-bar button'), (b) =>
      b.textContent!.trim(),
    );
    expect(buttons).toEqual(['Undo', 'Redo', 'Restart']);
  });

  it('times each puzzle from the first touch, and keeps the best time for each size', async () => {
    screens.openTimed();
    await fixture.whenStable();
    later(20); // not touched yet
    timed().touch();
    later(10);
    await wait(300);
    expect(timed().elapsed()).toBe(10_000);

    later(55);
    timed().move(rectanglesGame.solve(timed().state(), undefined)!);
    await fixture.whenStable();
    expect(text('.mode-bar .clock')).toBe('Solved in 1:05');
    expect(text('.mode-bar .shared')).toBe('A new best time for 7×7!');
    expect(timed().canUndo()).toBe(false); // the solved board stays

    // No share panel in the test browser: the text is copied instead.
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    (element.querySelector('.mode-bar button') as HTMLButtonElement).click(); // Share
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText).toHaveBeenCalledWith('Rectangles, timed play: 7×7 solved in 1:05, a new best time!');

    timed().newGame(); // the clock starts again
    await fixture.whenStable();
    expect(timed().elapsed()).toBe(0);
    expect(text('.mode-bar span')).toBe('Best: 1:05');
    await solveIn(80);
    expect(text('.mode-bar .shared')).toBe('Your best time: 1:05');
    expect(element.querySelector('.mode-bar button')).toBeNull(); // nothing to share

    timed().newGame();
    await solveIn(50);
    expect(text('.mode-bar .shared')).toBe('A new best time for 7×7!');

    timed().newGame(2); // 6×6: its own best time
    await fixture.whenStable();
    expect(text('.mode-bar span')).toBe('No best time yet');
  });

  it('continues the puzzle in progress after a reload', async () => {
    screens.openTimed();
    await fixture.whenStable();
    timed().newGame(1); // 5×5
    timed().touch();
    later(30);
    expect(timed().label()).toBe('5×5');

    await goHome(); // the clock stops
    later(600);
    history.replaceState(null, '');
    await open();
    screens.openTimed();
    await fixture.whenStable();
    expect(timed().label()).toBe('5×5');
    expect(timed().elapsed()).toBe(30_000);
  });

  it('shows one best time at a time in Challenges, the next each time', async () => {
    screens.openChallenges();
    screens.openTimed();
    await fixture.whenStable();
    await solveIn(65); // 7×7
    timed().newGame(1);
    await solveIn(12); // 5×5

    const shown: string[] = [];
    for (let i = 0; i < 3; i++) {
      await goHome(); // back to Challenges
      shown.push(text('puzzle-home .card:nth-of-type(2) .status')!);
      screens.openTimed();
      await fixture.whenStable();
    }
    expect(shown[0]).not.toBe(shown[1]);
    expect(shown[0]).toBe(shown[2]);
    expect(new Set(shown)).toEqual(
      new Set(['Your best time for 5×5: 0:12', 'Your best time for 7×7: 1:05']),
    );
  });
});
