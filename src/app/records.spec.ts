import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LEGAL_VERSION } from '@studio/container/legal';
import { PuzzleScreens } from '@studio/container/puzzle-screens';
import { RectanglesMove } from '../games/rectangles/moves';
import { RectanglesParams } from '../games/rectangles/params';
import { RectanglesState } from '../games/rectangles/state';
import { App } from './app';

type Screens = PuzzleScreens<RectanglesParams, RectanglesState, RectanglesMove, unknown>;

/** The records page, through Rectangles (the code is shared by every game). */
describe('Records page', () => {
  let fixture: ComponentFixture<App>;
  let screens: Screens;
  let element: HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 30, 10, 0) }); // Friday 30 October
    localStorage.clear();
    localStorage.setItem('rectangles.noticeSeen', LEGAL_VERSION);
    localStorage.setItem('rectangles.tutorialSeen', '1');
    const solved = { time: 60_000, onDay: true };
    localStorage.setItem(
      'rectangles.daily.results',
      JSON.stringify({
        // Easy: 3 days in a row, a gap, then today; Hard: today.
        '2026-10-24.low': solved,
        '2026-10-25.low': solved,
        '2026-10-26.low': solved,
        '2026-10-30.low': solved,
        '2026-10-30.high': solved,
        '2026-10-29.medium': { time: 60_000, onDay: false }, // late: no streak
      }),
    );
    localStorage.setItem('rectangles.clock.records', JSON.stringify({ 'medium/5': 7, 'low/1': 1 }));
    localStorage.setItem('rectangles.timed.best', JSON.stringify({ '7x7': { label: '7×7', time: 65_000 } }));
    history.replaceState(null, '');
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
    fixture = TestBed.createComponent(App);
    screens = (fixture.componentInstance as unknown as { screens: Screens }).screens;
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => vi.useRealTimers());

  const text = (selector: string) => element.querySelector(selector)?.textContent?.trim();
  /** Each record as "label | value | detail". */
  const rows = () =>
    Array.from(element.querySelectorAll('puzzle-records li'), (li) =>
      Array.from(li.querySelectorAll('.record span'), (s) => s.textContent!.trim()).join(' | '),
    );

  it('opens with 🏆, on the home and Challenges pages, and lists the records by mode', async () => {
    expect(element.querySelector('button.trophy')).toBeTruthy();
    screens.openChallenges();
    await fixture.whenStable();
    (element.querySelector('button.trophy') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(text('h1')).toBe('Your records');
    expect(element.querySelector('button.trophy')).toBeNull();
    expect(Array.from(element.querySelectorAll('puzzle-records h2'), (h) => h.textContent)).toEqual([
      'Daily puzzles',
      'Beat the clock',
      'Timed play',
      'Ladder',
    ]);
    expect(rows()).toEqual([
      'Easy: best streak | 3 days | Now: 1 day',
      'Hard: best streak | 1 day | Now: 1 day',
      'Easy, 1 min | 1 puzzle',
      'Medium, 5 min | 7 puzzles',
      '7×7 | 1:05',
    ]);
    expect(text('puzzle-records section:last-child .none')).toBe('No records yet');

    // Back to where it was opened from.
    const popped = new Promise((resolve) => window.addEventListener('popstate', resolve, { once: true }));
    (element.querySelector('button.back') as HTMLButtonElement).click();
    await popped;
    await fixture.whenStable();
    expect(text('h1')).toBe('Challenges');
  });

  it('asks before deleting a record: no keeps it, yes deletes it', async () => {
    screens.openRecords();
    await fixture.whenStable();
    const remove = (row: number) =>
      (element.querySelectorAll('puzzle-records li')[row].querySelector('[aria-label^="Delete"]') as HTMLButtonElement).click();

    remove(3); // Medium, 5 min
    await fixture.whenStable();
    expect(text('puzzle-records .confirm h2')).toBe('Do you want to delete this record?');
    expect(text('#delete-what')).toBe('Medium, 5 min: 7 puzzles');
    (element.querySelector('puzzle-records .confirm .buttons button:last-child') as HTMLButtonElement).click(); // No
    await fixture.whenStable();
    expect(element.querySelector('puzzle-records .confirm')).toBeNull();
    expect(rows()).toContain('Medium, 5 min | 7 puzzles');

    remove(3);
    await fixture.whenStable();
    (element.querySelector('puzzle-records .confirm .delete') as HTMLButtonElement).click(); // Yes
    await fixture.whenStable();
    expect(rows()).not.toContain('Medium, 5 min | 7 puzzles');
    expect(JSON.parse(localStorage.getItem('rectangles.clock.records')!)).toEqual({ 'low/1': 1 });

    // A daily level: its results go, so its streaks start again.
    remove(0);
    await fixture.whenStable();
    expect(text('#delete-what')).toContain('its streaks start again');
    (element.querySelector('puzzle-records .confirm .delete') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(rows()[0]).toBe('Hard: best streak | 1 day | Now: 1 day');
    expect(Object.keys(JSON.parse(localStorage.getItem('rectangles.daily.results')!))).toEqual([
      '2026-10-30.high',
      '2026-10-29.medium',
    ]);

    remove(2); // 7×7
    await fixture.whenStable();
    (element.querySelector('puzzle-records .confirm .delete') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(screens.timedBest()).toBeNull();
    expect(text('puzzle-records section:nth-child(3) .none')).toBe('No records yet');
  });

  it('shares any record', async () => {
    screens.openRecords();
    await fixture.whenStable();
    // No share panel in the test browser: the text is copied instead.
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const share = (row: number) =>
      (element.querySelectorAll('puzzle-records li')[row].querySelector('[aria-label^="Share"]') as HTMLButtonElement).click();

    share(0);
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText).toHaveBeenLastCalledWith('Rectangles daily puzzles: my best streak at Easy is 3 days 🔥\nhttps://idemsinternational.github.io/games-data/rectangles/');
    await fixture.whenStable();
    expect(text('puzzle-records li [role=status]')).toBe('Copied, ready to paste');

    share(2);
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    expect(writeText).toHaveBeenLastCalledWith('Rectangles, Beat the clock (Easy): my record is 1 puzzle in 1 minute\nhttps://idemsinternational.github.io/games-data/rectangles/');
    share(4);
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(3));
    expect(writeText).toHaveBeenLastCalledWith('Rectangles, timed play: my best time for 7×7 is 1:05\nhttps://idemsinternational.github.io/games-data/rectangles/');
  });
});
