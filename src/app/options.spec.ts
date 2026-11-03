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
      'Playing',
      'Daily puzzles',
      'Your progress',
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

  it('has Show mistakes, the same setting as on the game screens, and no game-specific switches', async () => {
    await openOptions();
    const switches = () => Array.from(element.querySelectorAll<HTMLElement>('puzzle-menu .setting'));
    expect(switches().map((s) => s.querySelector('puzzle-switch')!.textContent!.trim())).toEqual(['Show mistakes']);
    expect(switches()[0].querySelector('.hint')!.textContent).toBe('Rule-breaking pieces are shown in red');

    (switches()[0].querySelector('input') as HTMLInputElement).click(); // Show mistakes
    await fixture.whenStable();
    // One setting for every mode.
    expect(screens.session.showMistakes()).toBe(true);
    expect(screens.timed.showMistakes()).toBe(true);

    screens.openTimed();
    await fixture.whenStable();
    const onScreen = Array.from(element.querySelectorAll('puzzle-shell puzzle-switch input'), (i) => [
      i.parentElement!.textContent!.trim(),
      (i as HTMLInputElement).checked,
    ]);
    expect(onScreen).toEqual([
      ['Lock rectangles', false],
      ['Show mistakes', true],
    ]);
  });

  it('resets the records, after asking, keeping the settings', async () => {
    localStorage.setItem('rectangles.daily.results', JSON.stringify({ '2026-10-30.low': { time: 60_000, onDay: true } }));
    localStorage.setItem('rectangles.clock.records', JSON.stringify({ 'medium/5': 4 }));
    localStorage.setItem('rectangles.ladder.best', JSON.stringify({ 0: 300_000 }));
    localStorage.setItem('rectangles.timed.best', JSON.stringify({ '7x7': { label: '7×7', time: 50_000 } }));
    localStorage.setItem('rectangles.daily.levels', JSON.stringify([true, false, true]));
    await open();
    expect(text('.streak')).toBe('🔥 Easy: 1 day');

    await openOptions();
    const reset = () => element.querySelector('puzzle-menu .reset') as HTMLButtonElement;
    expect(reset().textContent!.trim()).toBe('Reset my records…');
    reset().click();
    await fixture.whenStable();
    expect(text('puzzle-menu .options [role=alert]')).toContain("It can't be undone.");
    (element.querySelector('puzzle-menu .confirm button:last-child') as HTMLButtonElement).click(); // Cancel
    await fixture.whenStable();
    expect(localStorage.getItem('rectangles.clock.records')).not.toBeNull();

    reset().click();
    await fixture.whenStable();
    (element.querySelector('puzzle-menu .confirm .primary') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(text('puzzle-menu .options [role=status]')).toBe('Your records have been deleted.');
    for (const key of ['daily.results', 'clock.records', 'ladder.best', 'timed.best']) {
      expect(localStorage.getItem(`rectangles.${key}`)).toBeNull();
    }
    expect(localStorage.getItem('rectangles.daily.levels')).toBe('[true,false,true]'); // a setting
    expect(element.querySelector('.streak')).toBeNull();
    expect(text('puzzle-home .status')).toBe('Not played yet');
    expect(screens.clockRecord()).toBeNull();
    expect(screens.ladderBest()).toBeNull();
    expect(screens.timedBest()).toBeNull();
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
