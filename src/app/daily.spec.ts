import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PuzzleScreens } from '@studio/container/puzzle-screens';
import { RectanglesMove } from '../games/rectangles/moves';
import { RectanglesParams } from '../games/rectangles/params';
import { rectanglesGame } from '../games/rectangles/rectangles-game';
import { RectanglesState } from '../games/rectangles/state';
import { App } from './app';

type Screens = PuzzleScreens<RectanglesParams, RectanglesState, RectanglesMove, unknown>;

/** The home page, free play and daily puzzles, through Rectangles (the code is shared by every game). */
describe('Home page and daily puzzles', () => {
  let fixture: ComponentFixture<App>;
  let screens: Screens;
  let element: HTMLElement;

  /** Friday 30 October 2026, 10am: daily puzzle #7, 9×9. */
  const FRIDAY = new Date(2026, 9, 30, 10, 0);

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: FRIDAY });
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
  /** Solves the daily puzzle on screen, as a player's move. */
  function solveDaily(): void {
    const daily = screens.daily()!;
    daily.move(rectanglesGame.solve(daily.state(), undefined)!);
  }
  /** The clock on screen moves on four times a second (in real time; only Date is faked). */
  async function clockShows(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(screens.daily()!.elapsed()).toBe(ms);
  }
  async function goHome(): Promise<void> {
    const popped = new Promise((resolve) =>
      window.addEventListener('popstate', resolve, { once: true }),
    );
    screens.goHome();
    await popped;
    await fixture.whenStable();
  }

  it("opens on the home page, with today's daily puzzle and free play", () => {
    expect(text('h1')).toBe('Rectangles');
    expect(text('puzzle-home .what')).toBe('#7 · Friday · 9×9');
    expect(text('puzzle-home .status')).toBe('Not played yet');
    // The last 7 days, from Saturday, the day of puzzle #1.
    const days = Array.from(element.querySelectorAll('.days li'), (li) => {
      const button = li.querySelector('button');
      return button ? `${button.textContent!.trim()} ${button.className.trim()}` : 'none';
    });
    expect(days).toEqual(['S new', 'S new', 'M new', 'T new', 'W new', 'T new', 'F new today']);
    expect(element.querySelector('rectangles-board')).toBeNull();
  });

  it('goes to free play and back, as browser history', async () => {
    screens.openFreePlay();
    await fixture.whenStable();
    expect(text('h1')).toBe('Rectangles');
    expect(element.querySelector('puzzle-shell select')).toBeTruthy();
    expect(element.querySelectorAll('.action-bar button').length).toBe(4); // with Solve

    await goHome();
    expect(element.querySelector('puzzle-home')).toBeTruthy();
  });

  it('plays the daily puzzle against a clock that starts at the first touch', async () => {
    screens.openDaily('2026-10-30');
    await fixture.whenStable();
    expect(text('h1')).toBe('Daily puzzle #7');
    expect(text('.daily-bar span')).toBe('Friday · 9×9');
    const buttons = Array.from(element.querySelectorAll('.action-bar button'), (b) =>
      b.textContent!.trim(),
    );
    expect(buttons).toEqual(['Undo', 'Redo', 'Restart']); // no Solve
    expect(element.querySelector('puzzle-shell select')).toBeNull();

    later(30); // looking, not touching yet
    expect(text('.clock')).toBe('⏱ 0:00');
    element.querySelector('.board-area')!.dispatchEvent(new Event('pointerdown'));
    later(65);
    await fixture.whenStable();
    await clockShows(65_000);

    // Restart doesn't reset the clock.
    screens.daily()!.move({ kind: 'draw', rect: { x: 0, y: 0, w: 1, h: 1 } });
    screens.daily()!.restart();
    later(5);
    await clockShows(70_000);
  });

  it('stops the clock away from the puzzle, and keeps the time', async () => {
    screens.openDaily('2026-10-30');
    await fixture.whenStable();
    screens.daily()!.touch();
    later(20);

    await goHome(); // the clock stops
    expect(text('puzzle-home .status')).toBe('In progress: 0:20 so far');
    later(600);
    screens.openDaily('2026-10-30');
    await fixture.whenStable();
    later(1);
    await clockShows(21_000);

    screens.startTutorial(); // the clock stops
    await fixture.whenStable();
    later(300);
    screens.endTutorial();
    await fixture.whenStable();
    await clockShows(21_000);

    // Closing the app there, and opening it again (on the home page).
    history.replaceState(null, '');
    await open();
    expect(text('puzzle-home .status')).toBe('In progress: 0:21 so far');
  });

  it('keeps the time of a solved puzzle, counts the streak and shares the result', async () => {
    // Thursday's solved on the day: a streak of one so far.
    localStorage.setItem(
      'rectangles.daily.results',
      JSON.stringify({ '2026-10-29': { time: 1000, onDay: true } }),
    );
    screens.openDaily('2026-10-30');
    await fixture.whenStable();
    screens.daily()!.touch();
    later(192);
    solveDaily();
    await fixture.whenStable();

    const daily = screens.daily()!;
    expect(daily.result()).toEqual({ time: 192_000, onDay: true });
    expect(daily.celebrate()).toBe(true);
    expect(text('.clock')).toBe('Solved in 3:12');
    expect(daily.canUndo()).toBe(false); // the solved board stays
    const solved = daily.state();
    daily.move({ kind: 'draw', rect: { x: 0, y: 0, w: 1, h: 1 } });
    expect(daily.state()).toBe(solved);

    // No share panel in the test browser: the text is copied instead.
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    (element.querySelector('.daily-bar button') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(text('.daily-bar .shared')).toBe('Copied, ready to paste'));
    expect(writeText).toHaveBeenCalledWith(
      'Rectangles daily puzzle #7 (Friday, 9×9)\nSolved in 3:12\n🔥 2-day streak',
    );

    await goHome();
    expect(text('puzzle-home .status')).toBe('Solved in 3:12');
    expect(text('puzzle-home .card button')).toBe('See your solution');
    expect(text('.streak')).toBe('🔥 2-day streak');

    // Opened again: the finished board, still solved.
    await open();
    screens.openDaily('2026-10-30');
    await fixture.whenStable();
    expect(screens.daily()!.completed()).toBe(true);
    expect(text('.clock')).toBe('Solved in 3:12');
  });

  it('lets the last 7 days be played, without sharing or the streak', async () => {
    screens.openDaily('2026-10-27');
    await fixture.whenStable();
    expect(text('h1')).toBe('Daily puzzle #4');
    expect(text('.daily-bar span')).toBe('Tuesday · 8×8');
    screens.daily()!.touch();
    later(100);
    solveDaily();
    await fixture.whenStable();

    expect(screens.daily()!.result()).toEqual({ time: 100_000, onDay: false });
    expect(element.querySelector('.daily-bar button')).toBeNull(); // no Share
    expect(text('.daily-bar .shared')).toContain("doesn't count for your streak");
    await goHome();
    expect(element.querySelector('.days li:nth-child(4) button')?.className).toContain('late');
    expect(element.querySelector('.streak')).toBeNull();
  });

  it("can't open days still to come, or more than 7 days ago", async () => {
    screens.openDaily('2026-10-31');
    await fixture.whenStable();
    expect(element.querySelector('puzzle-home')).toBeTruthy();

    vi.setSystemTime(new Date(2026, 10, 2, 9, 0)); // the next Monday
    await open();
    screens.openDaily('2026-10-26');
    await fixture.whenStable();
    expect(element.querySelector('puzzle-home')).toBeTruthy();
    expect(element.querySelector('.days button')?.getAttribute('aria-label')).toBe(
      'Tuesday, puzzle #4: Not played yet',
    );
  });

  it('moves on to the next puzzle at midnight', async () => {
    vi.setSystemTime(new Date(2026, 9, 31, 0, 1));
    await open();
    expect(text('puzzle-home .what')).toBe('#8 · Saturday · 10×10');
  });
});
