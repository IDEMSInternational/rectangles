import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PuzzleScreens } from '@studio/container/puzzle-screens';
import { RectanglesMove } from '../games/rectangles/moves';
import { RectanglesParams } from '../games/rectangles/params';
import { rectanglesGame } from '../games/rectangles/rectangles-game';
import { RectanglesState } from '../games/rectangles/state';
import { App } from './app';

type Screens = PuzzleScreens<RectanglesParams, RectanglesState, RectanglesMove, unknown>;

/** Game options in the ☰ menu, through Rectangles (the code is shared by every game). */
describe('Game options', () => {
  let fixture: ComponentFixture<App>;
  let screens: Screens;
  let element: HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 30, 10, 0) }); // Friday, puzzle #7
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
  const boxes = () => Array.from(element.querySelectorAll<HTMLInputElement>('puzzle-menu .tick input'));
  async function openOptions(): Promise<void> {
    (element.querySelector('puzzle-menu .opener') as HTMLButtonElement).click();
    await fixture.whenStable();
    (element.querySelector('puzzle-menu nav button') as HTMLButtonElement).click(); // the first
    await fixture.whenStable();
  }
  async function tick(level: number): Promise<void> {
    boxes()[level].click();
    await fixture.whenStable();
  }
  const todayCircle = () => element.querySelector('.days li:nth-child(7) button')!.getAttribute('style');

  it('has the dark theme switch and the daily levels, all ticked to start with', async () => {
    await openOptions();
    expect(text('puzzle-menu h2')).toBe('Game options');
    expect(Array.from(element.querySelectorAll('puzzle-menu .options h3'), (h) => h.textContent)).toEqual([
      'Appearance',
      'Daily puzzles',
    ]);
    expect(text('puzzle-menu .options puzzle-switch')).toBe('Dark theme');
    (element.querySelector('puzzle-menu .options puzzle-switch input') as HTMLInputElement).click();
    await fixture.whenStable();
    expect(document.documentElement.dataset['theme']).toBe('dark');
    (element.querySelector('puzzle-menu .options puzzle-switch input') as HTMLInputElement).click();

    expect(Array.from(element.querySelectorAll('puzzle-menu .tick'), (l) => l.textContent!.trim())).toEqual([
      'Easy',
      'Medium',
      'Hard',
    ]);
    expect(boxes().map((box) => box.checked)).toEqual([true, true, true]);
  });

  it('plays only the levels ticked: the chooser, the circles and the streaks follow', async () => {
    expect(todayCircle()).toMatch(/0deg 120deg, .* 120deg 240deg, .* 240deg 360deg/); // thirds

    await openOptions();
    await tick(0); // Easy off: halves
    expect(todayCircle()).toMatch(/0deg 180deg, .* 180deg 360deg/);
    await tick(1); // Medium off: Hard only, a whole circle
    expect(todayCircle()).toMatch(/var\(--surface\) 0deg 360deg/);
    expect(boxes().map((box) => [box.checked, box.disabled])).toEqual([
      [false, false],
      [false, false],
      [true, true], // the last one ticked stays
    ]);

    (element.querySelector('puzzle-menu header .icon:last-child') as HTMLButtonElement).click(); // close
    await fixture.whenStable();
    (element.querySelector('puzzle-home .card button.primary') as HTMLButtonElement).click(); // today's
    await fixture.whenStable();
    expect(Array.from(element.querySelectorAll('.chooser .level .name'), (n) => n.textContent)).toEqual(['Hard']);

    // Solving Hard is all the day's levels played: the big show, and a whole circle.
    (element.querySelector('.chooser .level') as HTMLButtonElement).click();
    await fixture.whenStable();
    const daily = screens.daily()!;
    daily.move(rectanglesGame.solve(daily.state(), undefined)!);
    expect(daily.celebration()).toBe('big');
    const popped = new Promise((resolve) => window.addEventListener('popstate', resolve, { once: true }));
    screens.goHome();
    await popped;
    await fixture.whenStable();
    expect(todayCircle()).toMatch(/var\(--brand\) 0deg 360deg/);
    expect(text('puzzle-home .status')).toMatch(/^Hard: solved in/);
    expect(text('.streak')).toBe('🔥 Hard: 1 day');

    // Remembered; Easy back on: its streak isn't shown while off, and is again now.
    await open();
    expect(screens.dailyLevels()).toEqual([false, false, true]);
    screens.setDailyLevel(2, false); // the last one: refused
    expect(screens.dailyLevels()).toEqual([false, false, true]);
    screens.setDailyLevel(0, true);
    await fixture.whenStable();
    expect(todayCircle()).toMatch(/0deg 180deg, .* 180deg 360deg/);
  });
});
