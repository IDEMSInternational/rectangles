import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LEGAL_VERSION } from '@studio/container/legal';
import { NEXT_PUZZLE_MS } from '@studio/container/clock-store';
import { PuzzleScreens } from '@studio/container/puzzle-screens';
import { RectanglesMove } from '../games/rectangles/moves';
import { RectanglesParams } from '../games/rectangles/params';
import { rectanglesGame } from '../games/rectangles/rectangles-game';
import { RectanglesState } from '../games/rectangles/state';
import { App } from './app';

type Screens = PuzzleScreens<RectanglesParams, RectanglesState, RectanglesMove, unknown>;

/** The ladder, through Rectangles (no difficulties; the code is shared by every game). */
describe('Ladder', () => {
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
  /** Real time passing (only Date is faked): the clock's display, the next size. */
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const ladder = () => screens.ladder()!;
  const buttonTexts = (selector: string) =>
    Array.from(element.querySelectorAll(selector), (b) => b.textContent!.trim());
  async function goHome(): Promise<void> {
    const popped = new Promise((resolve) =>
      window.addEventListener('popstate', resolve, { once: true }),
    );
    screens.goHome();
    await popped;
    await fixture.whenStable();
  }
  /** Solves the size on screen after `seconds`, as a player's move, and waits for the next. */
  async function climb(seconds: number): Promise<void> {
    ladder().touch();
    later(seconds);
    ladder().move(rectanglesGame.solve(ladder().state(), undefined)!);
    later(100); // while the solved puzzle shows: not counted
    await wait(NEXT_PUZZLE_MS + 50);
    await fixture.whenStable();
  }
  async function playFromChallenges(): Promise<void> {
    screens.openChallenges();
    await fixture.whenStable();
    (element.querySelectorAll('puzzle-home .card button.primary')[2] as HTMLButtonElement).click();
    await fixture.whenStable();
  }

  it('is the third challenge, straight up the ladder from the smallest size', async () => {
    screens.openChallenges();
    await fixture.whenStable();
    expect(buttonTexts('puzzle-home h2')).toEqual(['Beat the clock', 'Timed play', 'Ladder']);
    (element.querySelectorAll('puzzle-home .card button.primary')[2] as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(text('h1')).toBe('Ladder');
    expect(text('.mode-bar .rungs')).toBe('4×4');
    expect(element.querySelectorAll('.rungs li').length).toBe(7); // 4×4 to 10×10
    expect(element.querySelector('.rungs li')!.className).toBe('current');
    expect(text('.mode-bar .clock')).toBe('⏱ 0:00');
    expect(buttonTexts('.action-bar button')).toEqual(['Undo', 'Redo', 'Restart']); // no Solve
  });

  it('times the climb through every size, smallest first, with a best time', async () => {
    await playFromChallenges();
    later(20); // not touched yet
    const sizes: string[] = [];
    for (let rung = 0; rung < 7; rung++) {
      sizes.push(ladder().label());
      expect(ladder().rung()).toBe(rung);
      expect(element.querySelectorAll('.rungs li.done').length).toBe(rung);
      await climb(10);
    }
    expect(sizes).toEqual(['4×4', '5×5', '6×6', '7×7', '8×8', '9×9', '10×10']);

    expect(ladder().result()).toBe(70_000);
    expect(text('.mode-bar .clock')).toBe('Climbed in 1:10');
    expect(text('.mode-bar .shared')).toBe('A new best time!');
    expect(ladder().celebration()).toBe('big');
    expect(ladder().canUndo()).toBe(false); // the last board stays

    // No share panel in the test browser: the text is copied instead.
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    (element.querySelector('.mode-bar .row button') as HTMLButtonElement).click(); // Share
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText).toHaveBeenCalledWith('Rectangles, Ladder: 7 sizes climbed in 1:10, a new best time!');

    // Again, slower: no new best, nothing to share.
    (element.querySelector('.mode-bar button') as HTMLButtonElement).click(); // Play again
    await fixture.whenStable();
    expect(ladder().rung()).toBe(0);
    expect(ladder().elapsed()).toBe(0);
    for (let rung = 0; rung < 7; rung++) await climb(20);
    expect(text('.mode-bar .shared')).toBe('Your best time: 1:10');
    expect(ladder().celebration()).toBe('normal');
    expect(element.querySelector('.mode-bar .row button')).toBeNull();

    await goHome();
    screens.openChallenges();
    await fixture.whenStable();
    expect(text('puzzle-home .card:nth-of-type(3) .status')).toBe('Your best time: 1:10');
  }, 30_000); // real pauses between sizes

  it('can be continued later, or started again', async () => {
    await playFromChallenges();
    await climb(15);
    await climb(15);
    ladder().touch();
    later(5);
    await goHome(); // the clock stops
    later(600);

    // Closing the app, and opening it again.
    history.replaceState(null, '');
    await open();
    await playFromChallenges();
    expect(text('.chooser .level .size')).toBe('Size 3 of 7');
    expect(text('.chooser .level .state')).toBe('0:35 so far');
    expect(buttonTexts('.chooser button.primary')).toEqual(['Start again']);
    (element.querySelector('.chooser .level') as HTMLButtonElement).click(); // Continue
    await fixture.whenStable();
    expect(ladder().rung()).toBe(2);
    expect(ladder().label()).toBe('6×6');
    expect(ladder().elapsed()).toBe(35_000);

    // Starting again forgets the unfinished ladder.
    await goHome();
    (element.querySelectorAll('puzzle-home .card button.primary')[2] as HTMLButtonElement).click();
    await fixture.whenStable();
    (element.querySelector('.chooser button.primary') as HTMLButtonElement).click(); // Start again
    await fixture.whenStable();
    expect(ladder().rung()).toBe(0);
    expect(ladder().elapsed()).toBe(0);
  }, 15_000);
});
