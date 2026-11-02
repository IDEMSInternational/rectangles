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

  /** Friday 30 October 2026, 10am: daily puzzle #7 (Easy 6×6, Medium 7×7, Hard 10×10). */
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
    expect(text('puzzle-home .what')).toBe('#7 · Friday');
    expect(text('puzzle-home .status')).toBe('Not played yet');
    // The last 7 days, from Saturday, the day of puzzle #1.
    const days = Array.from(element.querySelectorAll('.days li'), (li) => {
      const button = li.querySelector('button');
      return button ? `${button.textContent!.trim()} ${button.className.trim()}` : 'none';
    });
    expect(days).toEqual(['S new', 'S new', 'M new', 'T new', 'W new', 'T new', 'F new today']);
    expect(element.querySelector('rectangles-board')).toBeNull();
  });

  it('asks for the level when a daily puzzle is opened', async () => {
    (element.querySelector('puzzle-home .card button.primary') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(text('.chooser h2')).toBe("Today's puzzle #7");
    const levels = Array.from(element.querySelectorAll('.chooser .level'), (b) =>
      Array.from(b.querySelectorAll('span'), (span) => span.textContent!.trim()).join(' / '),
    );
    expect(levels).toEqual([
      'Easy / 6×6 / not played yet',
      'Medium / 7×7 / not played yet',
      'Hard / 10×10 / not played yet',
    ]);

    (element.querySelector('.chooser .cancel') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(element.querySelector('.chooser')).toBeNull();

    (element.querySelector('.days li:nth-child(4) button') as HTMLButtonElement).click(); // Tuesday
    await fixture.whenStable();
    expect(text('.chooser h2')).toBe("Tuesday's puzzle #4");
    (element.querySelectorAll('.chooser .level')[1] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(text('h1')).toBe('Daily puzzle #4');
    expect(text('.mode-bar span')).toBe('Tuesday · Medium · 6×6');
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
    screens.openDaily('2026-10-30', 2);
    await fixture.whenStable();
    expect(text('h1')).toBe('Daily puzzle #7');
    expect(text('.mode-bar span')).toBe('Friday · Hard · 10×10');
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

  it('stops the clock away from the puzzle, and keeps the time of each level', async () => {
    screens.openDaily('2026-10-30', 0);
    await fixture.whenStable();
    screens.daily()!.touch();
    later(20);

    await goHome(); // the clock stops
    expect(text('puzzle-home .status')).toBe('Easy: 0:20 so far');
    // In progress: nothing shows on the day's circle.
    expect(element.querySelector('.days li:nth-child(7) button')!.getAttribute('style')).not.toContain('--brand');
    later(600);
    screens.openDaily('2026-10-30', 0);
    await fixture.whenStable();
    later(1);
    await clockShows(21_000);

    screens.startTutorial(); // the clock stops
    await fixture.whenStable();
    later(300);
    screens.endTutorial();
    await fixture.whenStable();
    await clockShows(21_000);

    // Another level has its own puzzle and clock.
    await goHome();
    screens.openDaily('2026-10-30', 1);
    await fixture.whenStable();
    expect(screens.daily()!.elapsed()).toBe(0);
    screens.daily()!.touch();
    later(5);

    // Closing the app there, and opening it again (on the home page).
    history.replaceState(null, '');
    await open();
    expect(text('puzzle-home .status')).toBe('Easy: 0:21 so far · Medium: 0:05 so far');
  });

  it('keeps the time of a solved puzzle, the streaks, and shares the result', async () => {
    // Thursday's solved on the day, at the Easy and Hard levels.
    localStorage.setItem(
      'rectangles.daily.results',
      JSON.stringify({
        '2026-10-29.low': { time: 1000, onDay: true },
        '2026-10-29.high': { time: 1000, onDay: true },
      }),
    );
    screens.openDaily('2026-10-30', 0);
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
    (element.querySelector('.mode-bar button') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(text('.mode-bar .shared')).toBe('Copied, ready to paste'));
    expect(writeText).toHaveBeenCalledWith(
      'Rectangles daily puzzle #7, Easy (Friday, 6×6)\nSolved in 3:12\n🔥 2-day streak at Easy',
    );

    await goHome();
    expect(text('puzzle-home .status')).toBe('Easy: solved in 3:12');
    // One streak at a time, the next each time the home page opens. Hard's
    // is still on: today's Hard puzzle can still be solved.
    const shown = [text('.streak')];
    for (let i = 0; i < 2; i++) {
      screens.openFreePlay();
      await goHome();
      shown.push(text('.streak'));
    }
    expect(shown[0]).not.toBe(shown[1]);
    expect(new Set(shown)).toEqual(new Set(['🔥 Easy: 2 days', '🔥 Hard: 1 day']));
    expect(element.querySelectorAll('.streak').length).toBe(1);
    const friday = element.querySelector('.days li:nth-child(7) button') as HTMLElement;
    expect(friday.className).toContain('solved');
    expect(friday.getAttribute('style')).toMatch(/var\(--brand\) 0(deg)? 120deg, var\(--surface\) 120deg 240deg/); // Easy's third

    // Opened again: the finished board, still solved.
    await open();
    screens.openDaily('2026-10-30', 0);
    await fixture.whenStable();
    expect(screens.daily()!.completed()).toBe(true);
    expect(text('.clock')).toBe('Solved in 3:12');

    // Days later, with none solved since: the streaks are over.
    vi.setSystemTime(new Date(2026, 10, 3, 9, 0));
    history.replaceState(null, '');
    await open();
    expect(element.querySelector('.streak')).toBeNull();
  });

  it('lets the last 7 days be played, without sharing or the streak', async () => {
    screens.openDaily('2026-10-27', 2);
    await fixture.whenStable();
    expect(text('h1')).toBe('Daily puzzle #4');
    expect(text('.mode-bar span')).toBe('Tuesday · Hard · 9×9');
    screens.daily()!.touch();
    later(100);
    solveDaily();
    await fixture.whenStable();

    expect(screens.daily()!.result()).toEqual({ time: 100_000, onDay: false });
    expect(element.querySelector('.mode-bar button')).toBeNull(); // no Share
    expect(text('.mode-bar .shared')).toContain("doesn't count for your streak");
    await goHome();
    const tuesday = element.querySelector('.days li:nth-child(4) button') as HTMLElement;
    expect(tuesday.className).toContain('late');
    // Hard's third: not filled, but its edge is orange.
    expect(tuesday.getAttribute('style')).toMatch(
      /var\(--surface\) 240deg 360deg\) padding-box, .*var\(--brand\) 240deg 360deg\) border-box/,
    );
    expect(element.querySelector('.streak')).toBeNull();
  });

  it("can't open days still to come, or more than 7 days ago", async () => {
    screens.openDaily('2026-10-31', 0);
    await fixture.whenStable();
    expect(element.querySelector('puzzle-home')).toBeTruthy();

    vi.setSystemTime(new Date(2026, 10, 2, 9, 0)); // the next Monday
    await open();
    screens.openDaily('2026-10-26', 0);
    await fixture.whenStable();
    expect(element.querySelector('puzzle-home')).toBeTruthy();
    expect(element.querySelector('.days button')?.getAttribute('aria-label')).toBe(
      'Tuesday, puzzle #4: Not played yet',
    );
  });

  it('moves on to the next puzzle at midnight', async () => {
    vi.setSystemTime(new Date(2026, 9, 31, 0, 1));
    await open();
    expect(text('puzzle-home .what')).toBe('#8 · Saturday');
  });
});
