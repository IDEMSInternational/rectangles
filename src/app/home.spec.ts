import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PuzzleScreens } from '@studio/container/puzzle-screens';
import { RectanglesMove } from '../games/rectangles/moves';
import { RectanglesParams } from '../games/rectangles/params';
import { RectanglesState } from '../games/rectangles/state';
import { App } from './app';

type Screens = PuzzleScreens<RectanglesParams, RectanglesState, RectanglesMove, unknown>;

/** The home page, free play and the Challenges page, through Rectangles (the code is shared by every game). */
describe('Home page', () => {
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
    fixture = TestBed.createComponent(App);
    screens = (fixture.componentInstance as unknown as { screens: Screens }).screens;
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => vi.useRealTimers());

  const text = (selector: string) => element.querySelector(selector)?.textContent?.trim();
  const headings = () => Array.from(element.querySelectorAll('puzzle-home h2'), (h) => h.textContent);
  const play = (card: number) =>
    (element.querySelectorAll('puzzle-home .card button.primary')[card] as HTMLButtonElement).click();
  async function back(): Promise<void> {
    const popped = new Promise((resolve) =>
      window.addEventListener('popstate', resolve, { once: true }),
    );
    (element.querySelector('button.back') as HTMLButtonElement).click();
    await popped;
    await fixture.whenStable();
  }

  it('has daily puzzles, free play and Challenges', () => {
    expect(text('h1')).toBe('Rectangles');
    expect(headings()).toEqual(['Daily puzzles', 'Free play', 'Challenges']);
  });

  it('opens free play: any size, with Solve', async () => {
    play(1);
    await fixture.whenStable();
    expect(text('h1')).toBe('Free play');
    expect(element.querySelector('puzzle-shell select')).toBeTruthy();
    expect(element.querySelector('.mode-bar')).toBeNull(); // no clock
    const buttons = Array.from(element.querySelectorAll('.action-bar button'), (b) =>
      b.textContent!.trim(),
    );
    expect(buttons).toEqual(['Undo', 'Redo', 'Restart', 'Solve']);

    (element.querySelectorAll('.action-bar button')[3] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(screens.session.completed()).toBe(true);
    expect(screens.session.celebrate()).toBe(false); // solved with Solve: no fireworks

    await back();
    expect(headings()).toEqual(['Daily puzzles', 'Free play', 'Challenges']);
  });

  it('opens Challenges: Beat the clock and timed play, each coming back to it', async () => {
    play(2);
    await fixture.whenStable();
    expect(text('h1')).toBe('Challenges');
    expect(headings()).toEqual(['Beat the clock', 'Timed play', 'Ladder']);
    expect(element.querySelector('puzzle-menu')).toBeNull(); // the ☰ menu is on the home page

    play(1);
    await fixture.whenStable();
    expect(text('h1')).toBe('Timed play');
    await back();
    expect(text('h1')).toBe('Challenges');

    await back();
    expect(text('h1')).toBe('Rectangles');
  });
});
